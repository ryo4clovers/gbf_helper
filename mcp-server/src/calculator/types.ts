/**
 * Summon placement in a deck.
 * `grid` is a normal sub-summon slot whose stats count; `sub` is the
 * sub-aura-only slot whose stats do not count. Both can activate sub-only auras.
 */
export type SummonPosition = "main" | "grid" | "sub";

/** @deprecated Use `SummonPosition`; retained for compatibility with existing callers. */
export type EquipmentPosition = SummonPosition;

export interface DeckStats {
  attack?: number;
  hp?: number;
}

export interface DeckSkill {
  sourceKey: "skill1" | "skill2" | "skill3" | "skill4";
  id?: string;
  name?: string;
  description?: string;
  releaseLevel?: number;
  verificationStatus?: "検証済み" | "下書き";
  source?: string;
  confirmedAt?: string;
  effects?: WeaponSkillEffectDefinition[];
}

export type WeaponSkillEffectKind =
  | "normal-attack-up"
  | "normal-stamina-up"
  | "magna-stamina-up"
  | "normal-enmity-up"
  | "normal-hp-up"
  | "magna-hp-up"
  | "critical-rate-up"
  | "double-attack-rate-up"
  | "triple-attack-rate-up"
  | "healing-cap-up"
  | "debuff-resistance-up"
  | "damage-dealt-up"
  | "ability-damage-cap-up"
  | "ability-supplemental-damage"
  | "elemental-pursuit"
  | "normal-skill-boost";

export type HpDependentAttackCurve =
  | { kind: "stamina"; coefficient: number }
  | { kind: "enmity" };

export interface WeaponSkillEffectDefinition {
  kind: WeaponSkillEffectKind;
  elementCode?: string;
  /** Percentage effects use this field; fixed per-hit effects use amountFlat. */
  amountPercent?: number;
  amountFlat?: number;
  skillLevel?: number;
  boostGroup?: "normal" | "magna";
  targetSkillNamePrefixes?: string[];
  /** Converts the table's reference amount into an amount at the configured current HP. */
  hpDependentCurve?: HpDependentAttackCurve;
  note?: string;
  /** Verification is recorded per numeric effect, so one skill may mix confirmed and provisional levels. */
  verificationStatus?: "検証済み" | "下書き";
  source?: string;
  confirmedAt?: string;
}

export interface WeaponMasterCatalogEntry {
  weaponId: string;
  name: string;
  nameEn?: string;
  elementCode: string;
  weaponKindCode: string;
  rarityCode: string;
  seriesId?: string;
  selectionDefaults?: {
    level?: number;
    uncapLevel?: number;
    skillLevel?: number;
    attack?: number;
    hp?: number;
  };
  levelStats?: {
    maximumLevel: number;
    points: Array<{ level: number; attack: number; hp: number }>;
  };
  skillSlots: Array<{
    sourceKey: DeckSkill["sourceKey"];
    skillId: string;
  }>;
  /** Wiki-listed names/descriptions whose game skill_id and numeric effects are not verified yet. */
  listedSkills?: Array<{
    sourceKey: DeckSkill["sourceKey"];
    name: string;
    description: string;
  }>;
  verificationStatus: "検証済み" | "下書き";
  source: string;
  confirmedAt?: string;
}

export interface WeaponSkillCatalogEntry {
  skillId: string;
  name: string;
  description: string;
  effects: WeaponSkillEffectDefinition[];
  /** Skill components intentionally left out of calculation until their numeric rules are known. */
  unsupportedEffects?: string[];
  verificationStatus: "検証済み" | "下書き";
  source: string;
  confirmedAt?: string;
}

export type SummonAuraEffectKind =
  | "elemental-attack-up"
  | "normal-skill-boost"
  | "character-attack-up"
  | "character-hp-up"
  | "character-hp-flat"
  | "utility";

