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
  otherHpPercent?: number;
  hpOverskillPercent?: number;
  weaponHpReductionPercent?: number;
  effectiveWeaponHpReductionPercent?: number;
  appliedHpReductionEffects?: EffectiveWeaponSkillEffect[];
  summonHpReductionPercent?: number;
  issues: Array<"fractional-rounding-unresolved" | "weapon-skill-hp-baseline-unresolved" | "hp-reduction-unverified">;
}

function roundPercentage(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Applies resolved weapon HP skills, then de-duplicated passive summon HP auras. */
export function calculateProtagonistHp(deck: DeckSnapshot): ProtagonistHpResult | undefined {
  return calculateCombatHp({
    baseHp: deck.protagonist.hp, elementCode: deck.protagonist.elementCode,
    effects: deck.effectiveWeaponSkillEffects,
    auras: deck.effectiveCharacterHpAuras, flatAuras: deck.effectiveCharacterHpFlatAuras,
  });
}

/** Shared starting-HP stage. Flat LB/awakening/ring stats already belong to baseHp. */
export function calculateCombatHp(input: {
  baseHp?: number; elementCode?: string; effects?: EffectiveWeaponSkillEffect[];
  auras?: EffectiveCharacterHpAura[]; flatAuras?: EffectiveCharacterHpFlatAura[];
  otherHpPercent?: number;
}): ProtagonistHpResult | undefined {
  const baseHp = input.baseHp;
  if (baseHp === undefined) return undefined;

  const appliedWeaponSkillEffects = (input.effects ?? []).filter(
    (effect) =>
      (effect.kind === "normal-hp-up" || effect.kind === "magna-hp-up") &&
      (effect.elementCode === undefined || effect.elementCode === "0" || effect.elementCode === input.elementCode),
  );
  const weaponSkillHpPercent = roundPercentage(
    appliedWeaponSkillEffects.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0),
  );
  const appliedAuras = input.auras ?? [];
  const appliedHpReductionEffects = (input.effects ?? []).filter(effect => effect.kind === "weapon-hp-down"
    && (effect.elementCode === undefined || effect.elementCode === "0" || effect.elementCode === input.elementCode));
  const weaponHpReductionPercent = roundPercentage(appliedHpReductionEffects.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0));
  // Tyranny is a separate, unboostable grid reduction (70% cap); summon cuts are additive with HP boosts.
  const effectiveWeaponHpReductionPercent = Math.min(70, weaponHpReductionPercent);
  const summonHpReductionPercent = roundPercentage(appliedAuras.filter(aura => aura.kind === "character-hp-down")
    .reduce((sum, aura) => sum + aura.amountPercent, 0));
  const appliedFlatAuras = input.flatAuras ?? [];
  const summonAuraPercent = roundPercentage(
    appliedAuras.reduce((sum, aura) => sum + (aura.kind === "character-hp-down" ? -aura.amountPercent : aura.amountPercent), 0),
  );
  // Wiki HP/Overskills (2026-10-05): 400% grid cap, activation at 420%,
  // excess / 20 amplification (maximum 20%). Secondary-source provisional model.
  const hpOverskillPercent = weaponSkillHpPercent >= 420 ? Math.min(20, (weaponSkillHpPercent - 400) / 20) : 0;
  const gridHpPercent = roundPercentage(Math.min(400, weaponSkillHpPercent) * (1 + hpOverskillPercent / 100));
  const otherHpPercent = input.otherHpPercent ?? 0;
  const unroundedHp = baseHp * (100 - effectiveWeaponHpReductionPercent) / 100
    * roundPercentage(100 + gridHpPercent + summonAuraPercent + otherHpPercent) / 100;
  // Weapon HP skills and percentage summon HP auras share one additive stage in the
  // observed mixed setup. The 2026-10-05 summon-only Hades battle also supports
  // ceil: the former floor branch was one HP low in four slots. Earlier summon
  // display observations had integer products and did not distinguish floor/ceil.
  // Keep rounding provisional for other auras and combinations.
  const percentageAdjustedHp = Math.ceil(unroundedHp);
  const hasFraction = !Number.isInteger(unroundedHp);
  const summonAuraFlatHp = appliedFlatAuras.reduce((sum, aura) => sum + aura.amount, 0);
  const issues: ProtagonistHpResult["issues"] = [];
  if (hasFraction) issues.push("fractional-rounding-unresolved");
  if (appliedWeaponSkillEffects.length > 0) issues.push("weapon-skill-hp-baseline-unresolved");
  if (weaponHpReductionPercent > 0 || summonHpReductionPercent > 0) issues.push("hp-reduction-unverified");

  return {
    schemaVersion: 1,
    status: "provisional",
    baseHp,
    weaponSkillHpPercent,
    summonAuraPercent,
    hp: Math.max(1, percentageAdjustedHp) + summonAuraFlatHp,
    appliedWeaponSkillEffects,
    appliedAuras,
    ...(summonAuraFlatHp === 0 ? {} : { summonAuraFlatHp, appliedFlatAuras }),
    ...(otherHpPercent === 0 ? {} : { otherHpPercent }),
    ...(weaponSkillHpPercent <= 400 ? {} : { hpOverskillPercent }),
    ...(weaponHpReductionPercent === 0 ? {} : { weaponHpReductionPercent, effectiveWeaponHpReductionPercent, appliedHpReductionEffects }),
    ...(summonHpReductionPercent === 0 ? {} : { summonHpReductionPercent }),
    issues,
  };
}
