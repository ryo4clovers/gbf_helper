import { z } from "zod";
import { resolveWeaponChargeAttack, weaponChargeStateSchema } from "./weaponChargeAttack.js";
import { resolveCalculatorDeckConfig } from "./calculatorDeckResolver.js";
import { resolveProtagonistNormalAttackSupport } from "./protagonistNormalAttackSupport.js";
import { normalAttackCalculationRequestSchema, resolveDamageCalculationRequest, type NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";
import { calculateAutomaticAbilityDamage, AUTOMATIC_ABILITY_PROFILES, type AutomaticAbilityId } from "./automaticAbilityDamage.js";

import { applyIlsaBattleEffects, initialIlsaState, ilsaBattleStateSchema, resetIlsaOnCharge } from "./ilsaBattleState.js";

export const automaticAbilityConditionsSchema = normalAttackCalculationRequestSchema.pick({
  enemy: true, modifiers: true, supportSummon: true,
}).extend({
  protagonistCurrentHpPercent: z.number().finite().positive().max(100),
  characters: z.array(normalAttackCalculationRequestSchema.shape.attacker.unwrap().omit({ coupledConfectionActive: true })
    .extend({ currentHpPercent: z.number().finite().positive().max(100) })).max(3),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.characters.map((character) => character.characterSlot)).size !== value.characters.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["characters"], message: "キャラ枠が重複しています" });
  }
});

const rateSchema = z.object({
  doubleAttackRatePercent: z.number().finite().min(0).max(100),
  tripleAttackRatePercent: z.number().finite().min(0).max(100),
}).strict();
const actorRateSchema = rateSchema.extend({ openingFourTurns: rateSchema.optional() }).strict();

export const battleActionGenerationRequestSchema = z.object({
  schemaVersion: z.literal(1),
  deckConfig: z.record(z.unknown()).describe("CalculatorDeckConfig v1"),
  turns: z.number().int().min(1).max(100),
  secondsPerTurn: z.number().finite().positive().max(3600),
  chargeAttack: z.literal(false),
  manualAbilities: z.literal(false),
  automaticAbilityConditions: automaticAbilityConditionsSchema.optional().describe("自動アビリティを計算する固定HP・敵・加護・大事なもの条件。未指定はdamage:null。クリティカル不発、HP推移なしの候補モデル"),
  multiattack: z.object({
    mode: z.enum(["minimum", "maximum", "sample"]),
    seed: z.number().int().min(0).max(0xffffffff).default(1),
    rates: z.object({
      protagonist: actorRateSchema,
      cidala: actorRateSchema,
      sariel: actorRateSchema,
    }).strict().optional().describe("全補正込みの実効DA/TA率。未入力を実測から推定しない。openingFourTurnsは開幕4ターンのみの置換値"),
  }).strict(),
}).strict().superRefine((value, ctx) => {
  if (value.multiattack.mode === "sample" && !value.multiattack.rates) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["multiattack", "rates"], message: "抽選には主人公・シンダラ・サリエルの実効DA/TA率が必要です" });
  }
});

