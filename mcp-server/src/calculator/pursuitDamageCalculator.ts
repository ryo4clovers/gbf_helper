import {
  summarizeDamageDistribution,
  type DamageDistributionSummary,
  type RandomMultiplierInferenceOptions,
} from "./randomMultiplierInference.js";
import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "./types.js";
import { calculateDamageAttenuation, type DamageAttenuationProfile } from "./damageAttenuationCalculator.js";

export interface PursuitDamageStages {
  profile: DamageAttenuationProfile;
  damageCapUpPercent: number;
  postAttenuationPercent: number;
  enemyDamageTakenAmplificationPercent?: number;
  randomTargetHitCount: number;
  supplementalDamagePerHit: number;
  criticalDamageBonusPercent: number;
  /** Provisional Flurry echo model: round the amplified body before applying the echo %. */
  beforePursuitRounding?: "ceil";
}

/** Damage is attenuated before Flurry splitting and per-hit supplemental damage. */
export function applyNormalAttackHitStages(damage: number, percentage: number, stages: PursuitDamageStages): number {
  const damageTakenMultiplier = 1 + (stages.enemyDamageTakenAmplificationPercent ?? 0) / 100;
  const split = calculateDamageAttenuation(damage * (1 + stages.criticalDamageBonusPercent / 100), stages.profile,
    { damageCapUpPercent: stages.damageCapUpPercent }).damage / stages.randomTargetHitCount;
  if (stages.beforePursuitRounding === "ceil") {
    const amplified = split * (1 + stages.postAttenuationPercent / 100) * damageTakenMultiplier;
    return Math.ceil(Number(amplified.toFixed(12))) * percentage / 100 + stages.supplementalDamagePerHit;
  }
  return split * percentage / 100 * (1 + stages.postAttenuationPercent / 100) * damageTakenMultiplier + stages.supplementalDamagePerHit;
}

export interface EffectivePursuitDamageOptions extends RandomMultiplierInferenceOptions {
  kind?: "elemental-pursuit" | "destruction-pursuit";
  /** Defaults to the protagonist element when available. */
  elementCode?: string;
  /** Selects one pursuit explicitly when a deck contains more than one. */
  sourceSkillId?: string;
  /** Raw pre-cap body damage is required when this staged model is supplied. */
  stages?: PursuitDamageStages;
}

export interface EffectivePursuitDamageIssue {
  code: "unverified-effective-pursuit";
  message: string;
}

export interface EffectivePursuitDamageResult {
  schemaVersion: 1;
  status: "provisional";
  baseDamage: number;
  pursuitEffect: EffectiveWeaponSkillEffect;
  pursuitEffects: EffectiveWeaponSkillEffect[];
  rawPursuitPercentage: number;
  capPercent?: number;
  effectivePursuitPercentage: number;
  nominalPursuitDamage: number;
  damageDistribution: DamageDistributionSummary;
  stages?: PursuitDamageStages;
  issues: EffectivePursuitDamageIssue[];
}

function selectPursuitEffects(
  deck: DeckSnapshot,
  options: EffectivePursuitDamageOptions,
): EffectiveWeaponSkillEffect[] {
  const elementCode = options.elementCode ?? deck.protagonist.elementCode;
  const matches = (deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      effect.kind === (options.kind ?? "elemental-pursuit") &&
      (elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode) &&
      (options.sourceSkillId === undefined || effect.sourceSkillId === options.sourceSkillId),
  );
  const skillIds = new Set(matches.map((effect) => effect.sourceSkillId));
  const caps = new Set(matches.map((effect) => effect.stackingCapPercent));
  if (matches.length === 0 || skillIds.size !== 1 || caps.size !== 1) {
    const selector = options.sourceSkillId === undefined ? "" : ` for skill ${options.sourceSkillId}`;
    throw new Error(`expected exactly one effective pursuit effect${selector}, found ${matches.length}`);
  }
  return matches;
}

/**
 * Calculates 101 pursuit-damage patterns by default from a resolved effective
 * pursuit percentage and an externally supplied displayed body damage. The
 * fractional pursuit base is preserved until the final per-packet floor.
 */
export function calculateEffectivePursuitDamage(
  deck: DeckSnapshot,
  baseDamage: number,
  options: EffectivePursuitDamageOptions = {},
): EffectivePursuitDamageResult {
  if (!Number.isFinite(baseDamage) || baseDamage < 0) {
    throw new Error("baseDamage must be a finite non-negative number");
  }
  const pursuitEffects = selectPursuitEffects(deck, options);
  const pursuitEffect = pursuitEffects[0];
  const rawPursuitPercentage = Math.round(pursuitEffects.reduce(
    (sum, effect) => sum + effect.effectiveAmountPercent, 0,
  ) * 1_000_000) / 1_000_000;
  const capPercent = pursuitEffect.stackingCapPercent;
  const effectivePursuitPercentage = capPercent === undefined
    ? rawPursuitPercentage : Math.min(capPercent, rawPursuitPercentage);
  const nominalPursuitDamage =
    Math.round(((baseDamage * effectivePursuitPercentage) / 100) * 1_000_000) / 1_000_000;
  const stages = options.stages;
  const damageDistribution = summarizeDamageDistribution(stages ? baseDamage : nominalPursuitDamage, {
    multiplierMin: options.multiplierMin,
    multiplierMax: options.multiplierMax,
    multiplierStep: options.multiplierStep,
    nominalPreparation: options.nominalPreparation ?? "none",
    finalRounding: options.finalRounding ?? "floor",
    ...(stages === undefined ? {} : { damageTransform: {
      id: "pursuit-after-soft-cap",
      apply: (damage: number) => applyNormalAttackHitStages(damage, effectivePursuitPercentage, stages),
    } }),
  });
  const issues: EffectivePursuitDamageIssue[] = [];
  if (
    pursuitEffects.some((effect) => effect.verificationStatus !== "検証済み" ||
      effect.appliedModifiers.some((modifier) => modifier.verificationStatus !== "検証済み"))
  ) {
    issues.push({
      code: "unverified-effective-pursuit",
      message: `Effective pursuit from skill ${pursuitEffect.sourceSkillId} contains draft data.`,
    });
  }

  return {
    schemaVersion: 1,
    status: "provisional",
    baseDamage,
    pursuitEffect,
    pursuitEffects,
    rawPursuitPercentage,
    ...(capPercent === undefined ? {} : { capPercent }),
    effectivePursuitPercentage,
    nominalPursuitDamage,
    damageDistribution,
    ...(stages === undefined ? {} : { stages }),
    issues,
  };
}
