import { calculateWeaponOverskills, applyDamageCapPenetration } from "./weaponOverskills.js";
import {
  calculateDefenseAdjustedBaseDamage,
  elementalSuperiorityPercent,
  type BaseDamageCalculationModel,
  type DefenseAdjustedBaseDamageResult,
} from "./baseDamageCalculator.js";
import { calculateArticleBaseDamage } from "./articleBaseDamageCalculator.js";
import { calculateDestructionPursuitRoundingCandidates, type DestructionPursuitRoundingCandidate } from "./destructionPursuitRounding.js";
import {
  calculateBattleNormalAttackPower,
  type NormalAttackPowerResult,
} from "./normalAttackPowerCalculator.js";
import {
  applyNormalAttackHitStages,
  calculateEffectivePursuitDamage,
  type EffectivePursuitDamageResult,
  type PursuitDamageStages,
} from "./pursuitDamageCalculator.js";
import {
  calculateCriticalBodyDamage,
  type CriticalBodyDamageResult,
} from "./criticalBodyDamageCalculator.js";
import {
  summarizeDamageDistribution,
  type DamageDistributionSummary,
  type FinalDamageRounding,
  type NominalDamagePreparation,
} from "./randomMultiplierInference.js";
import {
  calculateIncomingDamagePrediction,
  type IncomingDamagePredictionResult,
} from "./incomingDamageCalculator.js";
import type { DamageCalculationInput } from "./types.js";
import { calculateNormalAttackSkillFrames } from "./normalAttackSkillFrames.js";
import { prepareNormalAttackActor, resolveNormalAttackSupport, selectedCharacter, resolveCharacterArtifact } from "./characterNormalAttack.js";
import { resolveCharacterMastery } from "./characterMastery.js";
import { resolveSummonDamageEffects } from "./summonDamageEffects.js";
import { resolveBattleDamageEffects } from "./battleDamageEffects.js";
import {
  calculateProtagonistMultiattackRates,
  type ProtagonistMultiattackRateResult,
} from "./multiattackRateCalculator.js";
import {
  calculateProtagonistHp,
  type ProtagonistHpResult,
} from "./protagonistHpCalculator.js";
import {
  calculateHpDependentAttack,
  type HpDependentAttackResult,
} from "./hpDependentAttackCalculator.js";
import {
  calculateOtherWeaponSkills,
  type OtherWeaponSkillResult,
} from "./otherWeaponSkillCalculator.js";
import {
  PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES,
  type DamageAttenuationProfile,
} from "./damageAttenuationCalculator.js";
import type {
  DamageModifier,
  DeckJobCriticalRateBonus,
  EffectiveWeaponSkillEffect,
} from "./types.js";
import {
  calculateArmorBreakDamage,
  type AbilityDamagePredictionResult,
} from "./abilityDamageCalculator.js";

export interface NormalAttackDamageOptions {
  baseDamageModel?: BaseDamageCalculationModel;
  multiplierMin?: number;
  multiplierMax?: number;
  multiplierStep?: number;
  bodyNominalPreparation?: NominalDamagePreparation;
  pursuitNominalPreparation?: NominalDamagePreparation;
  finalRounding?: FinalDamageRounding;
  bodyFinalRounding?: FinalDamageRounding;
  pursuitFinalRounding?: FinalDamageRounding;
  pursuitSourceSkillId?: string;
  /** Offline diagnostic only: compare fixed hypotheses without selecting a best-fitting model. */
  compareDestructionPursuitRounding?: boolean;
}

export interface CombinedNormalAttackDistribution {
  schemaVersion: 1;
  model: "independent-discrete-components";
  componentCount: number;
  /** Cartesian product count; patterns themselves are intentionally not materialized. */
  combinationCount: number;
  minimumDamage: number;
  maximumDamage: number;
  expectedDamage: number;
}

