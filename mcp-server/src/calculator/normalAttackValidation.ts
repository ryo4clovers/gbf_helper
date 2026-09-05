import { calculateNormalAttackPower, type NormalAttackPowerResult } from "./normalAttackPowerCalculator.js";
import {
  inferRandomMultiplierCandidates,
  summarizeDamageDistribution,
  type DamageDistributionSummary,
  type FinalDamageRounding,
  type NominalDamagePreparation,
  type RandomMultiplierInferenceResult,
} from "./randomMultiplierInference.js";
import type { BattleActionResult, DeckSnapshot } from "./types.js";

export interface NormalAttackValidationOptions {
  damageMode?: "normal" | "advantage";
  randomMultiplierMin?: number;
  randomMultiplierMax?: number;
  multiplierStep?: number;
  inferenceNominalPreparation?: NominalDamagePreparation;
  inferenceFinalRounding?: FinalDamageRounding;
}

export interface NormalAttackValidationResult {
  schemaVersion: 1;
  status: "provisional";
  damageMode: "normal" | "advantage";
  displayedBaseDamage: number;
  attackPower: NormalAttackPowerResult;
  acceptedRange: {
    min: number;
    max: number;
    randomMultiplierMin: number;
    randomMultiplierMax: number;
  };
  observed: {
    count: number;
    min: number;
    max: number;
    average: number;
    withinRangeCount: number;
    outliers: number[];
  };
  randomMultiplierInference: RandomMultiplierInferenceResult;
  damageDistribution: DamageDistributionSummary;
}

/** Validates non-critical normal-attack body packets against the UI estimate. */
export function validateDisplayedNormalAttackDamage(
  deck: DeckSnapshot,
  actionResults: BattleActionResult[],
  options: NormalAttackValidationOptions = {},
): NormalAttackValidationResult {
  const damageMode = options.damageMode ?? "normal";
  const randomMultiplierMin = options.randomMultiplierMin ?? 0.95;
  const randomMultiplierMax = options.randomMultiplierMax ?? 1.05;
  const multiplierStep = options.multiplierStep ?? 0.001;
  const inferenceNominalPreparation = options.inferenceNominalPreparation ?? "none";
  const inferenceFinalRounding = options.inferenceFinalRounding ?? "ceil";
  const damageInfo = deck.displayedDamageInfo;
  if (damageInfo === undefined) throw new Error("deck does not contain displayedDamageInfo");
  const displayedBaseDamage =
    damageMode === "advantage" ? damageInfo.assumedAdvantageDamage : damageInfo.assumedNormalDamage;
  if (displayedBaseDamage === undefined) {
    throw new Error(`deck does not contain displayed ${damageMode} damage`);
  }
  const values = actionResults.flatMap((result) =>
    result.damage
      .filter(
        (damage) =>
          damage.sourceCommand === "attack" &&
          (damage.concurrentIndex ?? 0) === 0 &&
          damage.critical !== true &&
          damage.missed !== true &&
          damage.guarded !== true,
      )
      .map((damage) => damage.value),
  );
  if (values.length === 0) throw new Error("no eligible observed normal attack damage was found");
  const damageDistribution = summarizeDamageDistribution(displayedBaseDamage, {
    multiplierMin: randomMultiplierMin,
    multiplierMax: randomMultiplierMax,
    multiplierStep,
    nominalPreparation: inferenceNominalPreparation,
    finalRounding: inferenceFinalRounding,
  });
  const outliers = values.filter(
    (value) => value < damageDistribution.minimumDamage || value > damageDistribution.maximumDamage,
  );
  const randomMultiplierInference = inferRandomMultiplierCandidates(displayedBaseDamage, values, {
    multiplierMin: randomMultiplierMin,
    multiplierMax: randomMultiplierMax,
    multiplierStep,
    nominalPreparation: inferenceNominalPreparation,
    finalRounding: inferenceFinalRounding,
  });

  return {
    schemaVersion: 1,
    status: "provisional",
    damageMode,
    displayedBaseDamage,
    attackPower: calculateNormalAttackPower(deck),
    acceptedRange: {
      min: damageDistribution.minimumDamage,
      max: damageDistribution.maximumDamage,
      randomMultiplierMin,
      randomMultiplierMax,
    },
    observed: {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      withinRangeCount: values.length - outliers.length,
      outliers,
    },
    randomMultiplierInference,
    damageDistribution,
  };
}
