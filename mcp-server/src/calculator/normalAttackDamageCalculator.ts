import {
  calculateDefenseAdjustedBaseDamage,
  elementalSuperiorityPercent,
  type BaseDamageCalculationModel,
  type DefenseAdjustedBaseDamageResult,
} from "./baseDamageCalculator.js";
import { calculateArticleBaseDamage } from "./articleBaseDamageCalculator.js";
import {
  calculateBattleNormalAttackPower,
  type NormalAttackPowerResult,
} from "./normalAttackPowerCalculator.js";
import {
  calculateEffectivePursuitDamage,
  type EffectivePursuitDamageResult,
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
import type { DamageCalculationInput } from "./types.js";
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
  calculateDamageAttenuation,
  PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES,
  type DamageAttenuationProfile,
} from "./damageAttenuationCalculator.js";
import type { DamageModifier, DeckJobCriticalRateBonus } from "./types.js";

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
  schemaVersion: 1;
  profile: DamageAttenuationProfile;
  damageCapUpPercent: number;
  capModifiers: DamageModifier[];
  postAttenuationPercent: number;
  /** The current article model groups every post-cap percentage additively. */
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
  schemaVersion: 1;
  status: "provisional";
  attackPower: NormalAttackPowerResult;
  hpDependentAttack: HpDependentAttackResult;
  baseDamage: DefenseAdjustedBaseDamageResult;
  bodyDamageAttenuation: NormalAttackBodyAttenuationResult;
  bodyDamageDistribution: DamageDistributionSummary;
  criticalBodyDamage?: CriticalBodyDamageResult;
  protagonistLimitBonusCritical?: ProtagonistLimitBonusCriticalResult;
  pursuitDamage?: EffectivePursuitDamageResult;
  protagonistHp?: ProtagonistHpResult;
  multiattackRates: ProtagonistMultiattackRateResult;
  otherWeaponSkills: OtherWeaponSkillResult;
  totalDamageDistribution: CombinedNormalAttackDistribution;
  issues: Array<
    | "damage-attenuation-profile-provisional"
    | "rounding-order-unresolved"
    | "independent-component-randomness-provisional"
    | "critical-probability-unresolved"
    | "critical-damage-attenuation-unresolved"
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
  const attackPower = calculateBattleNormalAttackPower(input.deck, input.battle);
  const hpDependentAttack = calculateHpDependentAttack(
    input.deck,
    input.protagonistCurrentHpPercent ?? 100,
  );
  const baseDamageModel = options.baseDamageModel ?? "article-2026-07";
  const useArticleModel = usesArticleBaseDamageModel(baseDamageModel);
  const baseDamage = useArticleModel
    ? calculateArticleBaseDamage(input, attackPower, hpDependentAttack)
    : calculateDefenseAdjustedBaseDamage(input, attackPower, hpDependentAttack);
  const sharedRandomOptions = {
    multiplierMin: options.multiplierMin,
    multiplierMax: options.multiplierMax,
    multiplierStep: options.multiplierStep,
  };
  const bodyAttenuationProfile = PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES.normalAttack;
  const bodyDamageCapUpPercent = baseDamage.deferredCapModifiers.reduce(
    (sum, modifier) => sum + modifier.amountPercent,
    0,
  );
  const preAttenuationNominalDamage = baseDamage.articleTrace?.prePostCapDamage
    ?? baseDamage.unroundedDamageBeforeRandomAndCap;
  const postAttenuationPercent = baseDamage.articleTrace?.postCapDamagePercent ?? 0;
  const bodyDamageAttenuation: NormalAttackBodyAttenuationResult = {
    schemaVersion: 1,
    profile: bodyAttenuationProfile,
    damageCapUpPercent: bodyDamageCapUpPercent,
    capModifiers: baseDamage.deferredCapModifiers,
    postAttenuationPercent,
    postAttenuationModel:
      baseDamage.articleTrace === undefined ? "already-applied-provisional" : "additive-percent",
    verificationStatus: "下書き",
  };
  const bodyAttenuationTransform = {
    id: `damage-attenuation:${bodyAttenuationProfile.id}`,
    apply: (damage: number) =>
      calculateDamageAttenuation(damage, bodyAttenuationProfile, {
        damageCapUpPercent: bodyDamageCapUpPercent,
      }).damage * (1 + postAttenuationPercent / 100),
  };
  const bodyDamageDistribution = summarizeDamageDistribution(preAttenuationNominalDamage, {
    ...sharedRandomOptions,
    nominalPreparation: options.bodyNominalPreparation ?? "none",
    finalRounding:
      options.bodyFinalRounding ??
      options.finalRounding ??
      (useArticleModel ? "ceil" : "floor"),
    damageTransform: bodyAttenuationTransform,
  });
  const pursuitDamage = hasSelectedPursuit(input, options.pursuitSourceSkillId)
    ? calculateEffectivePursuitDamage(input.deck, baseDamage.damageBeforeRandomAndCap, {
        ...sharedRandomOptions,
        sourceSkillId: options.pursuitSourceSkillId,
        nominalPreparation: options.pursuitNominalPreparation ?? "none",
        finalRounding: options.pursuitFinalRounding ?? options.finalRounding ?? "floor",
      })
    : undefined;
  const target = input.battle.enemies.find((enemy) => enemy.slot === input.targetEnemySlot);
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
    const damageMultiplier = 1 + damageBonusPercent / 100;
    const distributionOptions = {
      nominalPreparation: options.bodyNominalPreparation ?? "none" as const,
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
    bodyDamageDistribution,
    ...(pursuitDamage === undefined ? [] : [pursuitDamage.damageDistribution]),
  ];

  return {
    schemaVersion: 1,
    status: "provisional",
    attackPower,
    hpDependentAttack,
    baseDamage,
    bodyDamageAttenuation,
    bodyDamageDistribution,
    criticalBodyDamage,
    protagonistLimitBonusCritical,
    pursuitDamage,
    protagonistHp: calculateProtagonistHp(input.deck),
    multiattackRates: calculateProtagonistMultiattackRates(input.deck),
    otherWeaponSkills: calculateOtherWeaponSkills(input.deck),
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
    ],
  };
}