export type SummonAuraEffectDefinition =
  | {
      kind: "elemental-attack-up";
      elementCode: string;
      amountPercent: number;
      activation: "always" | "main-only" | "sub-only";
      description: string;
    }
  | {
      kind: "normal-skill-boost";
      elementCode: string;
      amountPercent: number;
      /** Defaults to normal for backward compatibility with existing primal auras. */
      boostGroup?: "normal" | "magna";
      targetSkillNamePrefixes: string[];
      activation: "always" | "main-only" | "sub-only";
      description: string;
    }
  | {
      kind: "character-attack-up";
      elementCode: string;
      amountPercent: number;
      activation: "always" | "main-only" | "sub-only";
      description: string;
    }
  | {
      kind: "character-hp-up";
      elementCode: string;
      amountPercent: number;
      activation: "always" | "main-only" | "sub-only";
      /** Effects with the same element and stacking group keep only the strongest source. */
      stackingGroup: string;
      description: string;
    }
  | {
      kind: "character-hp-flat";
      /** Element code 0 applies to every element. */
      elementCode: string;
      amount: number;
      activation: "always" | "main-only" | "sub-only";
      description: string;
    }
  | {
      kind: "utility";
      description: string;
    };

export interface EffectiveCharacterHpAura {
  kind: "character-hp-up";
  elementCode: string;
  amountPercent: number;
  stackingGroup: string;
  sourceSummonSlot: number;
  sourcePosition: "main" | "sub";
  sourceSummonId: string;
  sourceSummonName?: string;
  sourceAuraName: string;
  verificationStatus: "検証済み" | "下書き";
}

export interface EffectiveCharacterHpFlatAura {
  kind: "character-hp-flat";
  elementCode: string;
  amount: number;
  sourceSummonSlot: number;
  sourcePosition: "main" | "sub";
  sourceSummonId: string;
  sourceSummonName?: string;
  sourceAuraName: string;
  verificationStatus: "検証済み" | "下書き";
}

export interface SummonMasterCatalogEntry {
  summonId: string;
  name: string;
  elementCode: string;
  rarityCode: string;
  auraName: string;
  auraDescription: string;
  auraEffects: SummonAuraEffectDefinition[];
  /** Exact uncap states that differ from the catalog's default selectable state. */
  auraOverrides?: Array<{
    uncapLevel: number;
    auraDescription: string;
    auraEffects: SummonAuraEffectDefinition[];
    verificationStatus: "検証済み" | "下書き";
    source: string;
    confirmedAt?: string;
  }>;
  verificationStatus: "検証済み" | "下書き";
  source: string;
  confirmedAt?: string;
  /** Whether this summon may be chosen in the pre-quest support summon slot. */
  supportSelectable: boolean;
  levelStats?: {
    maximumLevel: number;
    points: Array<{ level: number; uncapLevel: number; attack: number; hp: number }>;
  };
  selectionDefaults?: {
    level: number;
    uncapLevel: number;
    plusMark: number;
    attack: number;
    hp: number;
  };
}

export interface DeckSummonAura {
  name: string;
  description: string;
  effects: SummonAuraEffectDefinition[];
  verificationStatus: "検証済み" | "下書き";
  source: string;
  confirmedAt?: string;
}

export type AppliedWeaponSkillModifier =
  | {
      kind: "normal-skill-boost";
      sourceType: "weapon-skill";
      sourceWeaponSlot: number;
      sourceSkillId: string;
      sourceSkillName: string;
      amountPercent: number;
      verificationStatus: "検証済み" | "下書き";
    }
  | {
      kind: "normal-skill-boost";
      sourceType: "summon-aura";
      sourceSummonSlot: number;
      sourcePosition: "main" | "sub" | "support";
      sourceSummonId: string;
      sourceSummonName?: string;
      sourceAuraName: string;
      amountPercent: number;
      verificationStatus: "検証済み" | "下書き";
    };

