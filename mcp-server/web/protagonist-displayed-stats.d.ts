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
export const PROTAGONIST_LIMIT_BONUS_VALUES: Readonly<{ attack: readonly number[]; hp: readonly number[] }>;
export function calculateProtagonistRankBaseStats(rank: number): {
  rank: number;
  attack: number;
  hp: number;
  verificationStatus: "下書き";
};
export function calculateProtagonistDisplayedStats(
  input: ProtagonistDisplayedStatsInput,
): ProtagonistDisplayedStatsResult;
