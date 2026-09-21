export interface EquipmentUncapRange {
  minimum: number;
  base: number;
  maximum: number;
  reduced: number;
  verificationStatus: "検証済み" | "下書き";
  source: string;
}

export interface EquipmentUncapStage {
  uncapLevel: number;
  maximumLevel: number;
}

export function createEquipmentUncapStages(
  uncaps: EquipmentUncapRange | undefined,
  rarityCode: string,
  progression?: { points: Array<{ level: number }> },
): EquipmentUncapStage[];

export function maximumLevelForUncap(
  stages: EquipmentUncapStage[],
  uncapLevel: number | undefined,
): number | undefined;

export function uncapLabel(uncapLevel: number): string;
