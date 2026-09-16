export interface ProtagonistDisplayedStatEquipment {
  attack: number;
  hp: number;
  weaponKindCode?: string;
}

export interface ProtagonistDisplayedStatsInput {
  rank: number;
  jobGrowthAttack: number;
  jobGrowthHp: number;
  attackLimitBonusLevel?: number;
  hpLimitBonusLevel?: number;
  completionAttackPercent: number;
  completionHpPercent: number;
  mainWeaponCompletionAttack: number;
  jobWeaponKindCodes: string[];
  weapons: ProtagonistDisplayedStatEquipment[];
  summons: Array<{ attack: number; hp: number }>;
}

export interface ProtagonistDisplayedStatsResult {
  schemaVersion: 1;
  source: "derived";
  attack: number;
  hp: number;
  breakdown: {
    rankAttack: number;
    rankHp: number;
    limitBonusAttack: number;
    limitBonusHp: number;
    jobGrowthAttack: number;
    jobGrowthHp: number;
    weaponAttack: number;
    weaponHp: number;
    proficiencyAttack: number;
    proficiencyHp: number;
    mainWeaponCompletionAttack: number;
    summonAttack: number;
    summonHp: number;
    attackSubtotal: number;
    hpSubtotal: number;
    completionAttackPercent: number;
    completionHpPercent: number;
  };
}

export const MAX_SUPPORTED_PLAYER_RANK: 425;
export const PROTAGONIST_LIMIT_BONUS_VALUES: Readonly<{
  attack: readonly number[];
  hp: readonly number[];
  fireAttack: readonly number[];
  elementAttack: readonly number[];
}>;
export type ProtagonistElementAttackLimitBonusFieldKey =
  | "fireAttackLimitBonusLevel" | "fireAttackLimitBonus2Level" | "fireAttackLimitBonus3Level"
  | "waterAttackLimitBonusLevel" | "waterAttackLimitBonus2Level" | "waterAttackLimitBonus3Level"
  | "earthAttackLimitBonusLevel" | "earthAttackLimitBonus2Level" | "earthAttackLimitBonus3Level"
  | "windAttackLimitBonusLevel" | "windAttackLimitBonus2Level" | "windAttackLimitBonus3Level"
  | "lightAttackLimitBonusLevel" | "lightAttackLimitBonus2Level" | "lightAttackLimitBonus3Level"
  | "darkAttackLimitBonusLevel" | "darkAttackLimitBonus2Level" | "darkAttackLimitBonus3Level";
export const PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS: ReadonlyArray<Readonly<{
  elementCode: "1" | "2" | "3" | "4" | "5" | "6";
  elementName: "火" | "水" | "土" | "風" | "光" | "闇";
  fieldKey: ProtagonistElementAttackLimitBonusFieldKey;
  label: string;
  sourceName: string;
  limitBonusId: string;
  sourceId: string;
  verificationStatus: "検証済み" | "下書き";
}>>;
export function calculateProtagonistRankBaseStats(rank: number): {
  rank: number;
  attack: number;
  hp: number;
  verificationStatus: "下書き";
};
export function calculateProtagonistDisplayedStats(
  input: ProtagonistDisplayedStatsInput,
): ProtagonistDisplayedStatsResult;