export interface EffectiveWeaponSkillEffect {
  sourceWeaponSlot: number;
  sourceWeaponId: string;
  sourceSkillId: string;
  sourceSkillName: string;
  kind: WeaponSkillEffectKind;
  elementCode?: string;
  baseAmountPercent: number;
  effectiveAmountPercent: number;
  baseAmountFlat?: number;
  effectiveAmountFlat?: number;
  hpDependentCurve?: HpDependentAttackCurve;
  skillLevel?: number;
  verificationStatus: "検証済み" | "下書き";
  appliedModifiers: AppliedWeaponSkillModifier[];
}

export interface DeckAwakening {
  level?: number;
  formCode?: string;
}

export type DamageModifierStage =
  | "elemental-attack"
  | "character-attack"
  | "crew-ship"
  | "crew-furnace"
  | "normal-attack-damage"
  | "damage-dealt"
  | "target-element-damage"
  | "damage-cap"
  | "normal-attack-damage-cap";

/** A normalized percentage modifier whose calculation frame remains explicit. */
export interface DamageModifier {
  stage: DamageModifierStage;
  amountPercent: number;
  sourceType:
    | "account-item"
    | "job-master-bonus"
    | "job-limit-bonus"
    | "main-summon"
    | "sub-summon"
    | "support-summon"
    | "user-input"
    | "formula";
  sourceId: string;
  sourceName: string;
  /** Character element required by the modifier; omitted for all-element effects. */
  elementCode?: string;
  /** Enemy element required by target-specific damage effects. */
  targetElementCode?: string;
  condition?: "non-class-v";
  verificationStatus: "検証済み" | "下書き";
}

export interface AccountBonusSnapshot {
  schemaVersion: 1;
  modifiers: DamageModifier[];
  issues: string[];
}

export interface CrewDamageModifierInput {
  /** Separate multiplicative crew-airship stage. */
  shipAttackPercent?: number;
  /** Separate multiplicative crew-furnace/support stage. */
  furnaceAttackPercent?: number;
}

export interface DeckWeapon extends DeckStats {
  slot: number;
  position: "main" | "grid";
  /** Present for imported game snapshots; omitted for user-authored configurations. */
  instanceId?: string;
  /** The game-generated weapon used for stats while the visible main slot is empty. */
  isJobFallback?: boolean;
  masterId: string;
  name?: string;
  elementCode?: string;
  weaponKindCode?: string;
  rarityCode?: string;
  seriesId?: string;
  level?: number;
  skillLevel?: number;
  uncapLevel?: number;
  plusMark?: number;
  awakening?: DeckAwakening;
  bonusAttack?: number;
  bonusHp?: number;
  skills: DeckSkill[];
}

export interface DeckSummon extends DeckStats {
  slot: number;
  position: SummonPosition;
  /** Present for imported game snapshots; omitted for user-authored configurations. */
  instanceId?: string;
  masterId: string;
  name?: string;
  elementCode?: string;
  rarityCode?: string;
  level?: number;
  uncapLevel?: number;
  plusMark?: number;
  aura?: DeckSummonAura;
}

export interface DeckCharacter extends DeckStats {
  slot: number;
  position: "front" | "back";
  /** Present for imported game snapshots; omitted for user-authored configurations. */
  instanceId?: string;
  masterId: string;
  name?: string;
  elementCode?: string;
  rarityCode?: string;
  level?: number;
  uncapLevel?: number;
  plusMark?: number;
}

export interface DeckJob {
  masterId: string;
  name?: string;
  classCode?: string;
  typeCode?: string;
  weaponKindCodes: string[];
  baseDoubleAttackRate?: number;
  baseTripleAttackRate?: number;
  jobCompletionDoubleAttackRate?: number;
  jobCompletionTripleAttackRate?: number;
  /** Account-wide completed-job attack bonus, despite being nested under the equipped job response. */
  masterBonusAttackPercent?: number;
  /** Account-wide completed-job HP bonus, despite being nested under the equipped job response. */
  masterBonusHpPercent?: number;
  multiattackRateBonuses?: DeckJobMultiattackRateBonus[];
  criticalRateBonuses?: DeckJobCriticalRateBonus[];
  level?: number;
  masterLevel?: number;
  perfectionProofLevel?: number;
  damageModifiers?: DamageModifier[];
}

