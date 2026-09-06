import {
  elementalSuperiorityPercent,
  type AppliedDamageStage,
  type ArticleBaseDamageTrace,
  type DefenseAdjustedBaseDamageResult,
} from "./baseDamageCalculator.js";
import type { NormalAttackPowerResult } from "./normalAttackPowerCalculator.js";
import type {
  DamageCalculationInput,
  DamageModifier,
  EffectiveWeaponSkillEffect,
  EnemyTarget,
} from "./types.js";

const ARTICLE_SOURCE =
  "https://gbf-dmg-calc.hatenablog.com/entry/2026/07/30/184000" as const;

export interface ArticleCrewAttackSteps {
  precisionStepRaw: number;
  precisionStep: number;
  shipStepRaw: number;
  shipStep: number;
  furnaceStepRaw: number;
  furnaceStep: number;
  crewAdjustedAttack: number;
}

/** Reproduces the article's float64 ship ceil and integer-safe furnace ceil. */
export function calculateArticleCrewAttackSteps(
  displayedAttack: number,
  shipPercent: number,
  furnacePercent: number,
): ArticleCrewAttackSteps {
  const precisionStepRaw = displayedAttack / 10;
  const precisionStep = Math.ceil(precisionStepRaw);
  const shipStepRaw = precisionStep * (1 + shipPercent / 100);
  const shipStep = Math.ceil(shipStepRaw);
  // Multiply before dividing so integer percentages do not introduce K+epsilon.
  const furnaceStepRaw = (shipStep * (100 + furnacePercent)) / 100;
  const furnaceStep = Math.ceil(furnaceStepRaw);
  return {
    precisionStepRaw,
    precisionStep,
    shipStepRaw,
    shipStep,
    furnaceStepRaw,
    furnaceStep,
    crewAdjustedAttack: furnaceStep * 10,
  };
}

function appliesToTarget(
  modifier: DamageModifier,
  protagonistElementCode: string | undefined,
  targetElementCode: string | undefined,
  jobClassCode: string | undefined,
): boolean {
  if (modifier.elementCode !== undefined && modifier.elementCode !== protagonistElementCode) return false;
  if (modifier.targetElementCode !== undefined && modifier.targetElementCode !== targetElementCode) return false;
  if (modifier.condition === "non-class-v" && jobClassCode === "5") return false;
  return true;
}

function crewModifier(
  stage: "crew-ship" | "crew-furnace",
  amountPercent: number,
): DamageModifier[] {
  if (amountPercent === 0) return [];
  return [
    {
      stage,
      amountPercent,
      sourceType: "user-input",
      sourceId: stage,
      sourceName: stage === "crew-ship" ? "Crew ship attack" : "Crew furnace attack",
      verificationStatus: "下書き",
    },
  ];
}

function stage(
  name: AppliedDamageStage["stage"],
  inputDamage: number,
  totalPercent: number,
  rawOutputDamage: number,
  outputDamage: number,
  rounding: AppliedDamageStage["rounding"],
  contributions: Array<DamageModifier | EffectiveWeaponSkillEffect>,
): AppliedDamageStage {
  return {
    stage: name,
    inputDamage,
    totalPercent,
    multiplier: 1 + totalPercent / 100,
    rawOutputDamage,
    outputDamage,
    rounding,
    contributions,
  };
}

function requireTarget(input: DamageCalculationInput): EnemyTarget & { defense: number } {
  const target = input.battle.enemies.find((enemy) => enemy.slot === input.targetEnemySlot);
  if (target === undefined) throw new Error(`target enemy slot ${input.targetEnemySlot} was not found`);
  if (target.defense === undefined) {
    throw new Error("target enemy defense is unresolved; provide enemyDefenseOverride");
  }
  if (!Number.isFinite(target.defense) || target.defense <= 0) {
    throw new Error("target enemy defense must be a finite positive number");
  }
  return target as EnemyTarget & { defense: number };
}

/**
 * Experimental low-damage path based on the article's float64/rounding model.
 * Damage-cap processing remains deferred, so callers must not extrapolate this
 * path to capped damage yet.
 */
