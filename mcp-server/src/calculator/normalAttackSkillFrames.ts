import type { DeckSnapshot, WeaponSkillEffectKind } from "./types.js";
import { resolveBattleDamageEffects, type BattleDamageEffects } from "./battleDamageEffects.js";

/** Keep normal-only effects out of ability/charge calculations. Numeric caps are provisional. */
export function calculateNormalAttackSkillFrames(deck: DeckSnapshot) {
  const matching = (kind: WeaponSkillEffectKind) => (deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) => effect.kind === kind && (effect.elementCode === undefined || effect.elementCode === deck.protagonist.elementCode),
  );
  const rate = (kind: WeaponSkillEffectKind, cap: number) => {
    const contributions = matching(kind);
    const rawPercent = contributions.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0);
    return { contributions, rawPercent, effectivePercent: Math.min(cap, rawPercent), capPercent: cap };
  };
  const flat = (kind: WeaponSkillEffectKind, cap: number) => {
    const contributions = matching(kind);
    const rawAmount = contributions.reduce((sum, effect) => sum + (effect.effectiveAmountFlat ?? 0), 0);
    return { contributions, rawAmount, effectiveAmount: Math.min(cap, rawAmount), capAmount: cap };
  };
  return {
    defenseIgnore: rate("enemy-defense-ignore", 30),
    damageCap: rate("normal-only-damage-cap-up", 20),
    damageAmplification: rate("normal-only-damage-dealt-up", 30),
    specialDamageAmplification: rate("special-normal-damage-dealt-up", 20),
    elementalSuperiority: rate("elemental-superiority-damage-up", 30),
    supplementalDamage: flat("normal-supplemental-damage", 100_000),
    separateSupplementalDamage: flat("separate-normal-supplemental-damage", 100_000),
  };
}

export function effectiveEnemyDefense(deck: DeckSnapshot, defense: number, effects?: BattleDamageEffects) {
  const frame = calculateNormalAttackSkillFrames(deck).defenseIgnore;
  const debuffs = resolveBattleDamageEffects(effects);
  const defenseAfterDebuffs = defense * (1 - debuffs.totalDefenseDownPercent / 100);
  return { originalDefense: defense, defenseAfterDebuffs, defenseDownPercent: debuffs.totalDefenseDownPercent,
    effectiveDefense: defenseAfterDebuffs * (1 - frame.effectivePercent / 100), ...frame };
}
