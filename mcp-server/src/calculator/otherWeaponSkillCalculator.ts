import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "./types.js";

export interface OtherWeaponSkillRateSummary {
  contributions: EffectiveWeaponSkillEffect[];
  uncappedPercent: number;
  effectivePercent: number;
  capPercent?: number;
}

export interface OtherWeaponSkillResult {
  schemaVersion: 1;
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
  kind: "healing-cap-up" | "debuff-resistance-up",
): EffectiveWeaponSkillEffect[] {
  const elementCode = deck.protagonist.elementCode;
  return (deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      effect.kind === kind &&
      (elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode),
  );
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
  const healingCap = summarizeRate(matchingEffects(deck, "healing-cap-up"), 100);
  const debuffResistance = summarizeRate(matchingEffects(deck, "debuff-resistance-up"));
  return {
    schemaVersion: 1,
    healingCap,
    debuffResistance,
    incomingDebuffSuccessRateAt100Percent: roundPercentage(
      Math.max(0, 100 - debuffResistance.effectivePercent),
    ),
  };
}
