import { parseAccountBonusResponse } from "./accountBonusParser.js";
import { parseBattleStartResponse } from "./battleStartParser.js";
import { parseDeckResponse } from "./deckParser.js";
import type { CrewDamageModifierInput, DamageCalculationInput } from "./types.js";

export interface DamageCalculationInputOptions {
  /** Used when start.json does not expose the selected enemy's defense. */
  enemyDefenseOverride?: number;
  /** Optional acquired-item response such as the supplied `1.json`; normalized immediately. */
  accountBonusResponse?: unknown;
  /** Explicit user input because crew ship/furnace state is not present in deck/start responses. */
  crewModifiers?: CrewDamageModifierInput;
}

function validateOptionalPercent(value: number | undefined, path: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new Error(`${path} must be a finite non-negative number`);
  }
}

/**
 * Creates the stable boundary consumed by future damage formula modules.
 * Defense and other values absent from the captured responses can be enriched
 * after this step without coupling the formula to the live API shape.
 */
export function createDamageCalculationInput(
  deckResponse: unknown,
  battleStartResponse: unknown,
  targetEnemySlot: number,
  options: DamageCalculationInputOptions = {},
): DamageCalculationInput {
  if (!Number.isInteger(targetEnemySlot) || targetEnemySlot <= 0) {
    throw new Error("targetEnemySlot must be a positive integer");
  }

  const deck = parseDeckResponse(deckResponse);
  const battle = parseBattleStartResponse(battleStartResponse);
  if (!battle.enemies.some((enemy) => enemy.slot === targetEnemySlot)) {
    throw new Error(`target enemy slot ${targetEnemySlot} was not found`);
  }
  if (
    options.enemyDefenseOverride !== undefined &&
    (!Number.isFinite(options.enemyDefenseOverride) || options.enemyDefenseOverride <= 0)
  ) {
    throw new Error("enemyDefenseOverride must be a finite positive number");
  }
  validateOptionalPercent(options.crewModifiers?.shipAttackPercent, "crewModifiers.shipAttackPercent");
  validateOptionalPercent(options.crewModifiers?.furnaceAttackPercent, "crewModifiers.furnaceAttackPercent");
  const target = battle.enemies.find((enemy) => enemy.slot === targetEnemySlot);
  if (target !== undefined && options.enemyDefenseOverride !== undefined) {
    target.defense = options.enemyDefenseOverride;
    target.defenseSource = "user-override";
  }

  return {
    schemaVersion: 1,
    deck,
    battle,
    targetEnemySlot,
    accountBonuses:
      options.accountBonusResponse === undefined
        ? undefined
        : parseAccountBonusResponse(options.accountBonusResponse),
    crewModifiers: options.crewModifiers,
  };
}
