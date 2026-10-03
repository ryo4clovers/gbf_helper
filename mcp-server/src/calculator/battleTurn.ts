import { z } from "zod";
import { battleActionStateSchema, generateBattleActions } from "./battleActionGenerator.js";
import { calculateNormalAttackFromRequest, normalAttackCalculationRequestSchema, type NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";
import { calculateAutomaticAbilityDamage } from "./automaticAbilityDamage.js";

const rates = z.object({ doubleAttackRatePercent: z.number().min(0).max(100), tripleAttackRatePercent: z.number().min(0).max(100) }).strict();
export const battleTurnRequestSchema = z.object({
  calculation: normalAttackCalculationRequestSchema,
  state: battleActionStateSchema.optional(),
  mode: z.enum(["normal", "downside", "upside"]),
  secondsPerTurn: z.number().finite().positive().max(3600),
  characters: z.array(z.object({
    characterSlot: z.number().int().min(1).max(3),
    currentHpPercent: z.number().finite().min(1).max(100),
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
    "下書き：自動アビリティは実測未一致の候補値・クリティカル不発。総ダメージも参考値です。",
    "奥義・手動アビリティ・召喚・交代・劇毒・被ターゲット効果は未対応です。",
  ]);
  function calculationFor(patch: Pick<NormalAttackCalculationRequest, "attacker" | "battleEffects" | "mythicalLancerLevel">): NormalAttackCalculationRequest {
    const position = patch.attacker?.characterSlot;
    const character = request.characters.find((entry) => entry.characterSlot === position);
    if (position !== undefined && !character) throw new Error(`前衛${position}のHP設定が必要です`);
    return { ...request.calculation, ...patch, attacker: position === undefined ? undefined : {
      ...patch.attacker!, currentHpPercent: character!.currentHpPercent, artifactStartBuffs: character!.artifactStartBuffs,
    } };
  }
  const plan = generateBattleActions({ schemaVersion: 1, deckConfig: request.calculation.deckConfig,
    turns: request.state?.turn ?? 1, secondsPerTurn: request.secondsPerTurn, chargeAttack: false, manualAbilities: false,
    multiattack: { mode: "minimum", seed: 1 },
  }, { state: request.state, calculationContext: request.calculation, resolveAttackCount: (position, patch, guaranteed) => {
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
    if (event.kind === "automatic-ability") {
      const { random: _random, calculationModel: _model, ...calculation } = calculationFor(event.calculationPatch);
      const damage = calculateAutomaticAbilityDamage({ abilityId: event.abilityId, calculation });
      for (const issue of damage.issues) warnings.add(issue);
      return { ...event, damage };
    }
    return event;
  });
  return { schemaVersion: 1, verificationStatus: "下書き", modelVersion: plan.modelVersion, ...turn, events, warnings: [...warnings] };
}