export interface DeckJobMultiattackRateBonus {
  sourceType: "job-level" | "master-level" | "perfection-proof" | "job-limit-bonus";
  sourceName?: string;
  level: number;
  doubleAttackRatePercent: number;
  tripleAttackRatePercent: number;
  verificationStatus: "検証済み" | "下書き";
}

export interface DeckJobCriticalRateBonus {
  sourceId: string;
  sourceName: string;
  level: number;
  triggerRatePercent: number;
  damageBonusPercent: number;
  verificationStatus: "検証済み" | "下書き";
}

export interface Protagonist extends DeckStats {
  elementCode?: string;
  job?: DeckJob;
  memorialDoubleAttackRatePercent?: number;
  memorialTripleAttackRatePercent?: number;
}

export interface DeckDisplayedEffectValue {
  index: number;
  icon?: string;
  /** Original UI-formatted value, such as `5.85％`. */
  valueText?: string;
  /** Parsed only when `valueText` is a percentage; 5.85 means 5.85%. */
  percentage?: number;
  isMax?: boolean;
}

export interface DeckWeaponSkillEnhancement {
  normal?: number;
  magna?: number;
  evil?: number;
}

/** Game UI estimates included in `deck.damage_info`; not authoritative combat results. */
export interface DeckDisplayedDamageInfo {
  assumedAdvantageElementCode?: string;
  assumedNormalElementCode?: string;
  assumedAdvantageDamage?: number;
  assumedNormalDamage?: number;
  hp?: number;
  effectValues: DeckDisplayedEffectValue[];
  weaponSkillEnhancement?: DeckWeaponSkillEnhancement;
}

export interface DeckSnapshot {
  schemaVersion: 1;
  name?: string;
  groupName?: string;
  orderNo?: number;
  priority?: number;
  protagonist: Protagonist;
  characters: DeckCharacter[];
  weapons: DeckWeapon[];
  summons: DeckSummon[];
  displayedDamageInfo?: DeckDisplayedDamageInfo;
  effectiveWeaponSkillEffects?: EffectiveWeaponSkillEffect[];
  effectiveCharacterHpAuras?: EffectiveCharacterHpAura[];
  effectiveCharacterHpFlatAuras?: EffectiveCharacterHpFlatAura[];
}

