/** Explicit, provisional battle effects; application/expiry belongs to the caller's battle state. */
export interface BattleDamageEffects {
  enemyDefenseDownPercent?: number;
  enemyDefenseDownBeyondCapPercent?: number;
  enemySupplementalDamage?: number;
  /** Support Skill B: take the strongest amount, including the protagonist's support. */
  supportSkillSupplementalDamage?: number;
  /** Explicit normal-attack buff amount (e.g. Ereshkigal charge attack). */
  normalAttackSupplementalDamage?: number;
}

export function resolveBattleDamageEffects(effects: BattleDamageEffects = {}, protagonistSupportAmount = 0) {
  if (!Number.isFinite(protagonistSupportAmount) || protagonistSupportAmount < 0) {
    throw new Error("Protagonist support supplemental damage must be finite and non-negative");
  }
  for (const [key, value] of Object.entries(effects)) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new Error(`${key} must be finite and non-negative`);
  }
  const standardDefenseDownPercent = Math.min(50, effects.enemyDefenseDownPercent ?? 0);
  const beyondCapDefenseDownPercent = effects.enemyDefenseDownBeyondCapPercent ?? 0;
  const totalDefenseDownPercent = standardDefenseDownPercent + beyondCapDefenseDownPercent;
  if (totalDefenseDownPercent >= 100) throw new Error("Total enemy defense DOWN must be below 100%");
  return {
    standardDefenseDownPercent, beyondCapDefenseDownPercent, totalDefenseDownPercent,
    enemySupplementalDamage: effects.enemySupplementalDamage ?? 0,
    normalAttackSupplementalDamage: effects.normalAttackSupplementalDamage ?? 0,
    supportSkillSupplementalDamage: Math.max(protagonistSupportAmount, effects.supportSkillSupplementalDamage ?? 0),
    verificationStatus: "下書き" as const,
  };
}
