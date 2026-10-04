/** Provisional: preserve IEEE-754 roundoff when rounding the cap increase. */
export function scaleDamageCapThreshold(threshold, damageCapUpPercent) {
  return threshold + Math.ceil(threshold * (damageCapUpPercent / 100));
}

/** Shared by the server and battle UI; supplemental damage is added last. */
export function finalizeNormalAttackHit(attenuatedDamage, percentage, stages) {
  const amplified = attenuatedDamage / stages.randomTargetHitCount
    * (1 + stages.postAttenuationPercent / 100);
  const takenPercent = stages.enemyDamageTakenAmplificationPercent ?? 0;
  if (stages.beforePursuitRounding === "ceil") {
    const roundedParent = Math.ceil(amplified);
    const parent = stages.addedHitMultiplier === undefined ? roundedParent : Math.floor(roundedParent * stages.addedHitMultiplier);
    const hit = Math.floor(parent * (percentage / 100));
    return hit + Math.ceil(hit * (takenPercent / 100)) + stages.supplementalDamagePerHit;
  }
  // Retained for the legacy displayed-base path and explicit rounding diagnostics.
  return amplified * (stages.addedHitMultiplier ?? 1) * (percentage / 100) * (1 + takenPercent / 100)
    + stages.supplementalDamagePerHit;
}
