import type { BattleActionResult, DeckSnapshot } from "./types.js";
import {
  inferRandomMultiplierCandidates,
  summarizeDamageDistribution,
  type DamageDistributionSummary,
  type FinalDamageRounding,
  type NominalDamagePreparation,
  type RandomMultiplierInferenceResult,
} from "./randomMultiplierInference.js";

export interface PursuitValidationOptions {
  damageMode?: "normal" | "advantage";
  effectIconIncludes?: string;
  concurrentIndex?: number;
  randomMultiplierMin?: number;
  randomMultiplierMax?: number;
  multiplierStep?: number;
  inferenceNominalPreparation?: NominalDamagePreparation;
  inferenceFinalRounding?: FinalDamageRounding;
}

export interface PursuitValidationResult {
  schemaVersion: 1;
  status: "provisional";
  damageMode: "normal" | "advantage";
  displayedBaseDamage: number;
  displayedPursuitPercentage: number;
  nominalPursuitDamage: number;
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

/**
 * Compares a displayed pursuit percentage with observed concurrent normal-attack
 * components. The ±5% defaults are provisional and intentionally use
 * conservative integer bounds until the game's exact rounding order is known.
 */
export function validateDisplayedPursuitDamage(
  deck: DeckSnapshot,
  actionResults: BattleActionResult[],
  options: PursuitValidationOptions = {},
): PursuitValidationResult {
  const damageMode = options.damageMode ?? "normal";
  const effectIconIncludes = options.effectIconIncludes ?? "concurrent_attack";
  const concurrentIndex = options.concurrentIndex ?? 1;
  const randomMultiplierMin = options.randomMultiplierMin ?? 0.95;
  const randomMultiplierMax = options.randomMultiplierMax ?? 1.05;
  const multiplierStep = options.multiplierStep ?? 0.001;
  const inferenceNominalPreparation = options.inferenceNominalPreparation ?? "floor";
  const inferenceFinalRounding = options.inferenceFinalRounding ?? "ceil";

  if (
    !Number.isFinite(randomMultiplierMin) ||
    !Number.isFinite(randomMultiplierMax) ||
    randomMultiplierMin <= 0 ||
    randomMultiplierMax < randomMultiplierMin
  ) {
    throw new Error("random multiplier range must be finite, positive, and ordered");
  }

  const damageInfo = deck.displayedDamageInfo;
  if (damageInfo === undefined) throw new Error("deck does not contain displayedDamageInfo");
  const displayedBaseDamage =
    damageMode === "advantage" ? damageInfo.assumedAdvantageDamage : damageInfo.assumedNormalDamage;
  if (displayedBaseDamage === undefined) {
    throw new Error(`deck does not contain displayed ${damageMode} damage`);
  }

  const matchingEffects = damageInfo.effectValues.filter(
    (effect) => effect.icon?.includes(effectIconIncludes) && effect.percentage !== undefined,
  );
  if (matchingEffects.length !== 1) {
    throw new Error(
      `expected exactly one percentage effect matching icon fragment ${JSON.stringify(effectIconIncludes)}, found ${matchingEffects.length}`,
    );
  }
  const displayedPursuitPercentage = matchingEffects[0].percentage;
  if (displayedPursuitPercentage === undefined) {
    throw new Error("matching pursuit effect does not contain a percentage");
  }

  const values = actionResults.flatMap((result) =>
    result.damage
      .filter(
        (damage) =>
          damage.sourceCommand === "attack" &&
          damage.concurrentIndex === concurrentIndex &&
          damage.critical !== true &&
          damage.missed !== true &&
          damage.guarded !== true,
      )
      .map((damage) => damage.value),
  );
  if (values.length === 0) throw new Error("no eligible observed pursuit damage was found");

  const nominalPursuitDamage =
    Math.round(((displayedBaseDamage * displayedPursuitPercentage) / 100) * 1_000_000) / 1_000_000;
  const damageDistribution = summarizeDamageDistribution(nominalPursuitDamage, {
    multiplierMin: randomMultiplierMin,
    multiplierMax: randomMultiplierMax,
    multiplierStep,
    nominalPreparation: inferenceNominalPreparation,
    finalRounding: inferenceFinalRounding,
  });
  const acceptedMin = damageDistribution.minimumDamage;
  const acceptedMax = damageDistribution.maximumDamage;
  const outliers = values.filter((value) => value < acceptedMin || value > acceptedMax);
  const randomMultiplierInference = inferRandomMultiplierCandidates(nominalPursuitDamage, values, {
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
    displayedPursuitPercentage,
    nominalPursuitDamage,
    acceptedRange: {
      min: acceptedMin,
      max: acceptedMax,
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
