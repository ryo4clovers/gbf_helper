export interface EquipmentLevelStatPoint {
  level: number;
  attack: number;
  hp: number;
}

export interface EquipmentLevelStatProgression {
  maximumLevel: number;
  points: EquipmentLevelStatPoint[];
}

export interface EquipmentPlusBonus {
  attack: number;
  hp: number;
}

export function calculateEquipmentLevelStats(
  progression: EquipmentLevelStatProgression,
  level: number,
  plusMark?: number,
  plusBonus?: EquipmentPlusBonus,
): { attack: number; hp: number };

export function calculateEquipmentSelectionDefaultStats(
  selectionDefaults: { level?: number; attack?: number; hp?: number } | undefined,
  level: number | undefined,
  plusMark?: number,
  plusBonus?: EquipmentPlusBonus,
): { attack: number; hp: number } | undefined;
