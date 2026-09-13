import type {
  DeckSnapshot,
  EffectiveCharacterHpAura,
  EffectiveCharacterHpFlatAura,
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
  summonAuraFlatHp?: number;
  appliedFlatAuras?: EffectiveCharacterHpFlatAura[];
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
  const appliedFlatAuras = deck.effectiveCharacterHpFlatAuras ?? [];
  const summonAuraPercent = roundPercentage(
    appliedAuras.reduce((sum, aura) => sum + aura.amountPercent, 0),
  );
  const unroundedHp = baseHp * (1 + (weaponSkillHpPercent + summonAuraPercent) / 100);
  // Weapon HP skills and percentage summon HP auras share one additive stage in the
  // observed mixed setup. A weapon-skill fractional result rounds up; summon-only
  // observations retain their separately verified floor.
  const percentageAdjustedHp = appliedWeaponSkillEffects.length === 0
    ? Math.floor(unroundedHp)
    : Math.ceil(unroundedHp);
  const hasFraction = !Number.isInteger(unroundedHp);
  const summonAuraFlatHp = appliedFlatAuras.reduce((sum, aura) => sum + aura.amount, 0);
  const issues: ProtagonistHpResult["issues"] = [];
  if (hasFraction) issues.push("fractional-rounding-unresolved");
  if (appliedWeaponSkillEffects.length > 0) issues.push("weapon-skill-hp-baseline-unresolved");

  return {
    schemaVersion: 1,
    status: "provisional",
    baseHp,
    weaponSkillHpPercent,
    summonAuraPercent,
    hp: percentageAdjustedHp + summonAuraFlatHp,
    appliedWeaponSkillEffects,
    appliedAuras,
    ...(summonAuraFlatHp === 0 ? {} : { summonAuraFlatHp, appliedFlatAuras }),
    issues,
  };
}
