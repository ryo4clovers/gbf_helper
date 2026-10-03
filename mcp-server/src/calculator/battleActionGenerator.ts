import { z } from "zod";
import { resolveCalculatorDeckConfig } from "./calculatorDeckResolver.js";
import { resolveProtagonistNormalAttackSupport } from "./protagonistNormalAttackSupport.js";
import type { NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";

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
export type GeneratedBattleEvent = {
  sequence: number;
  actorPosition: number;
  name: string;
} & ({
  kind: "normal";
  attackCount: number;
  splitCount: number;
  bodyHitCount: number;
  pursuitHitCount: number;
  calculationPatch: NormalAttackPatch;
} | {
  kind: "automatic-ability";
  hitCount: number;
  damage: null;
} | {
  kind: "effect";
  effect: "other-self-ready" | "charge-ready" | "mythical-lancer-level";
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

/** Pure action planning. Recorded actions, HP, conditions and random rolls are never inputs. */
export function generateBattleActions(input: unknown) {
  const request = battleActionGenerationRequestSchema.parse(input);
  const resolved = resolveCalculatorDeckConfig(request.deckConfig);
  const deck = resolved.deck;
  const main = deck.weapons.find((weapon) => weapon.position === "main");
  if (deck.protagonist.job?.masterId !== "190501" || (deck.protagonist.job.level ?? 0) < 40 ||
      deck.protagonist.elementCode !== "6" || main?.masterId !== "1040315100" || main.level !== 250) {
    throw new Error("行動生成は闇ランサー・オリジンLv40以上＋メインのエレシュキガルLv250に対応しています");
  }
  const front = deck.characters.filter((character) => character.position === "front").sort((a, b) => a.slot - b.slot);
  if (front.length !== 3 || new Set(front.map((character) => character.masterId)).size !== 3 ||
      front.some((character, index) => !CHARACTER_KEYS[character.masterId] || character.slot !== index + 1 || (character.level ?? 0) < 80)) {
    throw new Error("前衛1〜3にはLv80以上の闇シンダラ・サリエル・浴衣イルザを各1人編成してください");
  }
  const versusia = deck.summons.find((summon) => summon.masterId === "2040448000");
  if (versusia && (versusia.position !== "main" || versusia.uncapLevel !== 4)) {
    throw new Error("他化自在の行動生成はメイン4凸ヴェルサシアのみ対応しています");
  }
  const actors = [{ position: 0, key: "protagonist" as ActorKey }, ...front.map((character) => ({
    position: character.slot, key: CHARACTER_KEYS[character.masterId],
  }))];
  // Current damage models combine weapon echoes into one packet for each of these frames.
  const pursuitFrames = ["elemental-pursuit", "destruction-pursuit"].filter((kind) => {
    const effects = (deck.effectiveWeaponSkillEffects ?? []).filter((effect) => effect.kind === kind && effect.effectiveAmountPercent > 0 &&
      (effect.elementCode === undefined || effect.elementCode === "6"));
    if (new Set(effects.map((effect) => effect.sourceSkillId)).size > 1 || new Set(effects.map((effect) => effect.stackingCapPercent)).size > 1) {
      throw new Error("異なる武器追撃の共存時のhit数は未対応です");
    }
    return effects.length > 0;
  });
  const initialLevel = resolveProtagonistNormalAttackSupport(deck).initialMythicalLancerLevel;
  const random = randomStream(request.multiattack.seed);
  let ownHits = 0;
  let level = initialLevel;
  let otherSelfReady = false;
  let chocolateStacks = 0;
  let chocolateExpiresAt = 0;
  let deathSentenceExpiresOnTurn = 0;
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

  for (let turn = 1; turn <= request.turns; turn++) {
    const elapsedSeconds = (turn - 1) * request.secondsPerTurn;
    if (elapsedSeconds >= chocolateExpiresAt) chocolateStacks = 0;
    const events: GeneratedBattleEvent[] = [];
    let tripleAttackActions = 0;
    let takenAmplification = 0;
    function ability(actorPosition: number, name: string, hitCount: number) {
      events.push({ sequence: ++sequence, kind: "automatic-ability", actorPosition, name, hitCount, damage: null });
      if (actorPosition === 0) ownHits += hitCount;
    }
    function effect(name: string, effect: "other-self-ready" | "charge-ready" | "mythical-lancer-level", value: number) {
      events.push({ sequence: ++sequence, kind: "effect", actorPosition: 0, name, effect, value });
    }
    if (turn === 1) effect("テル・イブラームII（開幕）", "charge-ready", 100);
    for (const actor of actors) {
      const actionCount = actor.key === "sariel" && turn === 1 ? 3 : 1;
      for (let action = 0; action < actionCount; action++) {
        const count = attackCount(actor.key, turn);
        if (count === 3) tripleAttackActions++;
        const coupled = actor.key === "cidala" && turn <= 3;
        const split = actor.key === "ilsa" ? 3 : actor.key === "protagonist" || coupled ? 2 : 1;
        const deathActive = turn < deathSentenceExpiresOnTurn;
        const calculationPatch: NormalAttackPatch = {
          mythicalLancerLevel: level,
          battleEffects: {
            enemyDefenseDownPercent: Math.min(4, chocolateStacks) * 10,
            enemyDefenseDownBeyondCapPercent: deathActive ? 10 : 0,
            enemySupplementalDamage: chocolateStacks * 3000,
            supportSkillSupplementalDamage: deathActive ? 30000 : 0,
            normalAttackSupplementalDamage: 0,
            enemyDamageTakenAmplificationPercent: takenAmplification,
          },
          ...(actor.position === 0 ? {} : { attacker: {
            characterSlot: actor.position,
            ...(actor.key === "cidala" ? { coupledConfectionActive: coupled } : {}),
          } }),
        };
        events.push({ sequence: ++sequence, kind: "normal", actorPosition: actor.position,
          name: NAMES[actor.key], attackCount: count, splitCount: split, bodyHitCount: count * split,
          pursuitHitCount: count * split * pursuitFrames.length, calculationPatch });
        if (actor.key === "protagonist") {
          ownHits += count * split * (1 + pursuitFrames.length);
          // The reaction uses the level at the start of this action, including when it crosses 40 hits.
          ability(0, "ミソロジックアームズ", level);
          if (otherSelfReady) {
            otherSelfReady = false;
            ability(0, "他化自在", 2);
            takenAmplification = 20;
          }
        } else if (coupled) {
          ability(actor.position, "菓製猛虎", 2);
          chocolateStacks = Math.min(10, chocolateStacks + 1);
          chocolateExpiresAt = elapsedSeconds + 180;
        } else if (actor.key === "sariel" && turn === 1) {
          ability(actor.position, "エクスキューショナーズ・サイス＋", 1);
          deathSentenceExpiresOnTurn = turn + 5;
        }
      }
    }
    if (versusia && tripleAttackActions >= 5) {
      otherSelfReady = true;
      effect("他化自在（次の主人公通常攻撃で発動）", "other-self-ready", 1);
    }
    if (turn <= 3) effect("テル・イブラームII", "charge-ready", 100);
    const nextLevel = Math.min(5, initialLevel + Math.floor(ownHits / 40));
    if (nextLevel !== level) {
      level = nextLevel;
      effect("神伝の槍手Lv", "mythical-lancer-level", level);
    }
    turns.push({ turn, elapsedSeconds, tripleAttackActions, events,
      endState: { mythicalLancerLevel: level, protagonistHitCount: ownHits, otherSelfReady } });
  }
  return {
    schemaVersion: 1 as const,
    kind: "generated-battle-actions" as const,
    verificationStatus: "下書き" as const,
    modelVersion: "dark-no-charge-v1",
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
    ],
    unresolved: [
      "HP/奥義ゲージの推移、敵行動、劇毒ダメージ、自動アビリティのダメージ量",
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
