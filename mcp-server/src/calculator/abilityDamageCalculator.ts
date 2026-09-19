import { calculateEffectiveAbilityMultiplier, resolveAbilityDamageVariant } from "./abilityDamageProfile.js";
import { findAbilityDamageProfile } from "./abilityDamageProfiles.js";
import { calculateDamageAttenuation, type DamageAttenuationProfile } from "./damageAttenuationCalculator.js";
import { summarizeDamageDistribution, type DamageDistributionSummary } from "./randomMultiplierInference.js";

const ARMOR_BREAK_CANDIDATE_ATTENUATION: DamageAttenuationProfile = {
  id: "ability-1000-normal-candidate",
  name: "アーマーブレイク（候補値）",
  lines: [
    { threshold: 300_000, passRate: 0.7 },
    { threshold: 400_000, passRate: 0.4 },
    { threshold: 500_000, passRate: 0.1 },
  ],
};

export interface AbilityDamagePredictionResult {
  schemaVersion: 1;
  status: "provisional";
  abilityId: string;
  abilityName: string;
  intrinsicMultiplier: number;
  abilityDamageUpPercent: number;
  limitBonusPercent: number;
  effectiveMultiplier: number;
  damageCapUpPercent: number;
  supplementalDamagePerHit: number;
  postAttenuationPercent: number;
  damageDistribution: DamageDistributionSummary;
  reliableThroughPreAttenuationDamage: number;
  issues: Array<"attenuation-lines-candidate" | "fourth-pass-rate-unresolved">;
}

interface AbilityDamagePredictionInput {
  commonPreAbilityDamage: number;
  abilityDamageUpPercent: number;
  limitBonusPercent: number;
  damageCapUpPercent: number;
  supplementalDamagePerHit: number;
  postAttenuationPercent: number;
  multiplierMin?: number;
  multiplierMax?: number;
  multiplierStep?: number;
}

/** Predicts the observed normal-mode Armor Break packet from the shared attack base. */
export function calculateArmorBreakDamage(
  input: AbilityDamagePredictionInput,
): AbilityDamagePredictionResult {
  const profile = findAbilityDamageProfile("1000");
  if (profile === undefined) throw new Error("Armor Break ability profile is missing");
  const variant = resolveAbilityDamageVariant(profile, { enemyMode: "normal" });
  const effectiveMultiplier = calculateEffectiveAbilityMultiplier(
    variant.multiplier,
    input.abilityDamageUpPercent,
  ).min;
  const nominalDamage = input.commonPreAbilityDamage * effectiveMultiplier;
  const damageDistribution = summarizeDamageDistribution(nominalDamage, {
    multiplierMin: input.multiplierMin,
    multiplierMax: input.multiplierMax,
    multiplierStep: input.multiplierStep,
    finalRounding: "ceil",
    damageTransform: {
      id: ARMOR_BREAK_CANDIDATE_ATTENUATION.id,
      apply: (damage) =>
        calculateDamageAttenuation(damage, ARMOR_BREAK_CANDIDATE_ATTENUATION, {
          damageCapUpPercent: input.damageCapUpPercent,
        }).damage * (1 + input.postAttenuationPercent / 100)
        + input.supplementalDamagePerHit,
    },
  });
  return {
    schemaVersion: 1,
    status: "provisional",
    abilityId: profile.abilityId,
    abilityName: profile.name,
    intrinsicMultiplier: variant.multiplier.min,
    abilityDamageUpPercent: input.abilityDamageUpPercent,
    limitBonusPercent: input.limitBonusPercent,
    effectiveMultiplier,
    damageCapUpPercent: input.damageCapUpPercent,
    supplementalDamagePerHit: input.supplementalDamagePerHit,
    postAttenuationPercent: input.postAttenuationPercent,
    damageDistribution,
    reliableThroughPreAttenuationDamage: 600_000 * (1 + input.damageCapUpPercent / 100),
    issues: ["attenuation-lines-candidate", "fourth-pass-rate-unresolved"],
  };
}
