import type { NormalAttackPowerResult } from "./normalAttackPowerCalculator.js";
import type { DamageCalculationInput, DamageModifier, DamageModifierStage, EnemyTarget } from "./types.js";

export interface AppliedDamageStage {
  stage: DamageModifierStage;
  inputDamage: number;
  totalPercent: number;
  multiplier: number;
  outputDamage: number;
  contributions: DamageModifier[];
}

export interface DefenseAdjustedBaseDamageResult {
  schemaVersion: 1;
  status: "partial";
  model: "staged-normal-attack-base";
  targetEnemySlot: number;
  enemyId: string;
  attackBeforeDefense: number;
  enemyDefense: number;
  enemyDefenseSource?: EnemyTarget["defenseSource"];
  damageBeforeRandomAndCap: number;
  stages: AppliedDamageStage[];
  deferredCapModifiers: DamageModifier[];
  unresolvedStages: Array<"rounding" | "damage-cap">;
}

function roundCalculation(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
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

function elementalSuperiorityPercent(
  attackerElementCode: string | undefined,
  targetElementCode: string | undefined,
): number {
  if (attackerElementCode === undefined || targetElementCode === undefined) return 0;
  const advantageTargets: Record<string, string[]> = {
    "1": ["4"],
    "2": ["1"],
    "3": ["2"],
    "4": ["3"],
    "5": ["6"],
    "6": ["5"],
  };
  const disadvantageTargets: Record<string, string[]> = {
    "1": ["2"],
    "2": ["3"],
    "3": ["4"],
    "4": ["1"],
  };
  if (advantageTargets[attackerElementCode]?.includes(targetElementCode)) return 50;
  if (disadvantageTargets[attackerElementCode]?.includes(targetElementCode)) return -25;
  return 0;
}

function applyStage(
  inputDamage: number,
  stage: DamageModifierStage,
  contributions: DamageModifier[],
): AppliedDamageStage {
  const totalPercent = roundCalculation(contributions.reduce((sum, modifier) => sum + modifier.amountPercent, 0));
  const multiplier = roundCalculation(1 + totalPercent / 100);
  return {
    stage,
    inputDamage,
    totalPercent,
    multiplier,
    outputDamage: roundCalculation(inputDamage * multiplier),
    contributions,
  };
}

function userInputModifier(
  stage: "crew-ship" | "crew-furnace",
  amountPercent: number | undefined,
): DamageModifier[] {
  if (amountPercent === undefined || amountPercent === 0) return [];
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

/** Applies explicit attack frames before dividing by the selected enemy defense. */
export function calculateDefenseAdjustedBaseDamage(
  input: DamageCalculationInput,
  attackPower: NormalAttackPowerResult,
): DefenseAdjustedBaseDamageResult {
  const target = input.battle.enemies.find((enemy) => enemy.slot === input.targetEnemySlot);
  if (target === undefined) throw new Error(`target enemy slot ${input.targetEnemySlot} was not found`);
  if (target.defense === undefined) {
    throw new Error("target enemy defense is unresolved; provide enemyDefenseOverride");
  }
  if (!Number.isFinite(target.defense) || target.defense <= 0) {
    throw new Error("target enemy defense must be a finite positive number");
  }

  const protagonistElementCode = input.deck.protagonist.elementCode;
  const jobClassCode = input.deck.protagonist.job?.classCode;
  const accountModifiers = (input.accountBonuses?.modifiers ?? []).filter((modifier) =>
    appliesToTarget(modifier, protagonistElementCode, target.elementCode, jobClassCode),
  );
  const jobModifiers = (input.deck.protagonist.job?.damageModifiers ?? []).filter((modifier) =>
    appliesToTarget(modifier, protagonistElementCode, target.elementCode, jobClassCode),
  );
  const superiorityPercent = elementalSuperiorityPercent(protagonistElementCode, target.elementCode);
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

  const stageDefinitions: Array<[DamageModifierStage, DamageModifier[]]> = [
    ["elemental-attack", elementalContributions],
    ["crew-ship", userInputModifier("crew-ship", input.crewModifiers?.shipAttackPercent)],
    ["crew-furnace", userInputModifier("crew-furnace", input.crewModifiers?.furnaceAttackPercent)],
    ["normal-attack-damage", jobModifiers.filter((modifier) => modifier.stage === "normal-attack-damage")],
    ["damage-dealt", accountModifiers.filter((modifier) => modifier.stage === "damage-dealt")],
    [
      "target-element-damage",
      accountModifiers.filter((modifier) => modifier.stage === "target-element-damage"),
    ],
  ];
  const stages: AppliedDamageStage[] = [];
  let attackBeforeDefense = attackPower.normalSkillAdjustedAttack;
  for (const [stage, contributions] of stageDefinitions) {
    const applied = applyStage(attackBeforeDefense, stage, contributions);
    stages.push(applied);
    attackBeforeDefense = applied.outputDamage;
  }

  return {
    schemaVersion: 1,
    status: "partial",
    model: "staged-normal-attack-base",
    targetEnemySlot: target.slot,
    enemyId: target.enemyId,
    attackBeforeDefense,
    enemyDefense: target.defense,
    enemyDefenseSource: target.defenseSource,
    damageBeforeRandomAndCap: roundCalculation(attackBeforeDefense / target.defense),
    stages,
    deferredCapModifiers: accountModifiers.filter(
      (modifier) => modifier.stage === "damage-cap" || modifier.stage === "normal-attack-damage-cap",
    ),
    unresolvedStages: ["rounding", "damage-cap"],
  };
}

/** Diagnostic only: folds all still-unresolved stages into one effective divisor. */
export function inferCompositeDefenseDivisor(
  attackBeforeDefense: number,
  displayedBaseDamage: number,
): number {
  if (!Number.isFinite(attackBeforeDefense) || attackBeforeDefense < 0) {
    throw new Error("attackBeforeDefense must be a finite non-negative number");
  }
  if (!Number.isFinite(displayedBaseDamage) || displayedBaseDamage <= 0) {
    throw new Error("displayedBaseDamage must be a finite positive number");
  }
  return roundCalculation(attackBeforeDefense / displayedBaseDamage);
}
