import { applyNormalAttackHitStages } from "./pursuitDamageCalculator.js";
import { enumerateRandomMultipliers } from "./randomMultiplierInference.js";
import type { NormalAttackDamageResult } from "./normalAttackDamageCalculator.js";
import type { RecordedBattlePacket } from "./recordedBattleParser.js";

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
  ].map((model) => ({ ...model, patterns: enumerateRandomMultipliers(model.distribution.multiplierMin,
    model.distribution.multiplierMax, model.distribution.multiplierStep).map((multiplier) => {
      const raw = applyNormalAttackHitStages(model.base * multiplier, model.percentage, model.stages);
      const normalized = Number(raw.toFixed(12));
      return { multiplier, damage: model.distribution.finalRounding === "ceil" ? Math.ceil(normalized)
        : model.distribution.finalRounding === "floor" ? Math.floor(normalized) : Math.round(normalized) };
    }) }));
  const observations = packets.filter((packet) => packet.kind === "normal" && packet.actorPosition === 0 && packet.targetSide === "enemy" && packet.targetPosition === 0)
    .map((packet) => {
      const component = packet.concurrentAttackIndex === 0 ? "body" : packet.elementCode === "98" ? "destruction-pursuit"
        : packet.elementCode === elementCode ? "elemental-pursuit" : "unsupported";
      const model = models.find((entry) => entry.component === component);
      const nearest = model?.patterns.reduce((previous, current) =>
        Math.abs(previous.damage - packet.value) <= Math.abs(current.damage - packet.value) ? previous : current);
      return {
        turn: packet.turn, component, observedDamage: packet.value,
        exactCandidateMultipliers: model?.patterns.filter((pattern) => pattern.damage === packet.value).map((pattern) => pattern.multiplier) ?? [],
        predictedMinimum: model?.distribution.minimumDamage, predictedMaximum: model?.distribution.maximumDamage,
        nearestPredictedDamage: nearest?.damage,
        differenceToNearest: nearest === undefined ? undefined : nearest.damage - packet.value,
        withinPredictedRange: model === undefined ? undefined : packet.value >= model.distribution.minimumDamage && packet.value <= model.distribution.maximumDamage,
      };
    });
  return {
    schemaVersion: 1, status: "provisional", criticalModel: "guaranteed-job-support-only",
    observations,
    components: [...new Set(observations.map((observation) => observation.component))].map((component) => {
      const rows = observations.filter((observation) => observation.component === component);
      const differences = rows.flatMap((observation) => observation.differenceToNearest === undefined ? [] : [Math.abs(observation.differenceToNearest)]);
      return { component, hitCount: rows.length, exactMatchCount: rows.filter((row) => row.exactCandidateMultipliers.length > 0).length,
        withinRangeCount: rows.filter((row) => row.withinPredictedRange).length,
        maximumAbsoluteDifference: differences.length === 0 ? undefined : Math.max(...differences) };
    }),
    notes: ["乱数候補との一致は計算式全体の検証完了を意味しない。指定した戦闘状態と防御値への条件付き照合。",
      "武器技巧・ランダムLBクリティカル・戦闘中のバフ/デバフは自動推定しない。"],
  };
}
