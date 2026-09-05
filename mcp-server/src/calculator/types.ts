export type EquipmentPosition = "main" | "grid" | "sub";

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
  | "critical-rate-up"
  | "elemental-pursuit"
  | "normal-skill-boost";

export interface WeaponSkillEffectDefinition {
  kind: WeaponSkillEffectKind;
  elementCode?: string;
  amountPercent: number;
  skillLevel?: number;
  boostGroup?: "normal";
  targetSkillNamePrefixes?: string[];
  note?: string;
}

export interface WeaponMasterCatalogEntry {
  weaponId: string;
  name: string;
  elementCode: string;
  weaponKindCode: string;
  rarityCode: string;
  seriesId?: string;
  skillSlots: Array<{
    sourceKey: DeckSkill["sourceKey"];
    skillId: string;
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
  verificationStatus: "検証済み" | "下書き";
  source: string;
  confirmedAt?: string;
}

export type SummonAuraEffectKind = "elemental-attack-up" | "normal-skill-boost" | "utility";

export type SummonAuraEffectDefinition =
  | {
      kind: "elemental-attack-up";
      elementCode: string;
      amountPercent: number;
      activation: "always" | "main-only";
      description: string;
    }
  | {
      kind: "normal-skill-boost";
      elementCode: string;
      amountPercent: number;
      targetSkillNamePrefixes: string[];
      activation: "always" | "main-only";
      description: string;
    }
  | {
      kind: "utility";
      description: string;
    };

export interface SummonMasterCatalogEntry {
  summonId: string;
  name: string;
  elementCode: string;
  rarityCode: string;
  auraName: string;
  auraDescription: string;
  auraEffects: SummonAuraEffectDefinition[];
  verificationStatus: "検証済み" | "下書き";
  source: string;
  confirmedAt?: string;
}

export interface DeckSummonAura {
  name: string;
  description: string;
  effects: SummonAuraEffectDefinition[];
  verificationStatus: "検証済み" | "下書き";
  source: string;
  confirmedAt?: string;
}

export interface AppliedWeaponSkillModifier {
  kind: "normal-skill-boost";
  sourceWeaponSlot: number;
  sourceSkillId: string;
  sourceSkillName: string;
  amountPercent: number;
  verificationStatus: "検証済み" | "下書き";
}

export interface EffectiveWeaponSkillEffect {
  sourceWeaponSlot: number;
  sourceWeaponId: string;
  sourceSkillId: string;
  sourceSkillName: string;
  kind: WeaponSkillEffectKind;
  elementCode?: string;
  baseAmountPercent: number;
  effectiveAmountPercent: number;
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
    | "main-summon"
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
  position: EquipmentPosition;
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
  level?: number;
  masterLevel?: number;
  perfectionProofLevel?: number;
  damageModifiers?: DamageModifier[];
}

export interface Protagonist extends DeckStats {
  elementCode?: string;
  job?: DeckJob;
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
}

export interface CalculatorDeckProtagonistConfig {
  elementCode?: string;
  jobId?: string;
  jobLevel?: number;
  masterLevel?: number;
  perfectionProofLevel?: number;
  attackOverride?: number;
  hpOverride?: number;
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
  position: EquipmentPosition;
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
