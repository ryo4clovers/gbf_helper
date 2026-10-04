/** Flat awakening stats belong to equipment stats, never the weapon-skill multiplier. */
export function weaponAwakeningStatBonus(weapon, options) {
  const selection = weapon.awakening;
  const type = options?.types.find(type => type.formCode === selection?.formCode || type.gameFormCodes?.includes(selection?.formCode));
  if (!type || !Number.isInteger(selection?.level) || selection.level < 1 || selection.level > options.maximumLevel
    || (weapon.level ?? 0) < options.minimumWeaponLevel
    || (weapon.uncapLevel !== undefined && weapon.uncapLevel < options.minimumUncapLevel)) return { attack: 0, hp: 0 };
  return (type.statBonuses ?? []).filter(bonus => bonus.level <= selection.level)
    .reduce((sum, bonus) => ({ attack: sum.attack + (bonus.attack ?? 0), hp: sum.hp + (bonus.hp ?? 0) }), { attack: 0, hp: 0 });
}