export type BattleActionGenerationRequest = z.input<typeof battleActionGenerationRequestSchema>;
type NormalAttackPatch = Pick<NormalAttackCalculationRequest, "attacker" | "mythicalLancerLevel" | "battleEffects">;
type ActorKey = "protagonist" | "cidala" | "sariel" | "ilsa";
export const battleActionStateSchema = z.object({
  turn: z.number().int().min(1).max(101),
  protagonistHitCount: z.number().int().min(0).max(100000),
  mythicalLancerLevel: z.number().int().min(0).max(5),
  otherSelfReady: z.boolean(),
  chocolateStacks: z.number().int().min(0).max(10),
  chocolateExpiresAt: z.number().finite().min(0).max(360000),
  ilsa: ilsaBattleStateSchema.optional(),
  weaponCharge: weaponChargeStateSchema.optional(),
  defeatedPositions: z.array(z.number().int().min(0).max(3)).max(4).optional(),
  deathSentenceExpiresOnTurn: z.number().int().min(0).max(106),
}).strict();
export type BattleActionState = z.infer<typeof battleActionStateSchema>;
type GenerationOptions = {
  state?: BattleActionState;
  ilsaCharge?: { enabled: boolean; gauge: number };
  protagonistCharge?: { enabled: boolean; gauge: number };
  calculationContext?: Pick<NormalAttackCalculationRequest, "enemy" | "supportSummon">;
  resolveAttackCount?: (position: number, patch: NormalAttackPatch, guaranteed: number) => number;
};
export type GeneratedBattleEvent = {
  sequence: number;
  actorPosition: number;
  name: string;
  criticalBuff?: { ratePercent: number; damagePercent: number };
} & ({
  kind: "normal";
  attackCount: number;
  splitCount: number;
  bodyHitCount: number;
  pursuitHitCount: number;
  calculationPatch: NormalAttackPatch;
} | {
  kind: "charge-attack";
  hitCount: 1;
  calculationPatch: NormalAttackPatch;
} | {
  kind: "automatic-ability";
  abilityId: AutomaticAbilityId;
  hitCount: number;
  calculationPatch: NormalAttackPatch;
  damage: ReturnType<typeof calculateAutomaticAbilityDamage> | null;
} | {
  kind: "effect";
  effect: "other-self-ready" | "charge-ready" | "mythical-lancer-level" | "party-shield" | "dispel" | "weapon-buff";
  expiresOnTurn?: number;
  value: number;
});

const CHARACTER_KEYS: Record<string, ActorKey> = {
  "3040512000": "cidala", "3040611000": "sariel", "3040456000": "ilsa",
};
const NAMES: Record<ActorKey, string> = {
  protagonist: "主人公", cidala: "シンダラ", sariel: "サリエル", ilsa: "イルザ",
};

