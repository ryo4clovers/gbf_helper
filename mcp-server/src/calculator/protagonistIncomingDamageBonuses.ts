import type { CalculatorDeckProtagonistConfig } from "./types.js";

/** Existing inputs are total overrides; additive inputs exclude the deck LB. */
export function resolveProtagonistIncomingDamageBonuses(
  protagonist: CalculatorDeckProtagonistConfig,
  enemyElementCode: string,
  modifiers: {
    protagonistDefensePercent?: number;
    incomingElementalDamageReductionPercents?: number[];
    incomingDamageModifierMode?: "total" | "additional";
  },
) {
  const levels = protagonist.otherLimitBonusLevels ?? {};
  const amount = (id: number) => [0, 1, 3, 5][levels[String(id)] ?? 0];
  const defenseLimitBonusPercent = [2, 29, 81, 98].reduce((sum, id) => sum + amount(id), 0);
  const elementIndex = Number(enemyElementCode) - 1;
  const reductionLimitBonusPercents = [15, 75, 112]
    .map((start) => amount(start + elementIndex)).filter((percent) => percent > 0);
  const additional = modifiers.incomingDamageModifierMode === "additional";
  return {
    defensePercent: additional
      ? defenseLimitBonusPercent + (modifiers.protagonistDefensePercent ?? 0)
      : modifiers.protagonistDefensePercent ?? defenseLimitBonusPercent,
    elementalDamageReductionPercents: additional
      ? [...reductionLimitBonusPercents, ...(modifiers.incomingElementalDamageReductionPercents ?? [])]
      : modifiers.incomingElementalDamageReductionPercents ?? reductionLimitBonusPercents,
  };
}
