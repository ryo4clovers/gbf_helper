import { applyNormalAttackHitStages, type PursuitDamageStages } from "./pursuitDamageCalculator.js";
import { enumerateRandomMultipliers, type DamageDistributionSummary } from "./randomMultiplierInference.js";
import type { NormalAttackDamageResult, NormalAttackDamageOptions } from "./normalAttackDamageCalculator.js";
import type { RecordedBattlePacket } from "./recordedBattleParser.js";
import type { parseRecordedBattleExports } from "./recordedBattleParser.js";
import type { RecordedNormalAttackState } from "./recordedNormalAttackState.js";
import { calculateNormalAttackFromRequest, type NormalAttackCalculationRequest } from "./normalAttackCalculationRequest.js";

function damagePatterns(base: number, percentage: number, distribution: DamageDistributionSummary, stages: PursuitDamageStages) {
  return enumerateRandomMultipliers(distribution.multiplierMin, distribution.multiplierMax, distribution.multiplierStep).map((multiplier) => {
    const normalized = Number(applyNormalAttackHitStages(base * multiplier, percentage, stages).toFixed(12));
    return { multiplier, damage: distribution.finalRounding === "ceil" ? Math.ceil(normalized)
      : distribution.finalRounding === "floor" ? Math.floor(normalized) : Math.round(normalized) };
  });
}

function compareDamageValue(observedDamage: number, patterns: ReturnType<typeof damagePatterns> | undefined) {
  const nearest = patterns?.reduce((previous, current) =>
    Math.abs(previous.damage - observedDamage) <= Math.abs(current.damage - observedDamage) ? previous : current);
  const predictedMinimum = patterns === undefined ? undefined : Math.min(...patterns.map((pattern) => pattern.damage));
  const predictedMaximum = patterns === undefined ? undefined : Math.max(...patterns.map((pattern) => pattern.damage));
  return { observedDamage,
    exactCandidateMultipliers: patterns?.filter((pattern) => pattern.damage === observedDamage).map((pattern) => pattern.multiplier) ?? [],
    predictedMinimum, predictedMaximum, nearestPredictedDamage: nearest?.damage,
    differenceToNearest: nearest === undefined ? undefined : nearest.damage - observedDamage,
    withinPredictedRange: predictedMinimum === undefined || predictedMaximum === undefined ? undefined
      : observedDamage >= predictedMinimum && observedDamage <= predictedMaximum };
}

function compareDestructionRounding(result: NormalAttackDamageResult, observations: Array<{ turn: number; component: string; observedDamage: number }>) {
  if (!result.destructionPursuitRoundingCandidates) return undefined;
  const candidates = result.destructionPursuitRoundingCandidates.map((candidate) => {
    const pursuit = candidate.pursuitDamage;
    const patterns = damagePatterns(pursuit.damageDistribution.preparedNominalDamage,
      pursuit.effectivePursuitPercentage, pursuit.damageDistribution, pursuit.stages!);
    const rows = observations.filter((row) => row.component === "destruction-pursuit").map((row) => ({
      turn: row.turn, component: row.component, ...compareDamageValue(row.observedDamage, patterns),
    }));
    return { model: candidate.model, verificationStatus: candidate.verificationStatus,
      baseRoundingStages: candidate.baseDamage.stages.filter((stage) => stage.stage === "normal-weapon-skill" || stage.stage === "ex-weapon-skill"),
      preRandomNominalDamage: pursuit.damageDistribution.nominalDamage,
      preparedNominalDamage: pursuit.damageDistribution.preparedNominalDamage,
      beforePursuitRounding: pursuit.stages?.beforePursuitRounding ?? "none",
      patterns, observations: rows, components: summarizeRecordedComparisonComponents(rows) };
  });
  const pairwise = candidates.flatMap((left, index) => candidates.slice(index + 1).map((right) => {
    const rightByMultiplier = new Map(right.patterns.map((pattern) => [pattern.multiplier, pattern.damage]));
    const paired = left.patterns.filter((pattern) => rightByMultiplier.has(pattern.multiplier));
    const leftValues = new Set(left.patterns.map((pattern) => pattern.damage));
    const rightValues = new Set(right.patterns.map((pattern) => pattern.damage));
    return { left: left.model, right: right.model, comparedMultiplierCount: paired.length,
      differingMultiplierCount: paired.filter((pattern) => pattern.damage !== rightByMultiplier.get(pattern.multiplier)).length,
      leftOnlyDamageCount: [...leftValues].filter((damage) => !rightValues.has(damage)).length,
      rightOnlyDamageCount: [...rightValues].filter((damage) => !leftValues.has(damage)).length };
  }));
  return { status: "provisional" as const, candidates, pairwise };
}

