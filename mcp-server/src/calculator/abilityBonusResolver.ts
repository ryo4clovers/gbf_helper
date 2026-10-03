import type { CalculatorDeckProtagonistConfig } from "./types.js";

/** Shared account inputs exclude protagonist-only LB and completion bonuses. */
export function resolveAbilityBonuses(
  protagonist: CalculatorDeckProtagonistConfig,
  completion: { damagePercent: number; capPercent: number },
  modifiers: { abilityDamagePercent?: number; abilityDamageCapPercent?: number;
    abilityDamageLimitBonusPercent?: number; abilityDamageCapLimitBonusPercent?: number },
  isCharacter: boolean,
) {
  const levels = protagonist.otherLimitBonusLevels ?? {};
  const limitBonusPercent = isCharacter ? 0 : modifiers.abilityDamageLimitBonusPercent
    ?? [5, 32].reduce((sum, id) => sum + [0, 1, 3, 5][levels[String(id)] ?? 0], 0);
  const limitBonusDamageCapUpPercent = isCharacter ? 0 : modifiers.abilityDamageCapLimitBonusPercent
    ?? [0, 3, 5, 10][levels["84"] ?? 0] + [0, 1, 3, 5][levels["89"] ?? 0];
  const completionDamagePercent = isCharacter ? 0 : completion.damagePercent;
  const completionCapPercent = isCharacter ? 0 : completion.capPercent;
  return {
    abilityDamageUpPercent: (modifiers.abilityDamagePercent ?? 0) + limitBonusPercent + completionDamagePercent,
    abilityDamageCapUpPercent: (modifiers.abilityDamageCapPercent ?? 0) + limitBonusDamageCapUpPercent + completionCapPercent,
    limitBonusPercent, limitBonusDamageCapUpPercent, completionDamagePercent, completionCapPercent,
  };
}
