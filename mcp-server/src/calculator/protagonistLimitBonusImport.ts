import { z } from "zod";
import type { CalculatorDeckProtagonistConfig } from "./types.js";
import {
  PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS,
  PROTAGONIST_PROFICIENCY_ATTACK_LIMIT_BONUS_DEFINITIONS,
  PROTAGONIST_MULTIATTACK_LIMIT_BONUS_DEFINITIONS,
  PROTAGONIST_PARTY_HP_LIMIT_BONUS_DEFINITIONS,
  PROTAGONIST_CRITICAL_LIMIT_BONUS_DEFINITIONS,
} from "../../web/protagonist-displayed-stats.js";

const schema = z.object({ bonus_list: z.array(z.object({
  id: z.union([z.string(), z.number()]).transform(String).refine((id) => /^\d+$/.test(id)),
  current_level: z.union([z.number(), z.string().regex(/^[0-3]$/)]).transform(Number).pipe(z.number().int().min(0).max(3)),
})).max(200) });

/** Only copy LB allocations; displayed attack/HP already include their stat bonuses. */
export function importProtagonistLimitBonuses(input: unknown): Partial<CalculatorDeckProtagonistConfig> {
  const rows = schema.parse(input).bonus_list;
  if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error("Duplicate limit bonus IDs.");
  const fields = new Map<string, string>([
    ["1", "attackLimitBonusLevel"], ["3", "hpLimitBonusLevel"], ["103", "hp2LimitBonusLevel"],
    ...[
      ...PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS,
      ...PROTAGONIST_PROFICIENCY_ATTACK_LIMIT_BONUS_DEFINITIONS,
      ...PROTAGONIST_MULTIATTACK_LIMIT_BONUS_DEFINITIONS,
      ...PROTAGONIST_PARTY_HP_LIMIT_BONUS_DEFINITIONS,
      ...PROTAGONIST_CRITICAL_LIMIT_BONUS_DEFINITIONS,
    ].map((definition): [string, string] => [definition.limitBonusId, definition.fieldKey]),
  ]);
  const output: Record<string, unknown> = { otherLimitBonusLevels: {} };
  for (const row of rows) {
    const field = fields.get(row.id);
    if (field) output[field] = row.current_level;
    else (output.otherLimitBonusLevels as Record<string, number>)[row.id] = row.current_level;
  }
  return output;
}
