import { calculateArticleBaseDamage, type ArticleBaseDamageOptions } from "./articleBaseDamageCalculator.js";
import type { DefenseAdjustedBaseDamageResult } from "./baseDamageCalculator.js";
import type { NormalAttackPowerResult } from "./normalAttackPowerCalculator.js";
import type { HpDependentAttackResult } from "./hpDependentAttackCalculator.js";
import { calculateEffectivePursuitDamage, type EffectivePursuitDamageResult } from "./pursuitDamageCalculator.js";
import type { DamageCalculationInput } from "./types.js";

export type DestructionPursuitRoundingModel = "legacy-pre-random-ceil" | "parent-ceil"
  | "normal-skill-ceil-and-parent-ceil" | "ex-skill-ceil-and-parent-ceil";

export interface DestructionPursuitRoundingCandidate {
  model: DestructionPursuitRoundingModel;
  verificationStatus: "下書き";
  baseDamage: DefenseAdjustedBaseDamageResult;
  pursuitDamage: EffectivePursuitDamageResult;
}

/** Fixed hypotheses applied without consulting observed damage; the production result is never replaced. */
export function calculateDestructionPursuitRoundingCandidates(
  input: DamageCalculationInput,
  attackPower: NormalAttackPowerResult,
  hpDependentAttack: HpDependentAttackResult,
  production: EffectivePursuitDamageResult,
): DestructionPursuitRoundingCandidate[] {
  if (!production.stages) throw new Error("Destruction rounding comparison requires the staged pursuit model.");
  const definitions: Array<{ model: DestructionPursuitRoundingModel; roundingStage?: ArticleBaseDamageOptions["weaponSkillRoundingStage"] }> = [
    { model: "legacy-pre-random-ceil" },
    { model: "parent-ceil" },
    { model: "normal-skill-ceil-and-parent-ceil", roundingStage: "normal-weapon-skill" },
    { model: "ex-skill-ceil-and-parent-ceil", roundingStage: "ex-weapon-skill" },
  ];
  return definitions.map(({ model, roundingStage }) => {
    const baseDamage = calculateArticleBaseDamage(input, attackPower, hpDependentAttack, "destruction",
      { weaponSkillRoundingStage: roundingStage });
    const pursuitDamage = model === "parent-ceil" ? production : calculateEffectivePursuitDamage(
      input.deck, baseDamage.articleTrace!.prePostCapDamage, {
        kind: "destruction-pursuit", nominalPreparation: model === "legacy-pre-random-ceil" ? "ceil" : "none",
        finalRounding: production.damageDistribution.finalRounding,
        multiplierMin: production.damageDistribution.multiplierMin, multiplierMax: production.damageDistribution.multiplierMax,
        multiplierStep: production.damageDistribution.multiplierStep,
        stages: { ...production.stages!, beforePursuitRounding: model === "legacy-pre-random-ceil" ? undefined : "ceil" },
      });
    return { model, verificationStatus: "下書き", baseDamage, pursuitDamage };
  });
}