export interface NormalAttackBodyAttenuationResult {
  weaponOverskills: ReturnType<typeof calculateWeaponOverskills>;
  schemaVersion: 1;
  profile: DamageAttenuationProfile;
  damageCapUpPercent: number;
  capModifiers: Array<DamageModifier | EffectiveWeaponSkillEffect>;
  normalFrameDamageCapRawPercent: number;
  normalFrameDamageCapPercent: number;
  normalFrameDamageCapContributions: EffectiveWeaponSkillEffect[];
  specialFrameDamageCapRawPercent: number;
  specialFrameDamageCapPercent: number;
  specialFrameDamageCapContributions: EffectiveWeaponSkillEffect[];
  postAttenuationPercent: number;
  enemyDamageTakenAmplificationPercent: number;
  randomTargetHitCount: number;
  supplementalDamagePerHit: number;
  /** Integer parent and per-packet damage-taken rounding (article model). */
  beforePursuitRounding?: "ceil";
  /** Dealt amplification is additive; enemy damage taken amplification is separate. */
  postAttenuationModel: "additive-percent" | "already-applied-provisional";
  verificationStatus: "下書き";
}

export interface ProtagonistLimitBonusCriticalScenario {
  damageBonusPercent: number;
  damageMultiplier: number;
  nominalDamage: number;
  damageDistribution: DamageDistributionSummary;
}

export interface ProtagonistLimitBonusCriticalResult extends ProtagonistLimitBonusCriticalScenario {
  schemaVersion: 1;
  status: "provisional";
  probabilityModel: "independent-per-limit-bonus";
  sources: DeckJobCriticalRateBonus[];
  combinedWithWeaponSkill?: ProtagonistLimitBonusCriticalScenario;
}

export interface NormalAttackDamageResult {
  attacker?: { characterSlot: number; characterId: string; name?: string; verificationStatus: "下書き";
    modelScope: "abilities-unused" | "explicit-battle-effects"; unresolvedInputs: string[] };
  schemaVersion: 1;
  status: "provisional";
  attackPower: NormalAttackPowerResult;
  hpDependentAttack: HpDependentAttackResult;
  baseDamage: DefenseAdjustedBaseDamageResult;
  bodyDamageAttenuation: NormalAttackBodyAttenuationResult;
  bodyDamageDistribution: DamageDistributionSummary;
  normalAttackSkillFrames: ReturnType<typeof calculateNormalAttackSkillFrames>;
  normalAttackSupport: ReturnType<typeof resolveNormalAttackSupport>;
  characterArtifact?: ReturnType<typeof resolveCharacterArtifact>;
  characterMastery?: ReturnType<typeof resolveCharacterMastery>;
  /** Legacy response key, retained for existing protagonist callers. */
  protagonistNormalAttackSupport: ReturnType<typeof resolveNormalAttackSupport>;
  summonDamageEffects: ReturnType<typeof resolveSummonDamageEffects>;
  battleDamageEffects: ReturnType<typeof resolveBattleDamageEffects>;
  guaranteedCriticalBodyDamageDistribution?: DamageDistributionSummary;
  criticalBodyDamage?: CriticalBodyDamageResult;
  protagonistLimitBonusCritical?: ProtagonistLimitBonusCriticalResult;
  abilityPursuitDamage?: { frame: "skill-side-a"; effectivePursuitPercentage: number; stages: PursuitDamageStages; baseDamage: number; damageDistribution: DamageDistributionSummary };
  pursuitDamage?: EffectivePursuitDamageResult;
  destructionPursuitDamage?: EffectivePursuitDamageResult;
  destructionPursuitRoundingCandidates?: DestructionPursuitRoundingCandidate[];
  protagonistHp?: ProtagonistHpResult;
  multiattackRates?: ProtagonistMultiattackRateResult;
  otherWeaponSkills: OtherWeaponSkillResult;
  incomingDamage?: IncomingDamagePredictionResult;
  abilityDamage?: AbilityDamagePredictionResult;
  totalDamageDistribution: CombinedNormalAttackDistribution;
  issues: Array<
    | "damage-attenuation-profile-provisional"
    | "rounding-order-unresolved"
    | "independent-component-randomness-provisional"
    | "critical-probability-unresolved"
    | "critical-damage-attenuation-unresolved"
    | "supplemental-damage-enemy-hp-cap-unresolved"
    | "destruction-base-rounding-provisional"
    | "flurry-base-rounding-provisional"
    | "flurry-pursuit-rounding-provisional"
  >;
}

