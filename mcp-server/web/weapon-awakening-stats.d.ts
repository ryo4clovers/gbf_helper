export function weaponAwakeningStatBonus(weapon: {
  awakening?: { formCode?: string; level?: number }; level?: number; uncapLevel?: number;
}, options?: {
  minimumWeaponLevel: number; minimumUncapLevel: number; maximumLevel: number;
  types: Array<{ formCode: string; gameFormCodes?: string[]; statBonuses?: Array<{ level: number; attack?: number; hp?: number }> }>;
}): { attack: number; hp: number };
