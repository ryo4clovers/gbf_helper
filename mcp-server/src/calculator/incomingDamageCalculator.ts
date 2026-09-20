import type { EffectiveWeaponSkillEffect } from "./types.js";

export interface IncomingDamagePredictionResult {
  schemaVersion: 1;
  status: "verified-formula";
  enemyAttack: number;
  baseDefensePercent: number;
  weaponDefensePercent: number;
  weaponDefenseContributions: EffectiveWeaponSkillEffect[];
  defensePercent: number;
  elementalDamageReductionPercents: number[];
  effectiveElementalDamageReductionPercent: number;
  nominalDamage: number;
  minimumDamage: number;
  maximumDamage: number;
}

export function calculateIncomingDamagePrediction(
  enemyAttack: number,
  defensePercent: number,
  elementalDamageReductionPercents: number[],
  random: { minimum?: number; maximum?: number } = {},
  weaponDefenseContributions: EffectiveWeaponSkillEffect[] = [],
): IncomingDamagePredictionResult {
  const weaponDefensePercent = weaponDefenseContributions.reduce(
    (sum, contribution) => sum + contribution.effectiveAmountPercent,
    0,
  );
  const totalDefensePercent = defensePercent + weaponDefensePercent;
  const reductionMultiplier = elementalDamageReductionPercents.reduce(
    (product, percent) => product * (1 - percent / 100),
    1,
  );
  const baseDamage = enemyAttack / (1 + totalDefensePercent / 100) * reductionMultiplier;
  return {
    schemaVersion: 1,
    status: "verified-formula",
    enemyAttack,
    baseDefensePercent: defensePercent,
    weaponDefensePercent,
    weaponDefenseContributions,
    defensePercent: totalDefensePercent,
    elementalDamageReductionPercents,
    effectiveElementalDamageReductionPercent: (1 - reductionMultiplier) * 100,
    nominalDamage: Math.ceil(baseDamage),
    minimumDamage: Math.ceil(baseDamage * (random.minimum ?? 0.95)),
    maximumDamage: Math.ceil(baseDamage * (random.maximum ?? 1.05)),
  };
}
