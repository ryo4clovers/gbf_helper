import type { NormalAttackPowerResult } from "./normalAttackPowerCalculator.js";
import type {
  DamageCalculationInput,
  DamageModifier,
  DamageModifierStage,
  EffectiveWeaponSkillEffect,
  EnemyTarget,
} from "./types.js";

export type BaseDamageStage = DamageModifierStage | "normal-weapon-skill";
export type StageRounding = "none" | "floor" | "ceil";
export type BaseDamageCalculationModel =
  | "defense-first-provisional"
  | "article-2026-07"
  | "article-2026-07-experimental";

export interface ArticleBaseDamageTrace {
  sourceUrl: "https://gbf-dmg-calc.hatenablog.com/entry/2026/07/30/184000";
  bulletPowerMultiplier: 1;
  displayedAttack: number;
  precisionStepRaw: number;
  precisionStep: number;
  shipStepRaw: number;
  shipStep: number;
  furnaceStepRaw: number;
  furnaceStep: number;
  crewAdjustedAttack: number;
  prePostCapDamage: number;
  postCapDamagePercent: number;
  finalRawDamage: number;
  finalRounding: "ceil";
}

export interface AppliedDamageStage {
  stage: BaseDamageStage;
  inputDamage: number;
  totalPercent: number;
  /** Earlier percentage points in the same additive frame, when this stage adds to an existing frame. */
  additiveBasePercent?: number;
  multiplier: number;
  rawOutputDamage: number;
  outputDamage: number;
  rounding: StageRounding;
  contributions: Array<DamageModifier | EffectiveWeaponSkillEffect>;
}

export interface DefenseAdjustedBaseDamageResult {
  schemaVersion: 1;
  status: "partial";
  model: "staged-normal-attack-base" | "article-2026-07";
  targetEnemySlot: number;
  enemyId: string;
  defenseAdjustedBaseAttack: number;
  defenseRounding: "ceil" | "none";
  attackBeforeDefense: number;
  enemyDefense: number;
  enemyDefenseSource?: EnemyTarget["defenseSource"];
  /** Unrounded value used as the normal-attack body's random-damage base. */
  unroundedDamageBeforeRandomAndCap: number;
  /** Rounded value shown as the representative damage in the party screen. */
  damageBeforeRandomAndCap: number;
  stages: AppliedDamageStage[];
  articleTrace?: ArticleBaseDamageTrace;
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

export function elementalSuperiorityPercent(
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
  stage: BaseDamageStage,
  contributions: Array<DamageModifier | EffectiveWeaponSkillEffect>,
  rounding: StageRounding = "none",
  totalPercentOverride?: number,
  additiveBasePercent?: number,
): AppliedDamageStage {
  const totalPercent = roundCalculation(
    totalPercentOverride ??
      contributions.reduce(
        (sum, modifier) =>
          sum + ("amountPercent" in modifier ? modifier.amountPercent : modifier.effectiveAmountPercent),
        0,
      ),
  );
  const multiplier = roundCalculation(
    additiveBasePercent === undefined
      ? 1 + totalPercent / 100
      : (1 + (additiveBasePercent + totalPercent) / 100) / (1 + additiveBasePercent / 100),
  );
  const rawOutputDamage = roundCalculation(inputDamage * multiplier);
  return {
    stage,
    inputDamage,
    totalPercent,
    ...(additiveBasePercent === undefined ? {} : { additiveBasePercent }),
    multiplier,
    rawOutputDamage,
    outputDamage: rounding === "floor" ? Math.floor(rawOutputDamage) : rawOutputDamage,
    rounding,
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

/**
 * Applies the provisional in-game display model. The displayed ATK is divided by
 * enemy defense and rounded up before attack frames are applied. The two
 * intermediate floors are based on the observed +0 through +5 Agni series and
 * remain explicitly reported while their exact semantic positions are unresolved.
 */
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
  const damageDealtContributions = accountModifiers.filter((modifier) => modifier.stage === "damage-dealt");
  const normalAttackDamageContributions = jobModifiers.filter(
    (modifier) => modifier.stage === "normal-attack-damage",
  );
  const targetElementDamageContributions = accountModifiers.filter(
    (modifier) => modifier.stage === "target-element-damage",
  );
  const previouslyAppliedDamagePercent = roundCalculation(
    [...damageDealtContributions, ...normalAttackDamageContributions].reduce(
      (sum, modifier) => sum + modifier.amountPercent,
      0,
    ),
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

  const stageDefinitions: Array<{
    stage: BaseDamageStage;
    contributions: Array<DamageModifier | EffectiveWeaponSkillEffect>;
    rounding?: StageRounding;
    totalPercentOverride?: number;
    additiveBasePercent?: number;
  }> = [
    {
      stage: "damage-dealt",
      contributions: damageDealtContributions,
    },
    {
      stage: "crew-ship",
      contributions: userInputModifier("crew-ship", input.crewModifiers?.shipAttackPercent),
      rounding: "floor",
    },
    {
      stage: "normal-attack-damage",
      contributions: normalAttackDamageContributions,
      rounding: "floor",
    },
    { stage: "elemental-attack", contributions: elementalContributions },
    {
      stage: "normal-weapon-skill",
      contributions: attackPower.contributions,
      totalPercentOverride: attackPower.totalEffectiveNormalAttackPercent,
    },
    {
      stage: "crew-furnace",
      contributions: userInputModifier("crew-furnace", input.crewModifiers?.furnaceAttackPercent),
    },
    {
      stage: "target-element-damage",
      contributions: targetElementDamageContributions,
      // These effects are observed to add to the already-applied damage-dealt
      // and normal-attack-damage percentages instead of multiplying them again.
      additiveBasePercent:
        targetElementDamageContributions.length === 0 ? undefined : previouslyAppliedDamagePercent,
    },
  ];
  const stages: AppliedDamageStage[] = [];
  const defenseAdjustedBaseAttack = Math.ceil(attackPower.baseAttack / target.defense);
  let stagedDamage = defenseAdjustedBaseAttack;
  for (const definition of stageDefinitions) {
    const applied = applyStage(
      stagedDamage,
      definition.stage,
      definition.contributions,
      definition.rounding,
      definition.totalPercentOverride,
      definition.additiveBasePercent,
    );
    stages.push(applied);
    stagedDamage = applied.outputDamage;
  }
  const attackBeforeDefense = roundCalculation(stagedDamage * target.defense);

  return {
    schemaVersion: 1,
    status: "partial",
    model: "staged-normal-attack-base",
    targetEnemySlot: target.slot,
    enemyId: target.enemyId,
    defenseAdjustedBaseAttack,
    defenseRounding: "ceil",
    attackBeforeDefense,
    enemyDefense: target.defense,
    enemyDefenseSource: target.defenseSource,
    unroundedDamageBeforeRandomAndCap: roundCalculation(stagedDamage),
    damageBeforeRandomAndCap: Math.floor(roundCalculation(stagedDamage)),
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
