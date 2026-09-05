import { z } from "zod";
import type { AccountBonusSnapshot, DamageModifier, DamageModifierStage } from "./types.js";

type JsonRecord = Record<string, unknown>;

const itemSchema = z
  .object({
    item_id: z.union([z.string(), z.number()]),
    name: z.unknown().optional(),
    comment: z.unknown().optional(),
    set_flg: z.unknown().optional(),
    effective_acquired_bonus: z.unknown().optional(),
  })
  .passthrough();

const categorySchema = z
  .object({
    item: z.array(itemSchema),
  })
  .passthrough();

const responseSchema = z.array(categorySchema);

const ELEMENT_CODES: Record<string, string> = {
  火: "1",
  水: "2",
  土: "3",
  風: "4",
  光: "5",
  闇: "6",
};

function asRecord(value: unknown): JsonRecord | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as JsonRecord;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function optionalNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isAcquired(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function parsePercentText(value: unknown): number | undefined {
  const text = optionalString(value);
  if (text === undefined) return undefined;
  const match = text.replaceAll("＋", "+").match(/[+]?([0-9]+(?:\.[0-9]+)?)\s*[%％]/);
  return match === null ? undefined : Number(match[1]);
}

function makeModifier(
  itemId: string,
  itemName: string,
  stage: DamageModifierStage,
  amountPercent: number,
  options: Pick<DamageModifier, "elementCode" | "targetElementCode"> = {},
): DamageModifier {
  return {
    stage,
    amountPercent,
    sourceType: "account-item",
    sourceId: itemId,
    sourceName: itemName,
    ...options,
    // Captured in-game values, but frame placement still needs combat verification.
    verificationStatus: "下書き",
  };
}

function parseDetailedBonus(
  itemId: string,
  itemName: string,
  rawBonus: unknown,
  itemElementCode: string | undefined,
): DamageModifier | undefined {
  const bonus = asRecord(rawBonus);
  if (bonus === undefined) return undefined;
  const name = optionalString(bonus.name);
  const amountPercent = parsePercentText(bonus.detail);
  if (name === undefined || amountPercent === undefined) return undefined;

  const elementalAttack = name.match(/^([火水土風光闇])属性攻撃力$/);
  if (elementalAttack !== null) {
    return makeModifier(itemId, itemName, "elemental-attack", amountPercent, {
      elementCode: ELEMENT_CODES[elementalAttack[1]],
    });
  }

  const targetDamage = name.match(/^対([火水土風光闇])属性与ダメージ$/);
  if (targetDamage !== null) {
    return makeModifier(itemId, itemName, "target-element-damage", amountPercent, {
      elementCode: itemElementCode,
      targetElementCode: ELEMENT_CODES[targetDamage[1]],
    });
  }
  if (name === "通常攻撃ダメージ上限") {
    return makeModifier(itemId, itemName, "normal-attack-damage-cap", amountPercent, {
      elementCode: itemElementCode,
    });
  }
  return undefined;
}

function parseKnownStaticModifier(
  itemId: string,
  itemName: string,
  comment: unknown,
): DamageModifier | undefined {
  const amountPercent = parsePercentText(comment);
  if (amountPercent === undefined) return undefined;
  if (itemId === "9013") return makeModifier(itemId, itemName, "elemental-attack", amountPercent);
  if (itemId === "9014") return makeModifier(itemId, itemName, "damage-cap", amountPercent);
  return undefined;
}

/**
 * Normalizes acquired account-item bonuses without retaining inventory counts.
 * Category `is_active` is deliberately ignored because its effect semantics are unresolved.
 */
export function parseAccountBonusResponse(input: unknown): AccountBonusSnapshot {
  const categories = responseSchema.parse(input);
  const modifiers: DamageModifier[] = [];
  const issues: string[] = [];

  for (const category of categories) {
    for (const item of category.item) {
      if (!isAcquired(item.set_flg)) continue;
      const itemId = String(item.item_id);
      const itemName = optionalString(item.name) ?? `item:${itemId}`;
      const staticModifier = parseKnownStaticModifier(itemId, itemName, item.comment);
      if (staticModifier !== undefined) modifiers.push(staticModifier);

      if (Array.isArray(item.effective_acquired_bonus)) {
        const itemElementCode = item.effective_acquired_bonus.flatMap((rawBonus): string[] => {
          const name = optionalString(asRecord(rawBonus)?.name);
          const match = name?.match(/^([火水土風光闇])属性攻撃力$/);
          return match === undefined || match === null ? [] : [ELEMENT_CODES[match[1]]];
        })[0];
        for (const rawBonus of item.effective_acquired_bonus) {
          const modifier = parseDetailedBonus(itemId, itemName, rawBonus, itemElementCode);
          if (modifier !== undefined) modifiers.push(modifier);
        }
      } else {
        const effective = asRecord(item.effective_acquired_bonus);
        const current = asRecord(effective?.current_bonus);
        const name = optionalString(current?.name);
        const amountPercent = optionalNumber(current?.value ?? current?.bonus);
        if (name === "与ダメージ" && amountPercent !== undefined) {
          modifiers.push(makeModifier(itemId, itemName, "damage-dealt", amountPercent));
        }
      }
    }
  }

  if (modifiers.length === 0) issues.push("No supported acquired damage modifiers were found.");
  return { schemaVersion: 1, modifiers, issues };
}