/** Compare known components at the caller's specified battle state; never fit modifiers to observations. */
export function compareRecordedNormalAttacks(
  result: NormalAttackDamageResult, packets: RecordedBattlePacket[], elementCode: string,
) {
  const attenuation = result.bodyDamageAttenuation;
  const criticalPercent = result.guaranteedCriticalBodyDamageDistribution
    ? result.protagonistNormalAttackSupport.criticalDamageBonusPercent : 0;
  const bodyDistribution = result.guaranteedCriticalBodyDamageDistribution ?? result.bodyDamageDistribution;
  const models = [
    { component: "body", base: bodyDistribution.preparedNominalDamage, percentage: 100, distribution: bodyDistribution,
      stages: { ...attenuation, criticalDamageBonusPercent: criticalPercent } },
    ...[result.pursuitDamage, result.destructionPursuitDamage].flatMap((pursuit, index) => !pursuit?.stages ? [] : [{
      component: index === 0 ? "elemental-pursuit" : "destruction-pursuit", base: pursuit.damageDistribution.preparedNominalDamage,
      percentage: pursuit.effectivePursuitPercentage, distribution: pursuit.damageDistribution, stages: pursuit.stages,
    }]),
  ].map((model) => ({ ...model, patterns: damagePatterns(model.base, model.percentage, model.distribution, model.stages) }));
  const observations = packets.filter((packet) => packet.kind === "normal" && packet.actorPosition === 0 && packet.targetSide === "enemy" && packet.targetPosition === 0)
    .map((packet) => {
      const component = packet.concurrentAttackIndex === 0 ? "body" : packet.elementCode === "98" ? "destruction-pursuit"
        : packet.elementCode === elementCode ? "elemental-pursuit" : "unsupported";
      const model = models.find((entry) => entry.component === component);
      return {
        turn: packet.turn, component, ...compareDamageValue(packet.value, model?.patterns),
      };
    });
  return {
    schemaVersion: 1, status: "provisional", criticalModel: "guaranteed-job-support-only",
    observations,
    components: summarizeRecordedComparisonComponents(observations),
    destructionRoundingComparison: compareDestructionRounding(result, observations),
    notes: ["乱数候補との一致は計算式全体の検証完了を意味しない。指定した戦闘状態と防御値への条件付き照合。",
      "武器技巧・ランダムLBクリティカル・戦闘中のバフ/デバフは自動推定しない。"],
  };
}

export function summarizeRecordedComparisonComponents(observations: Array<{
  component: string; differenceToNearest?: number; exactCandidateMultipliers: number[]; withinPredictedRange?: boolean;
}>) {
  return [...new Set(observations.map((observation) => observation.component))].map((component) => {
    const rows = observations.filter((observation) => observation.component === component);
    const differences = rows.flatMap((observation) => observation.differenceToNearest === undefined ? [] : [Math.abs(observation.differenceToNearest)]);
    return { component, hitCount: rows.length, exactMatchCount: rows.filter((row) => row.exactCandidateMultipliers.length > 0).length,
      withinRangeCount: rows.filter((row) => row.withinPredictedRange).length,
      maximumAbsoluteDifference: differences.length === 0 ? undefined : Math.max(...differences) };
  });
}

