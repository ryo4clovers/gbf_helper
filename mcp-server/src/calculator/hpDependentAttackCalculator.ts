import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "./types.js";

export interface HpDependentAttackResult {
  schemaVersion: 1;
  protagonistCurrentHpPercent: number;
  staminaContributions: EffectiveWeaponSkillEffect[];
  enmityContributions: EffectiveWeaponSkillEffect[];
  totalEffectiveNormalStaminaPercent: number;
  totalEffectiveNormalEnmityPercent: number;
  normalStaminaMultiplier: number;
  normalEnmityMultiplier: number;
  issues: Array<"unverified-normal-stamina" | "unverified-normal-enmity">;
}

function roundPercentage(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function roundBaseSkillPercentage(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function staminaSkillLevelCoefficient(skillLevel: number): number {
  return skillLevel <= 15 ? skillLevel : 15 + (skillLevel - 15) * 0.4;
}

function calculateRawStaminaAmountPercent(
  coefficient: number,
  skillLevel: number,
  hpPercent: number,
): number {
  if (hpPercent < 25) return 0;
  const skillCoefficient = staminaSkillLevelCoefficient(skillLevel);
  return 2.1 + (hpPercent / (coefficient - skillCoefficient)) ** 2.9;
}

/** Calculates the unboosted normal-stamina amount at the supplied HP percentage. */
export function calculateStaminaAmountPercent(
  coefficient: number,
  skillLevel: number,
  hpPercent: number,
): number {
  return roundBaseSkillPercentage(
    calculateRawStaminaAmountPercent(coefficient, skillLevel, hpPercent),
  );
}

/** Calculates the unboosted normal-enmity amount from its HP50% reference amount. */
export function calculateEnmityAmountPercent(
  amountAtHalfHpPercent: number,
  hpPercent: number,
): number {
  const hpDecreaseRatio = 1 - hpPercent / 100;
  return roundPercentage(
    amountAtHalfHpPercent * (1 + 2 * hpDecreaseRatio) * hpDecreaseRatio,
  );
}

function appliesToElement(effect: EffectiveWeaponSkillEffect, elementCode: string | undefined): boolean {
  return elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode;
}

function amountAtCurrentHp(
  effect: EffectiveWeaponSkillEffect,
  hpPercent: number,
): EffectiveWeaponSkillEffect {
  const curve = effect.hpDependentCurve;
  const skillLevel = effect.skillLevel;
  if (curve === undefined || skillLevel === undefined) return effect;
  const rawBaseAmountPercent = curve.kind === "stamina"
    ? calculateRawStaminaAmountPercent(curve.coefficient, skillLevel, hpPercent)
    : calculateEnmityAmountPercent(effect.baseAmountPercent, hpPercent);
  const baseAmountPercent = roundPercentage(rawBaseAmountPercent);
  const boostMultiplier = effect.baseAmountPercent === 0
    ? 1
    : effect.effectiveAmountPercent / effect.baseAmountPercent;
  return {
    ...effect,
    baseAmountPercent,
    // Observed HP25 data only matches when the aura is applied before display rounding.
    effectiveAmountPercent: roundPercentage(rawBaseAmountPercent * boostMultiplier),
  };
}

export function calculateHpDependentAttack(
  deck: DeckSnapshot,
  protagonistCurrentHpPercent = 100,
): HpDependentAttackResult {
  if (
    !Number.isFinite(protagonistCurrentHpPercent) ||
    protagonistCurrentHpPercent < 1 ||
    protagonistCurrentHpPercent > 100
  ) {
    throw new Error("protagonistCurrentHpPercent must be between 1 and 100");
  }
  const elementCode = deck.protagonist.elementCode;
  const applicable = (deck.effectiveWeaponSkillEffects ?? [])
    .filter((effect) => appliesToElement(effect, elementCode))
    .map((effect) => amountAtCurrentHp(effect, protagonistCurrentHpPercent));
  const staminaContributions = applicable.filter((effect) => effect.kind === "normal-stamina-up");
  const enmityContributions = applicable.filter((effect) => effect.kind === "normal-enmity-up");
  const totalEffectiveNormalStaminaPercent = roundPercentage(
    staminaContributions.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0),
  );
  const totalEffectiveNormalEnmityPercent = roundPercentage(Math.min(
    800,
    enmityContributions.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0),
  ));
  const issues: HpDependentAttackResult["issues"] = [];
  if (staminaContributions.some((effect) => effect.verificationStatus !== "検証済み")) {
    issues.push("unverified-normal-stamina");
  }
  if (enmityContributions.some((effect) => effect.verificationStatus !== "検証済み")) {
    issues.push("unverified-normal-enmity");
  }
  return {
    schemaVersion: 1,
    protagonistCurrentHpPercent,
    staminaContributions,
    enmityContributions,
    totalEffectiveNormalStaminaPercent,
    totalEffectiveNormalEnmityPercent,
    normalStaminaMultiplier: roundPercentage(1 + totalEffectiveNormalStaminaPercent / 100),
    normalEnmityMultiplier: roundPercentage(1 + totalEffectiveNormalEnmityPercent / 100),
    issues,
  };
}
