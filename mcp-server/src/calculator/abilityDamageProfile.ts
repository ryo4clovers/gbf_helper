import {
  type DamageAttenuationProfile,
  validateDamageAttenuationProfile,
} from "./damageAttenuationCalculator.js";

export type AbilityDamageVerificationStatus = "検証済み" | "下書き" | "未着手";

export type AbilityDamageCondition =
  | { type: "always" }
  | { type: "enemy-mode"; mode: "normal" | "overdrive" | "break" }
  | { type: "companion-weapon"; equipped: boolean }
  | { type: "all"; conditions: readonly AbilityDamageCondition[] };

export type AbilityDamageAttenuation =
  | { status: "unresolved" }
  | { status: "resolved"; profile: DamageAttenuationProfile };

export interface AbilityDamageVariant {
  id: string;
  condition: AbilityDamageCondition;
  /** A fixed multiplier uses the same value for min and max. */
  multiplier: { min: number; max: number };
  /** Each hit evaluates attenuation independently. */
  hitCount: number;
  attenuation: AbilityDamageAttenuation;
  verificationStatus: AbilityDamageVerificationStatus;
  source: string;
  confirmedAt?: string;
  notes?: string;
}

/** JSON-friendly, versioned input format for an individual damage ability. */
export interface AbilityDamageProfile {
  schemaVersion: 1;
  abilityId: string;
  name: string;
  element: "own" | "weakness";
  targeting: "single" | "all" | "random";
  variants: readonly AbilityDamageVariant[];
}

export interface AbilityDamageContext {
  enemyMode?: "normal" | "overdrive" | "break";
  companionWeaponEquipped?: boolean;
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim() === "") throw new Error(`${label} must not be empty`);
}

function conditionMatches(condition: AbilityDamageCondition, context: AbilityDamageContext): boolean {
  if (condition.type === "always") return true;
  if (condition.type === "enemy-mode") return context.enemyMode === condition.mode;
  if (condition.type === "companion-weapon") {
    return context.companionWeaponEquipped === condition.equipped;
  }
  return condition.conditions.every((child) => conditionMatches(child, context));
}

function validateCondition(condition: AbilityDamageCondition, label: string, nested = false): void {
  if (nested && condition.type === "always") {
    throw new Error(`${label} must not contain an always condition`);
  }
  if (condition.type !== "all") return;
  if (condition.conditions.length === 0) throw new Error(`${label}.conditions must not be empty`);
  condition.conditions.forEach((child, index) =>
    validateCondition(child, `${label}.conditions[${index}]`, true),
  );
}

export function validateAbilityDamageProfile(profile: AbilityDamageProfile): void {
  if (profile.schemaVersion !== 1) throw new Error("profile.schemaVersion must be 1");
  assertNonEmpty(profile.abilityId, "profile.abilityId");
  assertNonEmpty(profile.name, "profile.name");
  if (profile.variants.length === 0) throw new Error("profile.variants must not be empty");

  const variantIds = new Set<string>();
  let fallbackCount = 0;
  profile.variants.forEach((variant, index) => {
    assertNonEmpty(variant.id, `profile.variants[${index}].id`);
    if (variantIds.has(variant.id)) throw new Error(`duplicate variant id: ${variant.id}`);
    variantIds.add(variant.id);
    validateCondition(variant.condition, `profile.variants[${index}].condition`);
    if (variant.condition.type === "always") fallbackCount += 1;
    if (
      !Number.isFinite(variant.multiplier.min) ||
      !Number.isFinite(variant.multiplier.max) ||
      variant.multiplier.min <= 0 ||
      variant.multiplier.max < variant.multiplier.min
    ) {
      throw new Error(`profile.variants[${index}].multiplier must be finite, positive, and ordered`);
    }
    if (!Number.isInteger(variant.hitCount) || variant.hitCount <= 0) {
      throw new Error(`profile.variants[${index}].hitCount must be a positive integer`);
    }
    assertNonEmpty(variant.source, `profile.variants[${index}].source`);
    if (variant.verificationStatus === "検証済み" && !/^\d{4}-\d{2}-\d{2}$/.test(variant.confirmedAt ?? "")) {
      throw new Error(`profile.variants[${index}].confirmedAt is required for verified data`);
    }
    if (variant.attenuation.status === "resolved") {
      validateDamageAttenuationProfile(variant.attenuation.profile);
    }
  });

  if (fallbackCount !== 1) throw new Error("profile.variants must contain exactly one always fallback");
  if (profile.variants.at(-1)?.condition.type !== "always") {
    throw new Error("the always fallback must be the last variant");
  }
}

/** Selects the first matching conditional variant, then the required fallback. */
export function resolveAbilityDamageVariant(
  profile: AbilityDamageProfile,
  context: AbilityDamageContext = {},
): AbilityDamageVariant {
  validateAbilityDamageProfile(profile);
  const variant = profile.variants.find((candidate) => conditionMatches(candidate.condition, context));
  if (variant === undefined) throw new Error("ability damage profile has no matching variant");
  return variant;
}
