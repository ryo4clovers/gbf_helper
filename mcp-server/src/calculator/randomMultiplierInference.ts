export type NominalDamagePreparation = "none" | "floor" | "ceil" | "nearest";
export type FinalDamageRounding = "floor" | "ceil" | "nearest";

export interface RandomMultiplierInferenceOptions {
  multiplierMin?: number;
  multiplierMax?: number;
  multiplierStep?: number;
  nominalPreparation?: NominalDamagePreparation;
  finalRounding?: FinalDamageRounding;
}

export interface ObservedMultiplierCandidates {
  index: number;
  observedDamage: number;
  candidates: number[];
  candidateMin?: number;
  candidateMax?: number;
}

export interface RandomMultiplierInferenceResult {
  schemaVersion: 1;
  nominalDamage: number;
  preparedNominalDamage: number;
  nominalPreparation: NominalDamagePreparation;
  finalRounding: FinalDamageRounding;
  multiplierMin: number;
  multiplierMax: number;
  multiplierStep: number;
  multiplierCount: number;
  observations: ObservedMultiplierCandidates[];
  resolvedObservationCount: number;
  unresolvedObservationIndexes: number[];
}

export interface DamageDistributionSummary {
  schemaVersion: 1;
  model: "uniform-discrete";
  nominalDamage: number;
  preparedNominalDamage: number;
  nominalPreparation: NominalDamagePreparation;
  finalRounding: FinalDamageRounding;
  multiplierMin: number;
  multiplierMax: number;
  multiplierStep: number;
  patternCount: number;
  uniqueDamageCount: number;
  minimumDamage: number;
  maximumDamage: number;
  /** Arithmetic mean of all equally weighted, rounded damage patterns. */
  expectedDamage: number;
}

function prepareNominalDamage(value: number, mode: NominalDamagePreparation): number {
  if (mode === "floor") return Math.floor(value);
  if (mode === "ceil") return Math.ceil(value);
  if (mode === "nearest") return Math.round(value);
  return value;
}

function roundFinalDamage(value: number, mode: FinalDamageRounding): number {
  const normalized = Number(value.toFixed(12));
  if (mode === "floor") return Math.floor(normalized);
  if (mode === "ceil") return Math.ceil(normalized);
  return Math.round(normalized);
}

function resolveConfiguration(options: RandomMultiplierInferenceOptions) {
  return {
    multiplierMin: options.multiplierMin ?? 0.95,
    multiplierMax: options.multiplierMax ?? 1.05,
    multiplierStep: options.multiplierStep ?? 0.001,
    nominalPreparation: options.nominalPreparation ?? "none",
    finalRounding: options.finalRounding ?? "ceil",
  };
}

function validateConfiguration(
  nominalDamage: number,
  multiplierMin: number,
  multiplierMax: number,
  multiplierStep: number,
): void {
  if (!Number.isFinite(nominalDamage) || nominalDamage < 0) {
    throw new Error("nominalDamage must be a finite non-negative number");
  }
  if (
    !Number.isFinite(multiplierMin) ||
    !Number.isFinite(multiplierMax) ||
    !Number.isFinite(multiplierStep) ||
    multiplierMin <= 0 ||
    multiplierMax < multiplierMin ||
    multiplierStep <= 0
  ) {
    throw new Error("multiplier range and step must be finite, positive, and ordered");
  }
}

function enumerateMultipliers(multiplierMin: number, multiplierMax: number, multiplierStep: number): number[] {
  const stepCount = Math.floor((multiplierMax - multiplierMin) / multiplierStep + 1e-9);
  return Array.from({ length: stepCount + 1 }, (_, index) =>
    Number((multiplierMin + multiplierStep * index).toFixed(12)),
  ).filter((multiplier) => multiplier <= multiplierMax + 1e-12);
}

/** Returns the user-facing minimum, maximum, and expected damage for all patterns. */
export function summarizeDamageDistribution(
  nominalDamage: number,
  options: RandomMultiplierInferenceOptions = {},
): DamageDistributionSummary {
  const { multiplierMin, multiplierMax, multiplierStep, nominalPreparation, finalRounding } =
    resolveConfiguration(options);
  validateConfiguration(nominalDamage, multiplierMin, multiplierMax, multiplierStep);
  const multipliers = enumerateMultipliers(multiplierMin, multiplierMax, multiplierStep);
  const preparedNominalDamage = prepareNominalDamage(nominalDamage, nominalPreparation);
  const damageValues = multipliers.map((multiplier) =>
    roundFinalDamage(preparedNominalDamage * multiplier, finalRounding),
  );

  return {
    schemaVersion: 1,
    model: "uniform-discrete",
    nominalDamage,
    preparedNominalDamage,
    nominalPreparation,
    finalRounding,
    multiplierMin,
    multiplierMax,
    multiplierStep,
    patternCount: damageValues.length,
    uniqueDamageCount: new Set(damageValues).size,
    minimumDamage: Math.min(...damageValues),
    maximumDamage: Math.max(...damageValues),
    expectedDamage: damageValues.reduce((sum, value) => sum + value, 0) / damageValues.length,
  };
}

/**
 * Enumerates every configured multiplier that could produce each observed
 * integer damage value under an explicit preparation and rounding hypothesis.
 */
export function inferRandomMultiplierCandidates(
  nominalDamage: number,
  observedDamageValues: number[],
  options: RandomMultiplierInferenceOptions = {},
): RandomMultiplierInferenceResult {
  const { multiplierMin, multiplierMax, multiplierStep, nominalPreparation, finalRounding } =
    resolveConfiguration(options);
  validateConfiguration(nominalDamage, multiplierMin, multiplierMax, multiplierStep);
  if (observedDamageValues.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("observed damage values must be finite non-negative numbers");
  }
  const multipliers = enumerateMultipliers(multiplierMin, multiplierMax, multiplierStep);
  const preparedNominalDamage = prepareNominalDamage(nominalDamage, nominalPreparation);

  const observations = observedDamageValues.map((observedDamage, index) => {
    const candidates = multipliers.filter(
      (multiplier) => roundFinalDamage(preparedNominalDamage * multiplier, finalRounding) === observedDamage,
    );
    return {
      index,
      observedDamage,
      candidates,
      candidateMin: candidates[0],
      candidateMax: candidates.at(-1),
    };
  });
  const unresolvedObservationIndexes = observations
    .filter((observation) => observation.candidates.length === 0)
    .map((observation) => observation.index);

  return {
    schemaVersion: 1,
    nominalDamage,
    preparedNominalDamage,
    nominalPreparation,
    finalRounding,
    multiplierMin,
    multiplierMax,
    multiplierStep,
    multiplierCount: multipliers.length,
    observations,
    resolvedObservationCount: observations.length - unresolvedObservationIndexes.length,
    unresolvedObservationIndexes,
  };
}
