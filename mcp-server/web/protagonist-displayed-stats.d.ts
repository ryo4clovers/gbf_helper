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
  partyHpLimitBonusLevel?: number;
  partyHpLimitBonus2Level?: number;
  partyHpLimitBonus3Level?: number;
  proficiency1AttackLimitBonusLevel?: number;
  proficiency2AttackLimitBonusLevel?: number;
  proficiency1AttackLimitBonus2Level?: number;
  proficiency2AttackLimitBonus2Level?: number;
  proficiency1AttackLimitBonus3Level?: number;
  proficiency2AttackLimitBonus3Level?: number;
  proficiencyBothAttackLimitBonusLevel?: number;
  proficiencyBothAttackLimitBonus2Level?: number;
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
    partyLimitBonusHp: number;
    jobGrowthAttack: number;
    jobGrowthHp: number;
    weaponAttack: number;
    weaponHp: number;
    proficiencyAttack: number;
    proficiencyHp: number;
    proficiencyLimitBonusAttack: number;
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
  proficiencyAttack: readonly number[];
  multiattack: readonly number[];
  critical: readonly number[];
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
export type ProtagonistProficiencyAttackLimitBonusFieldKey =
  | "proficiency1AttackLimitBonusLevel"
  | "proficiency2AttackLimitBonusLevel"
  | "proficiency1AttackLimitBonus2Level"
  | "proficiency2AttackLimitBonus2Level"
  | "proficiency1AttackLimitBonus3Level"
  | "proficiency2AttackLimitBonus3Level"
  | "proficiencyBothAttackLimitBonusLevel"
  | "proficiencyBothAttackLimitBonus2Level";
export const PROTAGONIST_PROFICIENCY_ATTACK_LIMIT_BONUS_DEFINITIONS: ReadonlyArray<Readonly<{
  fieldKey: ProtagonistProficiencyAttackLimitBonusFieldKey;
  label: string;
  limitBonusId: string;
  target: "first" | "second" | "both";
}>>;
export type ProtagonistMultiattackLimitBonusFieldKey =
  | "doubleAttackRateLimitBonusLevel"
  | "doubleAttackRateLimitBonus2Level"
  | "doubleAttackRateLimitBonus3Level"
  | "tripleAttackRateLimitBonusLevel"
  | "tripleAttackRateLimitBonus2Level";
export const PROTAGONIST_MULTIATTACK_LIMIT_BONUS_DEFINITIONS: ReadonlyArray<Readonly<{
  fieldKey: ProtagonistMultiattackLimitBonusFieldKey;
  label: string;
  limitBonusId: string;
  kind: "double" | "triple";
}>>;
export type ProtagonistPartyHpLimitBonusFieldKey =
  | "partyHpLimitBonusLevel"
  | "partyHpLimitBonus2Level"
  | "partyHpLimitBonus3Level";
export const PROTAGONIST_PARTY_HP_LIMIT_BONUS_DEFINITIONS: ReadonlyArray<Readonly<{
  fieldKey: ProtagonistPartyHpLimitBonusFieldKey;
  label: string;
  limitBonusId: string;
}>>;
export type ProtagonistCriticalLimitBonusFieldKey =
  | "criticalRateLimitBonusLevel"
  | "criticalRateLimitBonus2Level"
  | "criticalRateLimitBonus3Level";
export const PROTAGONIST_CRITICAL_LIMIT_BONUS_DEFINITIONS: ReadonlyArray<Readonly<{
  fieldKey: ProtagonistCriticalLimitBonusFieldKey;
  label: string;
  limitBonusId: string;
  sourceId: string;
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