export interface CalculatorDeckProtagonistConfig {
  attackLimitBonusLevel?: number;
  hpLimitBonusLevel?: number;
  partyHpLimitBonusLevel?: number;
  partyHpLimitBonus2Level?: number;
  partyHpLimitBonus3Level?: number;
  criticalRateLimitBonusLevel?: number;
  criticalRateLimitBonus2Level?: number;
  criticalRateLimitBonus3Level?: number;
  doubleAttackRateLimitBonusLevel?: number;
  doubleAttackRateLimitBonus2Level?: number;
  doubleAttackRateLimitBonus3Level?: number;
  tripleAttackRateLimitBonusLevel?: number;
  tripleAttackRateLimitBonus2Level?: number;
  proficiency1AttackLimitBonusLevel?: number;
  proficiency2AttackLimitBonusLevel?: number;
  proficiency1AttackLimitBonus2Level?: number;
  proficiency2AttackLimitBonus2Level?: number;
  proficiency1AttackLimitBonus3Level?: number;
  proficiency2AttackLimitBonus3Level?: number;
  proficiencyBothAttackLimitBonusLevel?: number;
  proficiencyBothAttackLimitBonus2Level?: number;
  fireAttackLimitBonusLevel?: number;
  fireAttackLimitBonus2Level?: number;
  fireAttackLimitBonus3Level?: number;
  waterAttackLimitBonusLevel?: number;
  waterAttackLimitBonus2Level?: number;
  waterAttackLimitBonus3Level?: number;
  earthAttackLimitBonusLevel?: number;
  earthAttackLimitBonus2Level?: number;
  earthAttackLimitBonus3Level?: number;
  windAttackLimitBonusLevel?: number;
  windAttackLimitBonus2Level?: number;
  windAttackLimitBonus3Level?: number;
  lightAttackLimitBonusLevel?: number;
  lightAttackLimitBonus2Level?: number;
  lightAttackLimitBonus3Level?: number;
  darkAttackLimitBonusLevel?: number;
  darkAttackLimitBonus2Level?: number;
  darkAttackLimitBonus3Level?: number;
  rank?: number;
  elementCode?: string;
  jobId?: string;
  jobNameHint?: string;
  jobLevel?: number;
  masterLevel?: number;
  perfectionProofLevel?: number;
  baseDoubleAttackRate?: number;
  baseTripleAttackRate?: number;
  jobCompletionDoubleAttackRate?: number;
  jobCompletionTripleAttackRate?: number;
  masterBonusAttackPercent?: number;
  masterBonusHpPercent?: number;
  completedJobIds?: string[];
  mainWeaponCompletionAttackContribution?: number;
  jobGrowthAttackContribution?: number;
  jobGrowthHpContribution?: number;
  attackOverride?: number;
  hpOverride?: number;
  memorialItems?: {
    includeExtinctionCrestInLocalResults: boolean;
    items: Record<string, { enabled: boolean; level?: number; amountPercent?: number }>;
  };
  crewSupport?: {
    airshipEnabled: boolean;
    rainbowFurnaceEnabled: boolean;
    copperGongEnabled: boolean;
    potionMakerEnabled: boolean;
  };
}

export interface CalculatorDeckWeaponConfig {
  slot: number;
  position: "main" | "grid";
  weaponId: string;
  /** Keeps a game-generated main weapon in calculations without presenting it as equipped. */
  isJobFallback?: boolean;
  nameHint?: string;
  level?: number;
  skillLevel?: number;
  uncapLevel?: number;
  plusMark?: number;
  awakening?: DeckAwakening;
  attackOverride?: number;
  hpOverride?: number;
}

export interface CalculatorDeckSummonConfig {
  slot: number;
  position: SummonPosition;
  summonId: string;
  nameHint?: string;
  level?: number;
  uncapLevel?: number;
  plusMark?: number;
  attackOverride?: number;
  hpOverride?: number;
}

export interface CalculatorDeckCharacterConfig {
  slot: number;
  position: "front" | "back";
  characterId: string;
  nameHint?: string;
  level?: number;
  uncapLevel?: number;
  plusMark?: number;
  attackOverride?: number;
  hpOverride?: number;
}

/** Stable, user-editable calculator input. It never contains game instance/account IDs. */
export interface CalculatorDeckConfig {
  schemaVersion: 1;
  format: "gbf-helper-calculator-deck";
  name?: string;
  protagonist: CalculatorDeckProtagonistConfig;
  weapons: CalculatorDeckWeaponConfig[];
  summons: CalculatorDeckSummonConfig[];
  characters: CalculatorDeckCharacterConfig[];
}

export interface EnemyTarget {
  slot: number;
  enemyId: string;
  nameJp?: string;
  nameEn?: string;
  level?: number;
  elementCode?: string;
  elementName?: string;
  currentHp?: number;
  maxHp?: number;
  alive?: boolean;
  chargeDiamonds?: number;
  maxChargeDiamonds?: number;
  hasModeGauge?: boolean;
  modeGauge?: number;
  /** `start.json` does not necessarily expose this; resolve it separately. */
  defense?: number;
  defenseSource?: "response" | "user-override";
}

