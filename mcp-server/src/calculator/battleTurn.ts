import { z } from "zod";
import { battleActionStateSchema, generateBattleActions } from "./battleActionGenerator.js";
import { calculateNormalAttackFromRequest, normalAttackCalculationRequestSchema, type NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";
import { applyIlsaBattleEffects, castIlsaAbility, initialIlsaState, ilsaOnAllyDefeat, ILSA_ID } from "./ilsaBattleState.js";
import { calculateIlsaDamage } from "./ilsaDamage.js";
import { resolveCalculatorDeckConfig } from "./calculatorDeckResolver.js";
import { resolveProtagonistNormalAttackSupport } from "./protagonistNormalAttackSupport.js";
import { calculateAutomaticAbilityDamage } from "./automaticAbilityDamage.js";

const rates = z.object({ doubleAttackRatePercent: z.number().min(0).max(100), tripleAttackRatePercent: z.number().min(0).max(100) }).strict();
export const battleTurnRequestSchema = z.object({
  calculation: normalAttackCalculationRequestSchema,
  state: battleActionStateSchema.optional(),
  action: z.object({ kind: z.literal("ilsa-ability"), characterSlot: z.number().int().min(1).max(3),
    ability: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).strict().optional(),
  ilsaChargeEnabled: z.boolean().default(false),
  defeatedPositions: z.array(z.number().int().min(0).max(3)).max(4).optional(),
  mode: z.enum(["normal", "downside", "upside"]),
  secondsPerTurn: z.number().finite().positive().max(3600),
  characters: z.array(z.object({
    characterSlot: z.number().int().min(1).max(3),
    currentHpPercent: z.number().finite().min(0).max(100),
    chargeGauge: z.number().finite().min(0).max(100).optional(),
    rates: rates.optional(),
    artifactStartBuffs: normalAttackCalculationRequestSchema.shape.attacker.unwrap().shape.artifactStartBuffs,
  }).strict()).max(3),
}).strict();

/** The same composition rules drive batch diagnostics and the interactive battle.
 * The caller owns HP and applies packets sequentially; this function never reads battle captures.
 */
export function calculateBattleTurn(input: unknown, random: () => number = Math.random) {
  const request = battleTurnRequestSchema.parse(input);
  if (new Set(request.characters.map((entry) => entry.characterSlot)).size !== request.characters.length) throw new Error("前衛の設定枠が重複しています");
  if ((request.state?.turn ?? 1) > 100) throw new Error("現在のシミュレーションは100ターンまでです");
  const normals: ReturnType<typeof calculateNormalAttackFromRequest>["result"][] = [];
  const warnings = new Set<string>([
    "下書き：自動アビリティは実測未一致の候補値。武器技巧は不発、イルザ1アビは適用。総ダメージも参考値です。",
    "手動アビリティ・奥義は浴衣イルザのみ対応。召喚・交代・劇毒・被ターゲット効果は未対応です。",
  ]);
  const deck = resolveCalculatorDeckConfig(request.calculation.deckConfig).deck;
  const ilsaCharacter = deck.characters.find((entry) => entry.position === "front" && entry.masterId === ILSA_ID);
  const initial = { turn: 1, protagonistHitCount: 0,
    mythicalLancerLevel: resolveProtagonistNormalAttackSupport(deck).initialMythicalLancerLevel,
    otherSelfReady: false, chocolateStacks: 0, chocolateExpiresAt: 0, deathSentenceExpiresOnTurn: 0 };
  const state = structuredClone(request.state ?? initial) as import("./battleActionGenerator.js").BattleActionState;
  if (ilsaCharacter) state.ilsa ??= initialIlsaState();
  const defeated = [...new Set([...(request.defeatedPositions ?? state.defeatedPositions ?? []),
    ...request.characters.filter((entry) => entry.currentHpPercent === 0).map((entry) => entry.characterSlot)])];
  if (defeated.some((position) => position !== 0 && !deck.characters.some((entry) => entry.position === "front" && entry.slot === position))) {
    throw new Error("戦闘不能の枠が編成に存在しません");
  }
  if (ilsaCharacter && state.ilsa && !defeated.includes(ilsaCharacter.slot)) {
    const newDefeats = defeated.filter((position) => position !== ilsaCharacter.slot && !state.defeatedPositions?.includes(position));
    state.ilsa = ilsaOnAllyDefeat(state.ilsa, state.turn, newDefeats.length);
  }
  if (request.defeatedPositions || defeated.length) state.defeatedPositions = defeated;
  function calculationFor(patch: Pick<NormalAttackCalculationRequest, "attacker" | "battleEffects" | "mythicalLancerLevel">): NormalAttackCalculationRequest {
    const position = patch.attacker?.characterSlot;
    const character = request.characters.find((entry) => entry.characterSlot === position);
    if (position !== undefined && !character) throw new Error(`前衛${position}のHP設定が必要です`);
    return { ...request.calculation, ...patch,
      enemy: { ...request.calculation.enemy, attack: (request.calculation.enemy.attack ?? 10000)
        * (state.turn < (state.ilsa?.sinExpiresOnTurn ?? 0) ? .75 : 1) }, attacker: position === undefined ? undefined : {
      ...patch.attacker!, currentHpPercent: character!.currentHpPercent, artifactStartBuffs: character!.artifactStartBuffs,
    } };
  }
  if (request.action) {
    const { ability, characterSlot } = request.action;
    if (!ilsaCharacter || ilsaCharacter.slot !== characterSlot || (ilsaCharacter.level ?? 0) < 80) throw new Error("Lv80以上の前衛浴衣イルザを選択してください");
    if (defeated.includes(characterSlot)) throw new Error("戦闘不能のイルザはアビリティを使用できません");
    if (!request.characters.some((entry) => entry.characterSlot === characterSlot && entry.currentHpPercent > 0)) throw new Error("イルザの生存時HP設定が必要です");
    const previous = state.ilsa!;
    const next = castIlsaAbility(previous, state.turn, ability);
    const elapsedSeconds = (state.turn - 1) * request.secondsPerTurn;
    const chocolate = elapsedSeconds < state.chocolateExpiresAt ? state.chocolateStacks : 0;
    const deathActive = state.turn < state.deathSentenceExpiresOnTurn;
    const battleEffects = applyIlsaBattleEffects({ enemyDefenseDownPercent: Math.min(4, chocolate) * 10,
      enemyDefenseDownBeyondCapPercent: deathActive ? 10 : 0, enemySupplementalDamage: chocolate * 3000,
      supportSkillSupplementalDamage: deathActive ? 30000 : 0 }, previous, state.turn, true);
    // Resolve skill 2 damage against the state BEFORE its own DEF Down is applied.
    const damage = ability === 2 ? calculateIlsaDamage(calculationFor({ attacker: { characterSlot }, battleEffects }), "ability", previous.flowers) : undefined;
    for (const issue of damage?.issues ?? []) warnings.add(issue);
    state.ilsa = next;
    const name = ["ウォー・エターナル", "ウェイジズ・オブ・シン＋", "ディヴァ・サタニカ"][ability - 1];
    return { schemaVersion: 1, verificationStatus: "下書き", modelVersion: "composition-ilsa-v4", turn: state.turn,
      elapsedSeconds, advancesTurn: false, tripleAttackActions: 0, endState: state, warnings: [...warnings],
      events: damage ? [{ sequence: 1, kind: "manual-ability" as const, actorPosition: characterSlot, name, hitCount: 1, damage }]
        : [{ sequence: 1, kind: "effect" as const, effect: "ability-used" as const, actorPosition: characterSlot, name, value: ability }],
    };
  }
  const ilsaSettings = request.characters.find((entry) => entry.characterSlot === ilsaCharacter?.slot);
  if (request.ilsaChargeEnabled && (!ilsaCharacter || ilsaSettings?.chargeGauge === undefined)) throw new Error("イルザの奥義ゲージが必要です");
  if (ilsaSettings?.chargeGauge !== undefined) warnings.add("イルザの通常TAゲージ増加は37%×0.65を切り捨てる24%の暫定値。武器等の追加ゲージ上昇補正は未接続です。");
  const plan = generateBattleActions({ schemaVersion: 1, deckConfig: request.calculation.deckConfig,
    turns: request.state?.turn ?? 1, secondsPerTurn: request.secondsPerTurn, chargeAttack: false, manualAbilities: false,
    multiattack: { mode: "minimum", seed: 1 },
  }, { state, calculationContext: request.calculation,
    ilsaCharge: ilsaSettings?.chargeGauge === undefined ? undefined : { enabled: request.ilsaChargeEnabled, gauge: ilsaSettings.chargeGauge },
    resolveAttackCount: (position, patch, guaranteed) => {
    const response = calculateNormalAttackFromRequest(calculationFor(patch));
    const result = response.result;
    normals.push(result);
    for (const issue of response.deckResolutionIssues) warnings.add(JSON.stringify(issue));
    for (const issue of result.attacker?.unresolvedInputs ?? []) warnings.add(String(issue));
    const configured = request.characters.find((entry) => entry.characterSlot === position)?.rates;
    const resolvedRates = position === 0 ? result.multiattackRates : configured;
    if (guaranteed === 3) return 3;
    if (!resolvedRates) {
      if (request.mode === "normal") throw new Error(`前衛${position}の連撃率は自動合成未対応です。「連撃・開始時の強化」で実効DA/TA率を入力するか、比較シナリオを選択してください`);
      warnings.add(`前衛${position}：連撃率未入力のため確定連撃のみを制約とする比較シナリオです。総ダメージの上下限ではありません。`);
      return request.mode === "upside" ? 3 : guaranteed;
    }
    if (position === 0) warnings.add("主人公の連撃率は既存計算を使用。神伝Lv・開幕オーバースキル等の時間変化は未接続です。");
    const da = resolvedRates.doubleAttackRatePercent, ta = resolvedRates.tripleAttackRatePercent;
    const count = request.mode === "downside" ? (ta === 100 ? 3 : da === 100 ? 2 : 1)
      : request.mode === "upside" ? (ta > 0 ? 3 : da > 0 ? 2 : 1)
      : random() < ta / 100 ? 3 : random() < da / 100 ? 2 : 1;
    return Math.max(guaranteed, count);
  } });
  let index = 0;
  const turn = plan.turns[0];
  const events = turn.events.map((event) => {
    if (event.kind === "normal") return { ...event, calculation: normals[index++] };
    if (event.kind === "charge-attack") {
      const damage = calculateIlsaDamage(calculationFor(event.calculationPatch), "charge", state.ilsa?.flowers ?? 1);
      for (const issue of damage.issues) warnings.add(issue);
      return { ...event, damage };
    }
    if (event.kind === "automatic-ability") {
      const { random: _random, calculationModel: _model, ...calculation } = calculationFor(event.calculationPatch);
      const damage = calculateAutomaticAbilityDamage({ abilityId: event.abilityId, calculation });
      for (const issue of damage.issues) warnings.add(issue);
      return { ...event, damage };
    }
    return event;
  });
  return { schemaVersion: 1, verificationStatus: "下書き", modelVersion: plan.modelVersion, ...turn, advancesTurn: true, events, warnings: [...warnings] };
}