function usesArticleBaseDamageModel(model: BaseDamageCalculationModel): boolean {
  return model === "article-2026-07" || model === "article-2026-07-experimental";
}

function hasSelectedPursuit(input: DamageCalculationInput, sourceSkillId: string | undefined): boolean {
  const elementCode = input.deck.protagonist.elementCode;
  return (input.deck.effectiveWeaponSkillEffects ?? []).some(
    (effect) =>
      effect.kind === "elemental-pursuit" &&
      (elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode) &&
      (sourceSkillId === undefined || effect.sourceSkillId === sourceSkillId),
  );
}

/**
 * Connects staged pre-random damage to body and pursuit distributions. Body and
 * pursuit use independent rolls, matching the observed concurrent hit pairs.
 */
export function calculateNormalAttackDamage(
  input: DamageCalculationInput,
  options: NormalAttackDamageOptions = {},
): NormalAttackDamageResult {
  const character = selectedCharacter(input);
  input = prepareNormalAttackActor(input);
  const characterArtifact = resolveCharacterArtifact(input);
  const target = input.battle.enemies.find((enemy) => enemy.slot === input.targetEnemySlot);
  const characterMastery = resolveCharacterMastery(character, input.protagonistCurrentHpPercent ?? 100, target?.maxHp);
  const attackPower = calculateBattleNormalAttackPower(input.deck, input.battle);
  const hpDependentAttack = calculateHpDependentAttack(
    input.deck,
    input.protagonistCurrentHpPercent ?? 100,
  );
  const baseDamageModel = options.baseDamageModel ?? "article-2026-07";
  if (character && !usesArticleBaseDamageModel(baseDamageModel)) throw new Error("Character normal attacks require the article-2026-07 model");
  const useArticleModel = usesArticleBaseDamageModel(baseDamageModel);
  const baseDamage = useArticleModel
    ? calculateArticleBaseDamage(input, attackPower, hpDependentAttack)
    : calculateDefenseAdjustedBaseDamage(input, attackPower, hpDependentAttack);
  const otherWeaponSkills = calculateOtherWeaponSkills(input.deck);
  const normalAttackSkillFrames = calculateNormalAttackSkillFrames(input.deck);
  const protagonistNormalAttackSupport = resolveNormalAttackSupport(input);
  const battleDamageEffects = resolveBattleDamageEffects(input.battleEffects, protagonistNormalAttackSupport.supplementalDamage,
    protagonistNormalAttackSupport.normalAttackSupplementalDamage);
  const summonDamageEffects = resolveSummonDamageEffects(input.deck, target?.elementCode, target?.maxHp, input.protagonistCurrentHpPercent ?? 100);
  const sharedRandomOptions = {
    multiplierMin: options.multiplierMin,
    multiplierMax: options.multiplierMax,
    multiplierStep: options.multiplierStep,
  };
  const weaponOverskills = calculateWeaponOverskills(input.deck);
  const bodyAttenuationProfile = applyDamageCapPenetration(PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES.normalAttack, weaponOverskills.damageCapPenetrationPercent);
  const accountDamageCapUpPercent = baseDamage.deferredCapModifiers.reduce(
    (sum, modifier) => sum + modifier.amountPercent,
    0,
  );
  const normalFrameDamageCapContributions = (input.deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      effect.kind === "normal-frame-damage-cap-up" &&
      (effect.elementCode === undefined || effect.elementCode === input.deck.protagonist.elementCode),
  );
  const normalFrameDamageCapRawPercent = normalFrameDamageCapContributions.reduce(
    (sum, effect) => sum + effect.effectiveAmountPercent,
    0,
  );
  const normalFrameDamageCapPercent = Math.min(20, normalFrameDamageCapRawPercent);
  const specialFrameDamageCapContributions = (input.deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      effect.kind === "special-frame-damage-cap-up" &&
      (effect.elementCode === undefined || effect.elementCode === input.deck.protagonist.elementCode),
  );
  const specialFrameDamageCapRawPercent = specialFrameDamageCapContributions.reduce(
    (sum, effect) => sum + effect.effectiveAmountPercent,
    0,
  );
  const specialFrameDamageCapPercent = Math.min(20, specialFrameDamageCapRawPercent);
  const bodyDamageCapUpPercent =
    accountDamageCapUpPercent + normalFrameDamageCapPercent + specialFrameDamageCapPercent
    + normalAttackSkillFrames.damageCap.effectivePercent + protagonistNormalAttackSupport.damageCapPercent + summonDamageEffects.capPercent;
  const preAttenuationNominalDamage = baseDamage.articleTrace?.prePostCapDamage
    ?? baseDamage.unroundedDamageBeforeRandomAndCap;
  const advantageous = elementalSuperiorityPercent(input.deck.protagonist.elementCode, target?.elementCode) > 0;
  const postAttenuationPercent = (baseDamage.articleTrace?.postCapDamagePercent ?? 0)
    + characterArtifact.fullHpAmplificationPercent
    + protagonistNormalAttackSupport.normalAttackAmplificationPercent
    + normalAttackSkillFrames.damageAmplification.effectivePercent
    + normalAttackSkillFrames.specialDamageAmplification.effectivePercent
    + summonDamageEffects.amplificationPercent
    + (advantageous ? normalAttackSkillFrames.elementalSuperiority.effectivePercent : 0);
  const supplementalDamagePerHit = otherWeaponSkills.supplementalDamage.effectiveAmount
    + normalAttackSkillFrames.supplementalDamage.effectiveAmount
    + normalAttackSkillFrames.separateSupplementalDamage.effectiveAmount
    + battleDamageEffects.supportSkillSupplementalDamage + battleDamageEffects.enemySupplementalDamage
    + summonDamageEffects.supplementalDamage
    // Earring (Standard) and the existing normal-only buff are provisional separate categories.
    + battleDamageEffects.normalAttackSupplementalDamage + characterMastery.supplementalDamage
    + characterArtifact.normalAttackSupplementalDamage;
  const bodyDamageAttenuation: NormalAttackBodyAttenuationResult = {
    schemaVersion: 1,
    profile: bodyAttenuationProfile,
    weaponOverskills,
    damageCapUpPercent: bodyDamageCapUpPercent,
    capModifiers: [
      ...baseDamage.deferredCapModifiers,
      ...normalFrameDamageCapContributions,
      ...specialFrameDamageCapContributions,
    ],
    normalFrameDamageCapRawPercent,
    normalFrameDamageCapPercent,
    normalFrameDamageCapContributions,
    specialFrameDamageCapRawPercent,
    specialFrameDamageCapPercent,
    specialFrameDamageCapContributions,
    postAttenuationPercent,
    enemyDamageTakenAmplificationPercent: battleDamageEffects.enemyDamageTakenAmplificationPercent,
    randomTargetHitCount: protagonistNormalAttackSupport.randomTargetHitCount,
    supplementalDamagePerHit,
    ...(useArticleModel ? { beforePursuitRounding: "ceil" as const } : {}),
    postAttenuationModel:
      baseDamage.articleTrace === undefined ? "already-applied-provisional" : "additive-percent",
    verificationStatus: "下書き",
  };
  const bodyAttenuationTransform = {
    id: `damage-attenuation:${bodyAttenuationProfile.id}`,
    apply: (damage: number) =>
      applyNormalAttackHitStages(damage, 100, { ...bodyDamageAttenuation, criticalDamageBonusPercent: 0 }),
  };
  // Preserve the fractional base through randomness. The previous Flurry ceil
  // compensated for precision lost in HP-dependent attack multipliers.
  const bodyNominalPreparation = options.bodyNominalPreparation ?? "none";
  const bodyDamageDistribution = summarizeDamageDistribution(preAttenuationNominalDamage, {
    ...sharedRandomOptions,
    nominalPreparation: bodyNominalPreparation,
    finalRounding:
      options.bodyFinalRounding ??
      options.finalRounding ??
      (useArticleModel ? "ceil" : "floor"),
    damageTransform: bodyAttenuationTransform,
  });
  // Preserve the calibrated low-damage/displayed-base path. Soft caps, split
  // hits and supplemental damage require raw input and the staged model.
  const needsStagedPursuit = protagonistNormalAttackSupport.randomTargetHitCount > 1 || supplementalDamagePerHit > 0
    || battleDamageEffects.enemyDamageTakenAmplificationPercent > 0
    || preAttenuationNominalDamage * (options.multiplierMax ?? 1.05) > bodyAttenuationProfile.lines[0].threshold * (1 + bodyDamageCapUpPercent / 100);
  const guaranteedCriticalPercent = advantageous && protagonistNormalAttackSupport.criticalTriggerRatePercent === 100
    ? protagonistNormalAttackSupport.criticalDamageBonusPercent : 0;
  const pursuitDamage = hasSelectedPursuit(input, options.pursuitSourceSkillId)
    ? calculateEffectivePursuitDamage(input.deck, needsStagedPursuit ? preAttenuationNominalDamage : baseDamage.damageBeforeRandomAndCap, {
        ...sharedRandomOptions,
        sourceSkillId: options.pursuitSourceSkillId,
        nominalPreparation: options.pursuitNominalPreparation ?? bodyNominalPreparation,
        finalRounding: options.pursuitFinalRounding ?? options.finalRounding ?? "floor",
        ...(needsStagedPursuit ? { stages: {
          profile: bodyAttenuationProfile, damageCapUpPercent: bodyDamageCapUpPercent, postAttenuationPercent,
          enemyDamageTakenAmplificationPercent: battleDamageEffects.enemyDamageTakenAmplificationPercent,
          randomTargetHitCount: protagonistNormalAttackSupport.randomTargetHitCount,
          supplementalDamagePerHit, criticalDamageBonusPercent: guaranteedCriticalPercent,
          beforePursuitRounding: "ceil",
        } } : {}),
      })
    : undefined;
  const abilityPursuitPercent = input.battleEffects?.abilityNormalPursuitPercent ?? 0;
  const abilityPursuitDamage = abilityPursuitPercent > 0 ? { frame: "skill-side-a" as const,
    effectivePursuitPercentage: abilityPursuitPercent, baseDamage: preAttenuationNominalDamage,
    damageDistribution: summarizeDamageDistribution(preAttenuationNominalDamage, { ...sharedRandomOptions,
      nominalPreparation: bodyNominalPreparation, finalRounding: "floor", damageTransform: {
        id: "skill-side-a-echo", apply: (damage) => applyNormalAttackHitStages(damage, abilityPursuitPercent,
          { ...bodyDamageAttenuation, criticalDamageBonusPercent: guaranteedCriticalPercent, beforePursuitRounding: "ceil" }) } }),
    stages: { ...bodyDamageAttenuation, criticalDamageBonusPercent: guaranteedCriticalPercent, beforePursuitRounding: "ceil" as const } } : undefined;
  const guaranteedCriticalBodyDamageDistribution = advantageous && protagonistNormalAttackSupport.criticalTriggerRatePercent === 100
    ? summarizeDamageDistribution(preAttenuationNominalDamage, {
        ...sharedRandomOptions, nominalPreparation: bodyNominalPreparation,
        finalRounding: options.bodyFinalRounding ?? options.finalRounding ?? (useArticleModel ? "ceil" : "floor"),
        damageTransform: { id: "job-support-critical", apply: (damage) =>
          bodyAttenuationTransform.apply(damage * (1 + protagonistNormalAttackSupport.criticalDamageBonusPercent / 100)) },
      }) : undefined;
  const hasDestructionPursuit = (input.deck.effectiveWeaponSkillEffects ?? []).some(
    (effect) => effect.kind === "destruction-pursuit" && (effect.elementCode === undefined || effect.elementCode === input.deck.protagonist.elementCode),
  );
  const destructionPursuitDamage = hasDestructionPursuit && useArticleModel
    ? calculateEffectivePursuitDamage(input.deck,
        calculateArticleBaseDamage(input, attackPower, hpDependentAttack, "destruction").articleTrace!.prePostCapDamage,
        // Independent light/dark captures support rounding the amplified split,
        // rather than the base before randomness. Keep the formula provisional.
        { ...sharedRandomOptions, kind: "destruction-pursuit", nominalPreparation: "none", stages: {
          profile: bodyAttenuationProfile, damageCapUpPercent: bodyDamageCapUpPercent,
          postAttenuationPercent: postAttenuationPercent + (advantageous ? 0 : normalAttackSkillFrames.elementalSuperiority.effectivePercent),
          enemyDamageTakenAmplificationPercent: battleDamageEffects.enemyDamageTakenAmplificationPercent,
          randomTargetHitCount: protagonistNormalAttackSupport.randomTargetHitCount, supplementalDamagePerHit,
          criticalDamageBonusPercent: protagonistNormalAttackSupport.criticalDamageBonusPercent,
          beforePursuitRounding: "ceil",
        } }) : undefined;
  const canWeaponSkillCritical =
    elementalSuperiorityPercent(input.deck.protagonist.elementCode, target?.elementCode) > 0;
  const criticalBodyDamage = canWeaponSkillCritical
    ? calculateCriticalBodyDamage(input.deck, baseDamage, {
        multiplierMin: options.multiplierMin,
        multiplierMax: options.multiplierMax,
        multiplierStep: options.multiplierStep,
      })
    : undefined;
  const criticalLimitBonusSources = canWeaponSkillCritical
    ? (input.deck.protagonist.job?.criticalRateBonuses ?? [])
    : [];
  const criticalScenario = (damageBonusPercent: number): ProtagonistLimitBonusCriticalScenario => {
    damageBonusPercent += guaranteedCriticalPercent;
    const damageMultiplier = 1 + damageBonusPercent / 100;
    const distributionOptions = {
      nominalPreparation: bodyNominalPreparation,
      finalRounding:
        options.bodyFinalRounding ??
        options.finalRounding ??
        (useArticleModel ? "ceil" as const : "floor" as const),
      damageTransform: {
        id: `protagonist-critical:${damageBonusPercent}`,
        apply: (damage: number) => bodyAttenuationTransform.apply(damage * damageMultiplier),
      },
    };
    const damageDistribution = summarizeDamageDistribution(preAttenuationNominalDamage, {
      ...sharedRandomOptions,
      ...distributionOptions,
    });
    const nominalDamage = summarizeDamageDistribution(preAttenuationNominalDamage, {
      multiplierMin: 1,
      multiplierMax: 1,
      multiplierStep: 1,
      ...distributionOptions,
    }).minimumDamage;
    return { damageBonusPercent, damageMultiplier, nominalDamage, damageDistribution };
  };
  const protagonistLimitBonusCritical = criticalLimitBonusSources.length === 0
    ? undefined
    : (() => {
        const damageBonusPercent = criticalLimitBonusSources.reduce(
          (sum, source) => sum + source.damageBonusPercent,
          0,
        );
        const limitBonusScenario = criticalScenario(damageBonusPercent);
        const weaponDamageBonusPercent = criticalBodyDamage === undefined
          ? 0
          : (criticalBodyDamage.criticalDamageMultiplier - 1) * 100;
        return {
          schemaVersion: 1 as const,
          status: "provisional" as const,
          probabilityModel: "independent-per-limit-bonus" as const,
          sources: criticalLimitBonusSources,
          ...limitBonusScenario,
          ...(criticalBodyDamage === undefined
            ? {}
            : { combinedWithWeaponSkill: criticalScenario(damageBonusPercent + weaponDamageBonusPercent) }),
        };
      })();
  const distributions = [
    guaranteedCriticalBodyDamageDistribution ?? bodyDamageDistribution,
    ...(pursuitDamage === undefined ? [] : [pursuitDamage.damageDistribution]),
    ...(abilityPursuitDamage === undefined ? [] : [abilityPursuitDamage.damageDistribution]),
    ...(destructionPursuitDamage === undefined ? [] : [destructionPursuitDamage.damageDistribution]),
  ];
  const abilityPostAttenuationPercent = [
    ...(input.accountBonuses?.modifiers ?? []).filter(
      (modifier) => modifier.stage === "damage-dealt" || modifier.stage === "target-element-damage",
    ).map((modifier) => modifier.amountPercent),
    otherWeaponSkills.damageDealt.effectivePercent,
    summonDamageEffects.amplificationPercent,
    advantageous ? normalAttackSkillFrames.elementalSuperiority.effectivePercent : 0,
  ].reduce((sum, amount) => sum + amount, 0);
  const generalDamageCapPercent = baseDamage.deferredCapModifiers
    .filter((modifier) => modifier.stage === "damage-cap")
    .reduce((sum, modifier) => sum + modifier.amountPercent, 0);
  const abilityDamage = input.abilityDamage === undefined || baseDamage.articleTrace === undefined
    ? undefined
    : calculateArmorBreakDamage({
        commonPreAbilityDamage: baseDamage.articleTrace.prePostCapDamage,
        abilityDamageUpPercent: input.abilityDamage.abilityDamageUpPercent + otherWeaponSkills.abilityDamage.effectivePercent,
        limitBonusPercent: input.abilityDamage.limitBonusPercent,
        damageCapUpPercent:
          generalDamageCapPercent
          + normalFrameDamageCapPercent
          + specialFrameDamageCapPercent
          + protagonistNormalAttackSupport.damageCapPercent
          + summonDamageEffects.capPercent
          + input.abilityDamage.abilityDamageCapUpPercent
          + otherWeaponSkills.abilityDamageCap.effectivePercent,
        limitBonusDamageCapUpPercent: input.abilityDamage.limitBonusDamageCapUpPercent,
        supplementalDamagePerHit:
          otherWeaponSkills.supplementalDamage.effectiveAmount
          + otherWeaponSkills.abilitySupplementalDamage.effectiveAmount + summonDamageEffects.supplementalDamage
          + battleDamageEffects.supportSkillSupplementalDamage + battleDamageEffects.enemySupplementalDamage,
        postAttenuationPercent: abilityPostAttenuationPercent,
        multiplierMin: options.multiplierMin,
        multiplierMax: options.multiplierMax,
        multiplierStep: options.multiplierStep,
      });

  return {
    schemaVersion: 1,
    status: "provisional",
    ...(character ? { attacker: { characterSlot: character.slot, characterId: character.masterId, name: character.name,
      verificationStatus: "下書き" as const,
      modelScope: input.battleEffects ? "explicit-battle-effects" as const : "abilities-unused" as const,
      unresolvedInputs: [
        ...(character.perpetuityRing === undefined ? ["perpetuityRing"] : []),
        ...(character.masterId === "3040512000" && input.divineStampBookEnabled === undefined ? ["divineStampBookEnabled"] : []),
        ...(character.limitBonuses === undefined ? ["limitBonuses"] : []),
        ...(character.awakening?.formCode === undefined ? ["awakeningForm"] : []),
        ...(character.awakening?.level === undefined ? ["awakeningLevel"] : []),
        ...(character.mastery === undefined ? ["overMastery-aetherialMastery-effects"]
          : characterMastery.unsupportedBonuses.map((id) => `mastery-bonus-${id}`)),
        ...(character.artifact === undefined ? ["artifact"] : resolveCharacterArtifact(input).unsupportedSkills.map((id) => `artifact-skill-${id}`)),
      ] } } : {}),
    attackPower,
    hpDependentAttack,
    baseDamage,
    bodyDamageAttenuation,
    bodyDamageDistribution,
    normalAttackSkillFrames,
    normalAttackSupport: protagonistNormalAttackSupport,
    ...(character ? { characterArtifact } : {}),
    ...(character ? { characterMastery } : {}),
    protagonistNormalAttackSupport,
    summonDamageEffects,
    battleDamageEffects,
    guaranteedCriticalBodyDamageDistribution,
    criticalBodyDamage,
    protagonistLimitBonusCritical,
    pursuitDamage,
    abilityPursuitDamage,
    destructionPursuitDamage,
    ...(options.compareDestructionPursuitRounding && destructionPursuitDamage ? {
      destructionPursuitRoundingCandidates: calculateDestructionPursuitRoundingCandidates(input, attackPower, hpDependentAttack, destructionPursuitDamage),
    } : {}),
    protagonistHp: character ? undefined : calculateProtagonistHp(input.deck),
    multiattackRates: character ? undefined : calculateProtagonistMultiattackRates(input.deck),
    otherWeaponSkills,
    abilityDamage,
    incomingDamage: input.incomingDamage === undefined
      ? undefined
      : calculateIncomingDamagePrediction(
          input.incomingDamage.enemyAttack,
          input.incomingDamage.defensePercent,
          input.incomingDamage.elementalDamageReductionPercents,
          { minimum: options.multiplierMin, maximum: options.multiplierMax },
          (input.deck.effectiveWeaponSkillEffects ?? []).filter(
            (effect) =>
              effect.kind === "weapon-defense-up" &&
              (effect.elementCode === undefined || effect.elementCode === input.deck.protagonist.elementCode),
          ),
        ),
    totalDamageDistribution: {
      schemaVersion: 1,
      model: "independent-discrete-components",
      componentCount: distributions.length,
      combinationCount: distributions.reduce((count, distribution) => count * distribution.patternCount, 1),
      minimumDamage: distributions.reduce((sum, distribution) => sum + distribution.minimumDamage, 0),
      maximumDamage: distributions.reduce((sum, distribution) => sum + distribution.maximumDamage, 0),
      expectedDamage: distributions.reduce((sum, distribution) => sum + distribution.expectedDamage, 0),
    },
    issues: [
      "damage-attenuation-profile-provisional",
      ...(destructionPursuitDamage ? ["destruction-base-rounding-provisional" as const] : []),
      ...(protagonistNormalAttackSupport.randomTargetHitCount > 1 ? ["flurry-base-rounding-provisional" as const] : []),
      ...(pursuitDamage?.stages?.beforePursuitRounding ? ["flurry-pursuit-rounding-provisional" as const] : []),
      ...(baseDamage.unresolvedStages.includes("rounding")
        ? (["rounding-order-unresolved"] as const)
        : []),
      ...(pursuitDamage === undefined ? [] : (["independent-component-randomness-provisional"] as const)),
      ...(criticalBodyDamage === undefined && protagonistLimitBonusCritical === undefined
        ? []
        : (["critical-probability-unresolved"] as const)),
      ...(criticalBodyDamage === undefined && protagonistLimitBonusCritical === undefined
        ? []
        : (["critical-damage-attenuation-unresolved"] as const)),
      ...(otherWeaponSkills.supplementalDamage.effectiveAmount === 0 && !summonDamageEffects.enemyHpCapUnresolved && !characterMastery.enemyHpCapUnresolved
        ? []
        : (["supplemental-damage-enemy-hp-cap-unresolved"] as const)),
    ],
  };
}