/** State-based calculations use recorded actions/conditions, never the observed damage as a prediction. */
export function compareRecordedNormalAttackStates(request: NormalAttackCalculationRequest,
  observation: ReturnType<typeof parseRecordedBattleExports>, states: RecordedNormalAttackState[],
  diagnostics: Pick<NormalAttackDamageOptions, "compareDestructionPursuitRounding"> = {}) {
  const cache = new Map<string, NormalAttackDamageResult>();
  const comparisons = states.map((state) => {
    const currentLevel = request.mythicalLancerLevel ?? state.mythicalLancerLevel;
    const currentHpPercent = state.protagonistCurrentHpPercent ?? request.protagonistCurrentHpPercent;
    const key = JSON.stringify([currentLevel, currentHpPercent, state.battleEffects]);
    let result = cache.get(key);
    if (!result) {
      result = calculateNormalAttackFromRequest({ ...request, mythicalLancerLevel: currentLevel,
        protagonistCurrentHpPercent: currentHpPercent, battleEffects: state.battleEffects }, diagnostics).result;
      cache.set(key, result);
    }
    const packets = observation.turns.find((turn) => turn.turn === state.turn)?.packets.filter(
      (packet) => packet.normalActionIndex === state.actionIndex) ?? [];
    const comparison = compareRecordedNormalAttacks(result, packets, observation.deckConfig?.protagonist.elementCode ?? "");
    const body = result.guaranteedCriticalBodyDamageDistribution ?? result.bodyDamageDistribution;
    return { state, appliedMythicalLancerLevel: currentLevel,
      effectiveEnemyDefense: result.baseDamage.defenseIgnore?.effectiveDefense,
      supplementalDamagePerHit: result.bodyDamageAttenuation.supplementalDamagePerHit,
      predictions: { body: { minimum: body.minimumDamage, maximum: body.maximumDamage },
        elementalPursuit: result.pursuitDamage?.damageDistribution,
        destructionPursuit: result.destructionPursuitDamage?.damageDistribution }, comparison };
  });
  const observations = comparisons.flatMap((entry) => entry.comparison.observations);
  return { schemaVersion: 1, status: "provisional", criticalModel: "guaranteed-job-support-only",
    observations, components: summarizeRecordedComparisonComponents(observations), states: comparisons,
    destructionRoundingComparison: summarizeDestructionRoundingComparisons(comparisons.map((entry) => entry.comparison.destructionRoundingComparison)),
    notes: ["記録済みの行動・状態を使う条件付き単発照合。キャラクターの行動を予測する戦闘シミュレーションではない。",
      "アイコンだけから累積値を推定せず、既知アビリティの発動と状態更新から数える。数値・枠・40hitカウンタの数え方は下書き。"],
  };
}

function summarizeDestructionRoundingComparisons(comparisons: Array<ReturnType<typeof compareDestructionRounding>>) {
  const entries = comparisons.filter((entry) => entry !== undefined);
  if (entries.length === 0) return undefined;
  const candidates = entries[0].candidates.map(({ model, verificationStatus }) => ({ model, verificationStatus,
    components: summarizeRecordedComparisonComponents(entries.flatMap((entry) =>
      entry.candidates.find((candidate) => candidate.model === model)?.observations ?? [])) }));
  const pairwise = entries[0].pairwise.map(({ left, right }) => {
    const pairs = entries.flatMap((entry) => entry.pairwise.filter((pair) => pair.left === left && pair.right === right));
    return { left, right, stateCount: pairs.length,
      identicalPredictionStateCount: pairs.filter((pair) => pair.differingMultiplierCount === 0).length,
      comparedMultiplierCount: pairs.reduce((sum, pair) => sum + pair.comparedMultiplierCount, 0),
      differingMultiplierCount: pairs.reduce((sum, pair) => sum + pair.differingMultiplierCount, 0),
      leftOnlyDamageCount: pairs.reduce((sum, pair) => sum + pair.leftOnlyDamageCount, 0),
      rightOnlyDamageCount: pairs.reduce((sum, pair) => sum + pair.rightOnlyDamageCount, 0) };
  });
  return { status: "provisional" as const, candidates, pairwise,
    notes: ["固定した4候補を比較する診断。実測に応じた丸め位置の自動選択や既定計算の置換は行わない。",
      "全乱数の整数予測が同一の候補は、この条件の追加ダメージ記録だけでは識別できない。別編成/ステータス/HP/防御で独立検証する。"] };
}