export interface BattleSnapshot {
  schemaVersion: 1;
  questId?: string;
  turn?: number;
  isMultiBattle?: boolean;
  isTrialBattle?: boolean;
  waveCount?: number;
  currentWave?: number;
  enemies: EnemyTarget[];
  enemyPassiveEffectCount: number;
  fieldEffectCount: number;
  supportSummon?: BattleSupportSummon;
}

export interface BattleSupportSummon {
  masterId?: string;
  name?: string;
  elementCode?: string;
  auraName?: string;
  auraDescription?: string;
  isFriend?: boolean;
}

export interface ResolvedSupportSummon {
  masterId: string;
  name: string;
  elementCode: string;
  aura: DeckSummonAura;
}

export interface DamageCalculationInput {
  schemaVersion: 1;
  deck: DeckSnapshot;
  battle: BattleSnapshot;
  targetEnemySlot: number;
  /** Current protagonist HP as a percentage of maximum HP. Defaults to 100. */
  protagonistCurrentHpPercent?: number;
  accountBonuses?: AccountBonusSnapshot;
  crewModifiers?: CrewDamageModifierInput;
}

export type BattleActionKind =
  | "ability"
  | "charge-attack"
  | "mixed-attack"
  | "normal-attack"
  | "recovery-item"
  | "summon"
  | "unknown";

export interface ObservedDamage {
  sequence: number;
  sourceCommand: "attack" | "chain-burst" | "damage" | "loop-damage" | "special" | "summon";
  sourcePosition?: number;
  sourceName?: string;
  targetPosition?: number;
  elementCode?: string;
  value: number;
  remainingHp?: number;
  critical?: boolean;
  missed?: boolean;
  guarded?: boolean;
  /** Zero-based damage packet index reported as `attack_num`/`attack_count`. */
  hitIndex?: number;
  /** Zero-based simultaneous component index within one normal-attack swing. */
  concurrentIndex?: number;
  /** Number of normal-attack swings reported for this attacker (1=single, 2=double, 3=triple). */
  normalAttackCount?: number;
  /** Whether the packet belongs to the response's random-target attack mode. */
  randomAttack?: boolean;
}

export interface ObservedEnemyGauge {
  sequence: number;
  position?: number;
  hp?: number;
  elementCode?: string;
  chargeDiamonds?: number;
  maxChargeDiamonds?: number;
}

export interface ObservedStatusEffect {
  kind: "buff" | "debuff";
  statusId: string;
  baseId: string;
  parameters: string[];
  displayPriority?: number;
}

export interface ObservedConditionEvent {
  sequence: number;
  target?: string;
  targetPosition?: number;
  snapshotIndex?: number;
  effects: ObservedStatusEffect[];
}

export interface ObservedResourceEvent {
  sequence: number;
  kind: "chain-burst-gauge" | "charge-diamonds" | "charge-gauge" | "unknown";
  target?: string;
  targetPosition?: number;
  value?: number;
  maxValue?: number;
}

export interface ObservedRecoveryEvent {
  sequence: number;
  sourceCommand: "rematch";
  itemCount?: number;
  itemLimitRemaining?: number;
}

export interface ObservedHealing {
  sequence: number;
  target?: string;
  targetPosition?: number;
  value: number;
  resultingHp?: number;
  sourceKind?: string;
}

export interface ObservedChainBurst {
  sequence: number;
  memberCount?: number;
  name?: string;
  effectKind?: string;
  damageSequence?: number;
  totalDamage?: number;
}

export interface BattleActionResult {
  schemaVersion: 1;
  actionKind: BattleActionKind;
  actionName?: string;
  turn?: number;
  commands: string[];
  damage: ObservedDamage[];
  totalDamage: number;
  enemyGaugeEvents: ObservedEnemyGauge[];
  conditionEvents: ObservedConditionEvent[];
  resourceEvents: ObservedResourceEvent[];
  recoveryEvents: ObservedRecoveryEvent[];
  healing: ObservedHealing[];
  chainBursts: ObservedChainBurst[];
  enemyPassiveEffectCount: number;
}
