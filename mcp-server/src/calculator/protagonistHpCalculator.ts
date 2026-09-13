import type {
  DeckSnapshot,
  EffectiveCharacterHpAura,
  EffectiveWeaponSkillEffect,
} from "./types.js";

export interface ProtagonistHpResult {
  schemaVersion: 1;
  status: "provisional";
  baseHp: number;
  weaponSkillHpPercent: number;
  summonAuraPercent: number;
  hp: number;
  appliedWeaponSkillEffects: EffectiveWeaponSkillEffect[];
  appliedAuras: EffectiveCharacterHpAura[];
  issues: Array<"fractional-rounding-unresolved" | "weapon-skill-hp-baseline-unresolved">;
}

function roundPercentage(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Applies resolved weapon HP skills, then de-duplicated passive summon HP auras. */
export function calculateProtagonistHp(deck: DeckSnapshot): ProtagonistHpResult | undefined {
  const baseHp = deck.protagonist.hp;
  if (baseHp === undefined) return undefined;

  const appliedWeaponSkillEffects = (deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      (effect.kind === "normal-hp-up" || effect.kind === "magna-hp-up") &&
      (effect.elementCode === undefined || effect.elementCode === deck.protagonist.elementCode),
  );
  const weaponSkillHpPercent = roundPercentage(
    appliedWeaponSkillEffects.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0),
  );
  const appliedAuras = deck.effectiveCharacterHpAuras ?? [];
  const summonAuraPercent = roundPercentage(
    appliedAuras.reduce((sum, aura) => sum + aura.amountPercent, 0),
  );
  const weaponSkillAdjustedHpRaw = baseHp * (1 + weaponSkillHpPercent / 100);
  // Two weapon-skill observations with fractional results both match ceil. Character-HP
  // summon auras retain their separately observed floor at the following stage.
  const weaponSkillAdjustedHp = appliedWeaponSkillEffects.length === 0
    ? baseHp
    : Math.ceil(weaponSkillAdjustedHpRaw);
  const unroundedHp = weaponSkillAdjustedHp * (1 + summonAuraPercent / 100);
  const hasFraction = !Number.isInteger(unroundedHp);
  const issues: ProtagonistHpResult["issues"] = [];
  if (hasFraction) issues.push("fractional-rounding-unresolved");
  if (appliedWeaponSkillEffects.length > 0) issues.push("weapon-skill-hp-baseline-unresolved");

  return {
    schemaVersion: 1,
    status: "provisional",
    baseHp,
    weaponSkillHpPercent,
    summonAuraPercent,
    hp: Math.floor(unroundedHp),
    appliedWeaponSkillEffects,
    appliedAuras,
    issues,
  };
}
