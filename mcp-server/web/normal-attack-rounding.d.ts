export interface NormalAttackHitRoundingStages {
  addedHitMultiplier?: number;
  postAttenuationPercent: number;
  enemyDamageTakenAmplificationPercent?: number;
  randomTargetHitCount: number;
  supplementalDamagePerHit: number;
  /** Integer parent -> floor echo -> ceil damage-taken increase -> flat supplement. */
  beforePursuitRounding?: "ceil";
}

export function scaleDamageCapThreshold(threshold: number, damageCapUpPercent: number): number;
export function finalizeNormalAttackHit(
  attenuatedDamage: number, percentage: number, stages: NormalAttackHitRoundingStages,
): number;
