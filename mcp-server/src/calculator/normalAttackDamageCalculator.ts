import {
  calculateDefenseAdjustedBaseDamage,
  type DefenseAdjustedBaseDamageResult,
} from "./baseDamageCalculator.js";
import {
  calculateBattleNormalAttackPower,
  type NormalAttackPowerResult,
} from "./normalAttackPowerCalculator.js";
import {
  calculateEffectivePursuitDamage,
  type EffectivePursuitDamageResult,
} from "./pursuitDamageCalculator.js";
import {
  summarizeDamageDistribution,
  type DamageDistributionSummary,
  type FinalDamageRounding,
  type NominalDamagePreparation,
} from "./randomMultiplierInference.js";
import type { DamageCalculationInput } from "./types.js";

export interface NormalAttackDamageOptions {
  multiplierMin?: number;
  multiplierMax?: number;
  multiplierStep?: number;
  bodyNominalPreparation?: NominalDamagePreparation;
  pursuitNominalPreparation?: NominalDamagePreparation;
  finalRounding?: FinalDamageRounding;
  pursuitSourceSkillId?: string;
}

export interface CombinedNormalAttackDistribution {
  schemaVersion: 1;
  model: "independent-discrete-components";
  componentCount: number;
  /** Cartesian product count; patterns themselves are intentionally not materialized. */
  combinationCount: number;
  minimumDamage: number;
  maximumDamage: number;
  expectedDamage: number;
}

export interface NormalAttackDamageResult {
  schemaVersion: 1;
  status: "provisional";
  attackPower: NormalAttackPowerResult;
  baseDamage: DefenseAdjustedBaseDamageResult;
  bodyDamageDistribution: DamageDistributionSummary;
  pursuitDamage?: EffectivePursuitDamageResult;
  totalDamageDistribution: CombinedNormalAttackDistribution;
  issues: Array<
    | "damage-cap-unresolved"
    | "rounding-order-unresolved"
    | "independent-component-randomness-provisional"
  >;
}

function hasSelectedPursuit(input: DamageCalculationInput, sourceSkillId: string | undefined): boolean {
  const elementCode = input.deck.protagonist.elementCode;
  return (input.deck.effectiveWeaponSkillEffects ?? []).some(
    (effect) =>
      effect.kind === "elemental-pursuit" &&
      (elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode) &&
      (sourceSkillId === undefined || effect.sourceSkillId === sourceSkillId),
  );
}

/**
 * Connects staged pre-random damage to body and pursuit distributions. Body and
 * pursuit use independent rolls, matching the observed concurrent hit pairs.
 */
export function calculateNormalAttackDamage(
  input: DamageCalculationInput,
  options: NormalAttackDamageOptions = {},
): NormalAttackDamageResult {
  const attackPower = calculateBattleNormalAttackPower(input.deck, input.battle);
  const baseDamage = calculateDefenseAdjustedBaseDamage(input, attackPower);
  const sharedRandomOptions = {
    multiplierMin: options.multiplierMin,
    multiplierMax: options.multiplierMax,
    multiplierStep: options.multiplierStep,
  };
  const bodyDamageDistribution = summarizeDamageDistribution(baseDamage.unroundedDamageBeforeRandomAndCap, {
    ...sharedRandomOptions,
    nominalPreparation: options.bodyNominalPreparation ?? "none",
    finalRounding: options.finalRounding ?? "floor",
  });
  const pursuitDamage = hasSelectedPursuit(input, options.pursuitSourceSkillId)
    ? calculateEffectivePursuitDamage(input.deck, baseDamage.damageBeforeRandomAndCap, {
        ...sharedRandomOptions,
        sourceSkillId: options.pursuitSourceSkillId,
        nominalPreparation: options.pursuitNominalPreparation ?? "none",
        finalRounding: options.finalRounding ?? "floor",
      })
    : undefined;
  const distributions = [
    bodyDamageDistribution,
    ...(pursuitDamage === undefined ? [] : [pursuitDamage.damageDistribution]),
  ];

  return {
    schemaVersion: 1,
    status: "provisional",
    attackPower,
    baseDamage,
    bodyDamageDistribution,
    pursuitDamage,
    totalDamageDistribution: {
      schemaVersion: 1,
      model: "independent-discrete-components",
      componentCount: distributions.length,
      combinationCount: distributions.reduce((count, distribution) => count * distribution.patternCount, 1),
      minimumDamage: distributions.reduce((sum, distribution) => sum + distribution.minimumDamage, 0),
      maximumDamage: distributions.reduce((sum, distribution) => sum + distribution.maximumDamage, 0),
      expectedDamage: distributions.reduce((sum, distribution) => sum + distribution.expectedDamage, 0),
    },
    issues: [
      "damage-cap-unresolved",
      "rounding-order-unresolved",
      ...(pursuitDamage === undefined ? [] : (["independent-component-randomness-provisional"] as const)),
    ],
  };
}
