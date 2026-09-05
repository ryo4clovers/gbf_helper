import {
  summarizeDamageDistribution,
  type DamageDistributionSummary,
  type RandomMultiplierInferenceOptions,
} from "./randomMultiplierInference.js";
import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "./types.js";

export interface EffectivePursuitDamageOptions extends RandomMultiplierInferenceOptions {
  /** Defaults to the protagonist element when available. */
  elementCode?: string;
  /** Selects one pursuit explicitly when a deck contains more than one. */
  sourceSkillId?: string;
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
  effectivePursuitPercentage: number;
  nominalPursuitDamage: number;
  damageDistribution: DamageDistributionSummary;
  issues: EffectivePursuitDamageIssue[];
}

function selectPursuitEffect(
  deck: DeckSnapshot,
  options: EffectivePursuitDamageOptions,
): EffectiveWeaponSkillEffect {
  const elementCode = options.elementCode ?? deck.protagonist.elementCode;
  const matches = (deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      effect.kind === "elemental-pursuit" &&
      (elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode) &&
      (options.sourceSkillId === undefined || effect.sourceSkillId === options.sourceSkillId),
  );
  if (matches.length !== 1) {
    const selector = options.sourceSkillId === undefined ? "" : ` for skill ${options.sourceSkillId}`;
    throw new Error(`expected exactly one effective pursuit effect${selector}, found ${matches.length}`);
  }
  return matches[0];
}

/**
 * Calculates 101 pursuit-damage patterns by default from a resolved effective
 * pursuit percentage and an externally supplied pre-pursuit base damage.
 */
export function calculateEffectivePursuitDamage(
  deck: DeckSnapshot,
  baseDamage: number,
  options: EffectivePursuitDamageOptions = {},
): EffectivePursuitDamageResult {
  if (!Number.isFinite(baseDamage) || baseDamage < 0) {
    throw new Error("baseDamage must be a finite non-negative number");
  }
  const pursuitEffect = selectPursuitEffect(deck, options);
  const effectivePursuitPercentage = pursuitEffect.effectiveAmountPercent;
  const nominalPursuitDamage =
    Math.round(((baseDamage * effectivePursuitPercentage) / 100) * 1_000_000) / 1_000_000;
  const damageDistribution = summarizeDamageDistribution(nominalPursuitDamage, {
    multiplierMin: options.multiplierMin,
    multiplierMax: options.multiplierMax,
    multiplierStep: options.multiplierStep,
    nominalPreparation: options.nominalPreparation ?? "floor",
    finalRounding: options.finalRounding ?? "ceil",
  });
  const issues: EffectivePursuitDamageIssue[] = [];
  if (
    pursuitEffect.verificationStatus !== "検証済み" ||
    pursuitEffect.appliedModifiers.some((modifier) => modifier.verificationStatus !== "検証済み")
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
    effectivePursuitPercentage,
    nominalPursuitDamage,
    damageDistribution,
    issues,
  };
}
