import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "./types.js";

export interface OtherWeaponSkillRateSummary {
  contributions: EffectiveWeaponSkillEffect[];
  uncappedPercent: number;
  effectivePercent: number;
  capPercent?: number;
}

export interface OtherWeaponSkillFlatSummary {
  contributions: EffectiveWeaponSkillEffect[];
  uncappedAmount: number;
  effectiveAmount: number;
  capAmount?: number;
}

export interface OtherWeaponSkillResult {
  schemaVersion: 1;
  damageDealt: OtherWeaponSkillRateSummary;
  abilityDamageCap: OtherWeaponSkillRateSummary;
  abilitySupplementalDamage: OtherWeaponSkillFlatSummary;
  healingCap: OtherWeaponSkillRateSummary;
  debuffResistance: OtherWeaponSkillRateSummary;
  /** Provisional simple model requested for an enemy effect whose base success rate is 100%. */
  incomingDebuffSuccessRateAt100Percent: number;
}

function roundPercentage(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function matchingEffects(
  deck: DeckSnapshot,
  kind:
    | "damage-dealt-up"
    | "ability-damage-cap-up"
    | "ability-supplemental-damage"
    | "healing-cap-up"
    | "debuff-resistance-up",
): EffectiveWeaponSkillEffect[] {
  const elementCode = deck.protagonist.elementCode;
  return (deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      effect.kind === kind &&
      (elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode),
  );
}

function summarizeFlat(
  contributions: EffectiveWeaponSkillEffect[],
  capAmount?: number,
): OtherWeaponSkillFlatSummary {
  const uncappedAmount = contributions.reduce(
    (sum, effect) => sum + (effect.effectiveAmountFlat ?? 0),
    0,
  );
  return {
    contributions,
    uncappedAmount,
    effectiveAmount: capAmount === undefined ? uncappedAmount : Math.min(capAmount, uncappedAmount),
    ...(capAmount === undefined ? {} : { capAmount }),
  };
}

function summarizeRate(
  contributions: EffectiveWeaponSkillEffect[],
  capPercent?: number,
): OtherWeaponSkillRateSummary {
  const uncappedPercent = roundPercentage(
    contributions.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0),
  );
  return {
    contributions,
    uncappedPercent,
    effectivePercent: capPercent === undefined ? uncappedPercent : Math.min(capPercent, uncappedPercent),
    ...(capPercent === undefined ? {} : { capPercent }),
  };
}

/** Aggregates utility weapon-skill rates without mixing them into normal-attack damage. */
export function calculateOtherWeaponSkills(deck: DeckSnapshot): OtherWeaponSkillResult {
  const damageDealt = summarizeRate(matchingEffects(deck, "damage-dealt-up"));
  const abilityDamageCap = summarizeRate(matchingEffects(deck, "ability-damage-cap-up"), 100);
  const abilitySupplementalDamage = summarizeFlat(
    matchingEffects(deck, "ability-supplemental-damage"),
    200_000,
  );
  const healingCap = summarizeRate(matchingEffects(deck, "healing-cap-up"), 100);
  const debuffResistance = summarizeRate(matchingEffects(deck, "debuff-resistance-up"));
  return {
    schemaVersion: 1,
    damageDealt,
    abilityDamageCap,
    abilitySupplementalDamage,
    healingCap,
    debuffResistance,
    incomingDebuffSuccessRateAt100Percent: roundPercentage(
      Math.max(0, 100 - debuffResistance.effectivePercent),
    ),
  };
}