// A local, versioned PRNG: reproducible plans must not depend on Math.random().
function randomStream(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Pure action planning. Optional fixed damage conditions never come from a recorded action trace. */
export function generateBattleActions(input: unknown, options: GenerationOptions = {}) {
  const request = battleActionGenerationRequestSchema.parse(input);
  const conditions = request.automaticAbilityConditions;
  const context = conditions ?? options.calculationContext;
  const resolved = context ? resolveDamageCalculationRequest({ schemaVersion: 1, deckConfig: request.deckConfig,
    enemy: context.enemy, supportSummon: context.supportSummon }).resolution : resolveCalculatorDeckConfig(request.deckConfig);
  const deck = resolved.deck;
  const main = deck.weapons.find((weapon) => weapon.position === "main");
  const lancer = deck.protagonist.job?.masterId === "190501";
  if (lancer && (deck.protagonist.job?.level ?? 0) < 40) {
    throw new Error("ランサー・オリジンの行動効果はLv40以上に対応しています");
  }
  const weaponChargeProfile = resolveWeaponChargeAttack(main);
  const ereshkigal = main?.masterId === "1040315100" && main.level === 250;
  const front = deck.characters.filter((character) => character.position === "front").sort((a, b) => a.slot - b.slot);
  if (new Set(front.map((character) => character.masterId)).size !== front.length) {
    throw new Error("同じキャラクターは各1人まで編成してください");
  }
  for (const character of front) {
    if (!CHARACTER_KEYS[character.masterId] || (character.level ?? 0) < 80) {
      throw new Error(`前衛${character.slot}の行動効果は未対応です。現在はLv80以上の闇シンダラ・サリエル・浴衣イルザに対応しています`);
    }
  }
  const versusia = deck.summons.find((summon) => summon.masterId === "2040448000" && summon.position === "main" && summon.uncapLevel === 4);
  const actors = [{ position: 0, key: "protagonist" as ActorKey }, ...front.map((character) => ({
    position: character.slot, key: CHARACTER_KEYS[character.masterId],
  }))];
  // Current damage models combine weapon echoes into one packet for each of these frames.
  const pursuitFrames = ["elemental-pursuit", "destruction-pursuit"].filter((kind) => {
    const effects = (deck.effectiveWeaponSkillEffects ?? []).filter((effect) => effect.kind === kind && effect.effectiveAmountPercent > 0 &&
      (effect.elementCode === undefined || effect.elementCode === deck.protagonist.elementCode));
    if (new Set(effects.map((effect) => effect.sourceSkillId)).size > 1 || new Set(effects.map((effect) => effect.stackingCapPercent)).size > 1) {
      throw new Error("異なる武器追撃の共存時のhit数は未対応です");
    }
    return effects.length > 0;
  });
  const initialLevel = resolveProtagonistNormalAttackSupport(deck).initialMythicalLancerLevel;
  const random = randomStream(request.multiattack.seed);
  const saved = options.state && battleActionStateSchema.parse(options.state);
  let ilsa = actors.some((actor) => actor.key === "ilsa") ? saved?.ilsa ?? initialIlsaState() : undefined;
  let ilsaGauge = options.ilsaCharge?.gauge ?? 0;
  let protagonistGauge = options.protagonistCharge?.gauge ?? 0;
  const weaponCharge = weaponChargeStateSchema.parse(saved?.weaponCharge ?? {});
  let ownHits = saved?.protagonistHitCount ?? 0;
  let level = saved?.mythicalLancerLevel ?? initialLevel;
  let otherSelfReady = saved?.otherSelfReady ?? false;
  let chocolateStacks = saved?.chocolateStacks ?? 0;
  let chocolateExpiresAt = saved?.chocolateExpiresAt ?? 0;
  let deathSentenceExpiresOnTurn = saved?.deathSentenceExpiresOnTurn ?? 0;
  let sequence = 0;
  const turns = [];

  function attackCount(key: ActorKey, turn: number): number {
    if (key === "ilsa" || (key === "sariel" && turn === 1)) return 3;
    const guaranteed = key === "cidala" ? 2 : 1;
    const configured = request.multiattack.rates?.[key];
    const rates = turn <= 4 && configured?.openingFourTurns ? configured.openingFourTurns : configured;
    const da = rates?.doubleAttackRatePercent ?? 0;
    const ta = rates?.tripleAttackRatePercent ?? 0;
    if (request.multiattack.mode === "minimum") return ta === 100 ? 3 : Math.max(guaranteed, da === 100 ? 2 : 1);
    if (request.multiattack.mode === "maximum") return !rates || ta > 0 ? 3 : Math.max(guaranteed, da > 0 ? 2 : 1);
    if (random() < ta / 100) return 3;
    return Math.max(guaranteed, random() < da / 100 ? 2 : 1);
  }

  for (let turn = saved?.turn ?? 1; turn <= request.turns; turn++) {
    const elapsedSeconds = (turn - 1) * request.secondsPerTurn;
    if (elapsedSeconds >= chocolateExpiresAt) chocolateStacks = 0;
    const events: GeneratedBattleEvent[] = [];
    let tripleAttackActions = 0;
    let chargeAttackActions = 0;
    let ereshChargeActive = false;
    const criticalBuff = (position: number) => position === 0 && turn < weaponCharge.criticalExpiresOnTurn
      ? { ratePercent: 30, damagePercent: 50 } : undefined;
    let takenAmplification = 0;
    function ability(actorPosition: number, abilityId: AutomaticAbilityId, hitCount: number, calculationPatch: NormalAttackPatch) {
      let damage: ReturnType<typeof calculateAutomaticAbilityDamage> | null = null;
      if (conditions) {
        const character = conditions.characters.find((entry) => entry.characterSlot === actorPosition);
        if (actorPosition > 0 && !character) throw new Error(`前衛${actorPosition}の固定HP・アーティファクト条件が必要です`);
        damage = calculateAutomaticAbilityDamage({ abilityId, calculation: {
          schemaVersion: 1, deckConfig: request.deckConfig, enemy: conditions.enemy, modifiers: conditions.modifiers,
          supportSummon: conditions.supportSummon, protagonistCurrentHpPercent: conditions.protagonistCurrentHpPercent,
          ...calculationPatch,
          attacker: actorPosition === 0 ? undefined : { ...character, ...calculationPatch.attacker },
        } });
        if (damage.hitCount !== hitCount) throw new Error("生成hit数とアビリティモデルが一致しません");
      }
      events.push({ sequence: ++sequence, kind: "automatic-ability", actorPosition,
        name: AUTOMATIC_ABILITY_PROFILES[abilityId].name, abilityId, hitCount, calculationPatch, damage, criticalBuff: criticalBuff(actorPosition) });
      if (actorPosition === 0) ownHits += hitCount;
    }
    function effect(name: string, effect: Extract<GeneratedBattleEvent, { kind: "effect" }>["effect"], value: number, actorPosition = 0, expiresOnTurn?: number) {
      if (saved?.defeatedPositions?.includes(actorPosition)) return;
      events.push({ sequence: ++sequence, kind: "effect", actorPosition, name, effect, value, ...(expiresOnTurn === undefined ? {} : { expiresOnTurn }) });
    }
    if (turn === 1 && ereshkigal) { protagonistGauge = 100; effect("テル・イブラームII（開幕）", "charge-ready", 100); }
    for (const actor of actors) {
      if (saved?.defeatedPositions?.includes(actor.position)) continue;
      const baseActionCount = actor.key === "sariel" && turn === 1 ? 3
        : actor.key === "ilsa" && ilsa?.multistrikeTurn === turn ? ilsa.multistrikeActions : 1;
      const actionCount = Math.max(baseActionCount, ereshChargeActive && actor.position > 0 ? 2 : 1);
      for (let action = 0; action < actionCount; action++) {
        const coupled = actor.key === "cidala" && turn <= 3;
        const split = actor.key === "ilsa" ? 3 : coupled ? 2 : actor.key === "protagonist"
          ? resolveProtagonistNormalAttackSupport(deck, level).randomTargetHitCount : 1;
        const deathActive = turn < deathSentenceExpiresOnTurn;
        const calculationPatch: NormalAttackPatch = {
          mythicalLancerLevel: level,
          battleEffects: {
            enemyDefenseDownPercent: Math.min(4, chocolateStacks) * 10,
            enemyDefenseDownBeyondCapPercent: deathActive ? 10 : 0,
            enemySupplementalDamage: chocolateStacks * 3000,
            supportSkillSupplementalDamage: deathActive ? 30000 : 0,
            normalAttackSupplementalDamage: ereshChargeActive && actor.position > 0 ? 50000 : 0,
            elementAttackPercent: actor.position === 0 ? weaponCharge.darkAttackStacks * 10 : 0,
            enemyDamageTakenAmplificationPercent: takenAmplification,
          },
          ...(actor.position === 0 ? {} : { attacker: {
            characterSlot: actor.position,
            ...(actor.key === "cidala" ? { coupledConfectionActive: coupled } : {}),
          } }),
        };
        calculationPatch.battleEffects = applyIlsaBattleEffects(calculationPatch.battleEffects ?? {}, ilsa, turn,
          actor.key !== "protagonist" || deck.protagonist.elementCode === "6");
        if (actor.position === 0 && options.protagonistCharge?.enabled && protagonistGauge >= 100) {
          if (!weaponChargeProfile) throw new Error("メイン武器の奥義は未対応です（フォールン・ソード4凸Lv150／エレシュキガルLv250に対応）");
          protagonistGauge = 0;
          effect("武器奥義：ゲージ消費", "charge-ready", 0);
          events.push({ sequence: ++sequence, kind: "charge-attack", actorPosition: 0, name: weaponChargeProfile.name,
            hitCount: 1, calculationPatch, criticalBuff: criticalBuff(0) });
          chargeAttackActions++; ownHits++;
          if (weaponChargeProfile.id === "fallen-sword") {
            weaponCharge.darkAttackStacks = Math.min(3, weaponCharge.darkAttackStacks + 1);
            weaponCharge.criticalExpiresOnTurn = turn + 4;
            effect("闇属性攻撃UP（累積）+" + weaponCharge.darkAttackStacks * 10 + "%・クリティカルUP", "weapon-buff", weaponCharge.darkAttackStacks);
            effect("味方全体バリア1500", "party-shield", 1500, 0, turn + 4);
          } else {
            ereshChargeActive = true;
            weaponCharge.tripleAttackExpiresOnTurn = turn + 2;
            effect("敵の強化効果を1個消去", "dispel", 1);
            effect("主人公TA確定・他の闇キャラ再攻撃／通常与ダメージ+50000（このターン）", "weapon-buff", 1);
          }
          if (options.ilsaCharge && !ereshkigal) {
            ilsaGauge = Math.min(100, ilsaGauge + Math.floor(10 * .65));
            const ally = actors.find((entry) => entry.key === "ilsa");
            if (ally) effect("主人公奥義：味方のゲージ上昇", "charge-ready", ilsaGauge, ally.position);
          }
          continue;
        }
        if (actor.key === "ilsa" && ilsa && options.ilsaCharge?.enabled && ilsaGauge >= 100) {
          ilsaGauge = 0;
          effect("バースト・イレイザー：奥義ゲージ消費", "charge-ready", 0, actor.position);
          events.push({ sequence: ++sequence, kind: "charge-attack", actorPosition: actor.position,
            name: "バースト・イレイザー", hitCount: 1, calculationPatch });
          ilsa = resetIlsaOnCharge(ilsa, turn);
          chargeAttackActions++;
          if (options.protagonistCharge && !ereshkigal && !events.some((entry) => entry.kind === "charge-attack" && entry.actorPosition === 0)) {
            protagonistGauge = Math.min(100, protagonistGauge + 10);
            effect("味方奥義：主人公ゲージ+10%", "charge-ready", protagonistGauge);
          }
          continue;
        }
        const guaranteed = (actor.position === 0 && turn < weaponCharge.tripleAttackExpiresOnTurn) || actor.key === "ilsa" || (actor.key === "sariel" && turn === 1) ? 3 : actor.key === "cidala" ? 2 : 1;
        const count = options.resolveAttackCount?.(actor.position, calculationPatch, guaranteed) ?? Math.max(guaranteed, attackCount(actor.key, turn));
        if (!Number.isInteger(count) || count < guaranteed || count > 3) throw new Error("連続攻撃回数が保証値と一致しません");
        if (count === 3) tripleAttackActions++;
        events.push({ sequence: ++sequence, kind: "normal", actorPosition: actor.position,
          name: NAMES[actor.key], attackCount: count, splitCount: split, bodyHitCount: count * split,
          pursuitHitCount: count * split * (pursuitFrames.length + ((calculationPatch.battleEffects?.abilityNormalPursuitPercent ?? 0) > 0 ? 1 : 0)), calculationPatch, criticalBuff: criticalBuff(actor.position) });
        if (actor.key === "ilsa" && options.ilsaCharge) {
          // TA gains 37%; apply the passive -35% once per attack action, never per split hit.
          ilsaGauge = Math.min(100, ilsaGauge + (ereshkigal ? 0 : Math.floor(37 * .65)));
          effect(ereshkigal ? "グガルアンナ：奥義ゲージ上昇なし" : "確定TA：奥義ゲージ+24%（上昇量35%DOWN）", "charge-ready", ilsaGauge, actor.position);
        }
        if (actor.key === "protagonist") {
          if (options.protagonistCharge) {
            protagonistGauge = Math.min(100, protagonistGauge + (ereshkigal ? 0 : [0, 10, 22, 37][count]));
            effect("通常攻撃：主人公奥義ゲージ", "charge-ready", protagonistGauge);
          }
          ownHits += count * split * (1 + pursuitFrames.length + ((calculationPatch.battleEffects?.abilityNormalPursuitPercent ?? 0) > 0 ? 1 : 0));
          // The reaction uses the level at the start of this action, including when it crosses 40 hits.
          if (lancer && level > 0) ability(0, "mythical-arms", level, calculationPatch);
          if (otherSelfReady) {
            otherSelfReady = false;
            ability(0, "other-self", 2, calculationPatch);
            takenAmplification = 20;
          }
        } else if (coupled) {
          ability(actor.position, "mission-chocolate", 2, calculationPatch);
          chocolateStacks = Math.min(10, chocolateStacks + 1);
          chocolateExpiresAt = elapsedSeconds + 180;
        } else if (actor.key === "sariel" && turn === 1) {
          ability(actor.position, "scythe-of-execution", 1, calculationPatch);
          deathSentenceExpiresOnTurn = turn + 5;
        }
      }
    }
    if (versusia && tripleAttackActions + chargeAttackActions >= 5) {
      otherSelfReady = true;
      effect("他化自在（次の主人公通常攻撃で発動）", "other-self-ready", 1);
    }
    if (turn <= 3 && ereshkigal) { protagonistGauge = 100; effect("テル・イブラームII", "charge-ready", 100); }
    const nextLevel = lancer ? Math.min(5, initialLevel + Math.floor(ownHits / 40)) : 0;
    if (nextLevel !== level) {
      level = nextLevel;
      effect("神伝の槍手Lv", "mythical-lancer-level", level);
    }
    turns.push({ turn, elapsedSeconds, tripleAttackActions, chargeAttackActions, events,
      endState: { turn: turn + 1, mythicalLancerLevel: level, protagonistHitCount: ownHits, otherSelfReady,
        chocolateStacks, chocolateExpiresAt, deathSentenceExpiresOnTurn,
        ...(options.protagonistCharge || saved?.weaponCharge ? { weaponCharge: { ...weaponCharge } } : {}), ...(ilsa ? { ilsa } : {}),
        ...(saved?.defeatedPositions ? { defeatedPositions: saved.defeatedPositions } : {}) } });
  }
  return {
    schemaVersion: 1 as const,
    kind: "generated-battle-actions" as const,
    verificationStatus: "下書き" as const,
    modelVersion: "composition-weapon-charge-v1",
    automaticAbilityConditions: conditions,
    mode: request.multiattack.mode,
    seed: request.multiattack.seed,
    randomAlgorithm: "lcg32-1664525-1013904223",
    deckResolutionIssues: resolved.issues,
    assumptions: [
      "単体敵・全員生存・命中と弱体成功・手動アビリティ/奥義/召喚なし。敵行動、交代、解除なし",
      "180秒弱体は各ターン開始時に期限を判定し、ターン内の経過時間は0秒とする",
      "連撃率は全補正込みの明示入力。武器/神伝Lv/覚醒/大事なもの/オーバースキル等からは自動合成しない",
      "連撃率未指定のminimum/maximumは既知の確定連撃だけによるシナリオ。総ダメージの厳密な上下限ではない",
      "40hitは主人公の通常・武器追撃・反応アビリティを数え、Lv更新は行動後。劇毒等の継続ダメージは数えない（要検証）",
      ...(conditions ? ["自動アビリティは指定HPとアーティファクト状態を全ターン維持、クリティカル不発として計算。減衰・丸めは候補で実測一致は未達"] : []),
    ],
    unresolved: [
      "HP/奥義ゲージの推移、敵行動、劇毒ダメージ、通常攻撃を含む総ダメージ",
      "アーティファクト抽選/被ターゲット回数効果、未接続のサブメンバー/召喚石等の行動効果",
      "計算パッチはHPやアーティファクト状態を含まない。単発計算には別途条件入力が必要",
    ],
    sources: [
      "knowledge/jobs/origin1-lancer-origin.md", "knowledge/characters/dark-ssr-cidala-valentine.md",
      "knowledge/characters/dark-ssr-sariel-limited.md", "knowledge/characters/dark-ssr-ilsa-yukata.md",
      "knowledge/weapons/dark-ssr-illustrious-ereshkigal.md", "knowledge/summons/fire-ssr-versusia-normal.md",
    ],
    turns,
  };
}
