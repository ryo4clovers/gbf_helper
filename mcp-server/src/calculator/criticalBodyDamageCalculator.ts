import type { DefenseAdjustedBaseDamageResult } from "./baseDamageCalculator.js";
import { enumerateRandomMultipliers } from "./randomMultiplierInference.js";
import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "./types.js";

export interface CriticalBodyDamageOptions {
  multiplierMin?: number;
  multiplierMax?: number;
  multiplierStep?: number;
  criticalDamageMultiplier?: number;
}

export interface CriticalBodyDamageTrace {
  randomMultiplier: number;
  preTargetElementDamage: number;
  criticalDamageMultiplier: number;
  damageAfterCriticalFloor: number;
  targetElementMultiplier: number;
  finalDamage: number;
}

export interface CriticalBodyDamageResult {
  schemaVersion: 1;
  status: "provisional";
  probabilityModel: "damage-only";
  weaponSkillCriticalRatePercent: number;
  criticalRateEffects: EffectiveWeaponSkillEffect[];
  criticalDamageMultiplier: number;
  nominalDamage: number;
  targetElementMultiplierSource: "displayed-damage-calibration" | "not-applicable";
  damageDistribution: {
    schemaVersion: 1;
    model: "staged-critical-uniform-discrete";
    multiplierMin: number;
    multiplierMax: number;
    multiplierStep: number;
    patternCount: number;
    uniqueDamageCount: number;
    minimumDamage: number;
    maximumDamage: number;
    expectedDamage: number;
  };
}

function roundCalculation(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function resolveCriticalRateEffects(deck: DeckSnapshot): EffectiveWeaponSkillEffect[] {
  const elementCode = deck.protagonist.elementCode;
  return (deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      effect.kind === "critical-rate-up" &&
      (elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode),
  );
}

function resolvePreTargetStage(baseDamage: DefenseAdjustedBaseDamageResult): {
  preTargetElementDamage: number;
  targetElementMultiplier: number;
  source: CriticalBodyDamageResult["targetElementMultiplierSource"];
} {
  const targetStage = baseDamage.stages.find(
    (stage) => stage.stage === "target-element-damage" && stage.totalPercent !== 0,
  );
  if (targetStage === undefined) {
    return {
      preTargetElementDamage: baseDamage.unroundedDamageBeforeRandomAndCap,
      targetElementMultiplier: 1,
      source: "not-applicable",
    };
  }
  if (targetStage.inputDamage <= 0) {
    return { preTargetElementDamage: targetStage.inputDamage, targetElementMultiplier: 1, source: "not-applicable" };
  }
  return {
    preTargetElementDamage: targetStage.inputDamage,
    // The party display only exposes the floored post-target value. Calibrating
    // to it reproduces the observed second floor without claiming extra precision.
    targetElementMultiplier: baseDamage.damageBeforeRandomAndCap / targetStage.inputDamage,
    source: "displayed-damage-calibration",
  };
}

/** Applies random and critical modifiers, floors, then applies the target-element modifier and floors again. */
export function calculateCriticalBodyDamageAtMultiplier(
  baseDamage: DefenseAdjustedBaseDamageResult,
  randomMultiplier: number,
  criticalDamageMultiplier = 1.5,
): CriticalBodyDamageTrace {
  if (!Number.isFinite(randomMultiplier) || randomMultiplier <= 0) {
    throw new Error("randomMultiplier must be a finite positive number");
  }
  if (!Number.isFinite(criticalDamageMultiplier) || criticalDamageMultiplier <= 0) {
    throw new Error("criticalDamageMultiplier must be a finite positive number");
  }
  const target = resolvePreTargetStage(baseDamage);
  const damageAfterCriticalFloor = Math.floor(
    roundCalculation(target.preTargetElementDamage * randomMultiplier * criticalDamageMultiplier),
  );
  return {
    randomMultiplier,
    preTargetElementDamage: target.preTargetElementDamage,
    criticalDamageMultiplier,
    damageAfterCriticalFloor,
    targetElementMultiplier: target.targetElementMultiplier,
    finalDamage: Math.floor(roundCalculation(damageAfterCriticalFloor * target.targetElementMultiplier)),
  };
}

/** Builds the provisional critical-body distribution without weighting it by unresolved proc probability. */
export function calculateCriticalBodyDamage(
  deck: DeckSnapshot,
  baseDamage: DefenseAdjustedBaseDamageResult,
  options: CriticalBodyDamageOptions = {},
): CriticalBodyDamageResult | undefined {
  const criticalRateEffects = resolveCriticalRateEffects(deck);
  if (criticalRateEffects.length === 0) return undefined;
  const multiplierMin = options.multiplierMin ?? 0.95;
  const multiplierMax = options.multiplierMax ?? 1.05;
  const multiplierStep = options.multiplierStep ?? 0.001;
  const criticalDamageMultiplier = options.criticalDamageMultiplier ?? 1.5;
  if (
    !Number.isFinite(multiplierMin) ||
    !Number.isFinite(multiplierMax) ||
    !Number.isFinite(multiplierStep) ||
    multiplierMin <= 0 ||
    multiplierMax < multiplierMin ||
    multiplierStep <= 0
  ) {
    throw new Error("random multiplier range and step must be finite, positive, and ordered");
  }
  const multipliers = enumerateRandomMultipliers(multiplierMin, multiplierMax, multiplierStep);
  const traces = multipliers.map((multiplier) =>
    calculateCriticalBodyDamageAtMultiplier(baseDamage, multiplier, criticalDamageMultiplier),
  );
  const damageValues = traces.map((trace) => trace.finalDamage);
  const target = resolvePreTargetStage(baseDamage);

  return {
    schemaVersion: 1,
    status: "provisional",
    probabilityModel: "damage-only",
    weaponSkillCriticalRatePercent: roundCalculation(
      criticalRateEffects.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0),
    ),
    criticalRateEffects,
    criticalDamageMultiplier,
    nominalDamage: calculateCriticalBodyDamageAtMultiplier(baseDamage, 1, criticalDamageMultiplier).finalDamage,
    targetElementMultiplierSource: target.source,
    damageDistribution: {
      schemaVersion: 1,
      model: "staged-critical-uniform-discrete",
      multiplierMin,
      multiplierMax,
      multiplierStep,
      patternCount: multipliers.length,
      uniqueDamageCount: new Set(damageValues).size,
      minimumDamage: Math.min(...damageValues),
      maximumDamage: Math.max(...damageValues),
      expectedDamage: damageValues.reduce((sum, value) => sum + value, 0) / damageValues.length,
    },
  };
}