export function calculateArticleBaseDamage(
  input: DamageCalculationInput,
  attackPower: NormalAttackPowerResult,
): DefenseAdjustedBaseDamageResult {
  const target = requireTarget(input);
  const protagonistElementCode = input.deck.protagonist.elementCode;
  const jobClassCode = input.deck.protagonist.job?.classCode;
  const accountModifiers = (input.accountBonuses?.modifiers ?? []).filter((modifier) =>
    appliesToTarget(modifier, protagonistElementCode, target.elementCode, jobClassCode),
  );
  const jobModifiers = (input.deck.protagonist.job?.damageModifiers ?? []).filter((modifier) =>
    appliesToTarget(modifier, protagonistElementCode, target.elementCode, jobClassCode),
  );
  const shipPercent = input.crewModifiers?.shipAttackPercent ?? 0;
  const furnacePercent = input.crewModifiers?.furnaceAttackPercent ?? 0;

  // The article's normal-attack example uses a bullet-power multiplier of 1.
  const crewSteps = calculateArticleCrewAttackSteps(
    attackPower.baseAttack,
    shipPercent,
    furnacePercent,
  );
  const {
    precisionStepRaw,
    precisionStep,
    shipStepRaw,
    shipStep,
    furnaceStepRaw,
    furnaceStep,
    crewAdjustedAttack,
  } = crewSteps;

  const weaponSkillRaw = crewAdjustedAttack * (1 + attackPower.totalEffectiveNormalAttackPercent / 100);
  const elementalContributions: DamageModifier[] = [
    ...attackPower.elementalSummonAuraContributions.map(
      (aura): DamageModifier => ({
        stage: "elemental-attack",
        amountPercent: aura.amountPercent,
        sourceType: aura.sourcePosition === "main" ? "main-summon" : "support-summon",
        sourceId: aura.sourceSummonId,
        sourceName: aura.sourceSummonName ?? aura.auraName,
        elementCode: aura.elementCode,
        verificationStatus: aura.verificationStatus,
      }),
    ),
    ...accountModifiers.filter((modifier) => modifier.stage === "elemental-attack"),
  ];
  const superiorityPercent = elementalSuperiorityPercent(protagonistElementCode, target.elementCode);
  if (superiorityPercent !== 0) {
    elementalContributions.push({
      stage: "elemental-attack",
      amountPercent: superiorityPercent,
      sourceType: "formula",
      sourceId: "elemental-superiority",
      sourceName: "Elemental superiority",
      verificationStatus: "下書き",
    });
  }
  const elementalPercent = elementalContributions.reduce(
    (sum, contribution) => sum + contribution.amountPercent,
    0,
  );
  const elementalRaw = weaponSkillRaw * (1 + elementalPercent / 100);
  const prePostCapDamage = elementalRaw / target.defense;

  const postCapContributions = [
    ...accountModifiers.filter(
      (modifier) => modifier.stage === "damage-dealt" || modifier.stage === "target-element-damage",
    ),
    ...jobModifiers.filter((modifier) => modifier.stage === "normal-attack-damage"),
  ];
  const postCapDamagePercent = postCapContributions.reduce(
    (sum, contribution) => sum + contribution.amountPercent,
    0,
  );
  const finalRawDamage = prePostCapDamage * (1 + postCapDamagePercent / 100);
  const displayedDamage = Math.ceil(finalRawDamage);

  const stages: AppliedDamageStage[] = [
    stage(
      "crew-ship",
      precisionStep,
      shipPercent,
      shipStepRaw,
      shipStep,
      "ceil",
      crewModifier("crew-ship", shipPercent),
    ),
    stage(
      "crew-furnace",
      shipStep,
      furnacePercent,
      furnaceStepRaw,
      furnaceStep,
      "ceil",
      crewModifier("crew-furnace", furnacePercent),
    ),
    stage(
      "normal-weapon-skill",
      crewAdjustedAttack,
      attackPower.totalEffectiveNormalAttackPercent,
      weaponSkillRaw,
      weaponSkillRaw,
      "none",
      attackPower.contributions,
    ),
    stage(
      "elemental-attack",
      weaponSkillRaw,
      elementalPercent,
      elementalRaw,
      elementalRaw,
      "none",
      elementalContributions,
    ),
    stage(
      "damage-dealt",
      prePostCapDamage,
      postCapDamagePercent,
      finalRawDamage,
      displayedDamage,
      "ceil",
      postCapContributions,
    ),
  ];
  const articleTrace: ArticleBaseDamageTrace = {
    sourceUrl: ARTICLE_SOURCE,
    bulletPowerMultiplier: 1,
    displayedAttack: attackPower.baseAttack,
    precisionStepRaw,
    precisionStep,
    shipStepRaw,
    shipStep,
    furnaceStepRaw,
    furnaceStep,
    crewAdjustedAttack,
    prePostCapDamage,
    postCapDamagePercent,
    finalRawDamage,
    finalRounding: "ceil",
  };

  return {
    schemaVersion: 1,
    status: "partial",
    model: "article-2026-07-experimental",
    targetEnemySlot: target.slot,
    enemyId: target.enemyId,
    defenseAdjustedBaseAttack: crewAdjustedAttack / target.defense,
    defenseRounding: "none",
    attackBeforeDefense: finalRawDamage * target.defense,
    enemyDefense: target.defense,
    enemyDefenseSource: target.defenseSource,
    unroundedDamageBeforeRandomAndCap: finalRawDamage,
    damageBeforeRandomAndCap: displayedDamage,
    stages,
    articleTrace,
    deferredCapModifiers: accountModifiers.filter(
      (modifier) => modifier.stage === "damage-cap" || modifier.stage === "normal-attack-damage-cap",
    ),
    unresolvedStages: ["damage-cap"],
  };
}
