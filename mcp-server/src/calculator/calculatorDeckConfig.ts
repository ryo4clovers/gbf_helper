import { z } from "zod";
import { parseDeckResponse } from "./deckParser.js";
import type { CalculatorDeckConfig } from "./types.js";

const idSchema = z
  .union([z.string(), z.number().finite()])
  .transform((value) => String(value).trim())
  .pipe(z.string().min(1));

const finiteNumberSchema = z
  .union([
    z.number().finite(),
    z
      .string()
      .trim()
      .min(1)
      .transform((value, context) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: "expected a finite number" });
          return z.NEVER;
        }
        return parsed;
      }),
  ])
  .pipe(z.number().finite());

const nonNegativeNumberSchema = finiteNumberSchema.pipe(z.number().nonnegative());
const nonNegativeIntegerSchema = finiteNumberSchema.pipe(z.number().int().nonnegative());
const ratePercentSchema = finiteNumberSchema.pipe(z.number().min(0).max(100));
const equipmentPlusMarkSchema = finiteNumberSchema.pipe(z.number().int().min(0).max(99));
const positiveSlotSchema = finiteNumberSchema.pipe(z.number().int().positive());
const nameHintSchema = z.string().trim().min(1).optional();

const awakeningSchema = z
  .object({
    level: nonNegativeIntegerSchema.optional(),
    formCode: idSchema.optional(),
  })
  .strict();

const protagonistSchema = z
  .object({
    elementCode: idSchema.optional(),
    jobId: idSchema.optional(),
    jobNameHint: nameHintSchema,
    jobLevel: nonNegativeIntegerSchema.optional(),
    masterLevel: nonNegativeIntegerSchema.optional(),
    perfectionProofLevel: nonNegativeIntegerSchema.optional(),
    baseDoubleAttackRate: ratePercentSchema.optional(),
    baseTripleAttackRate: ratePercentSchema.optional(),
    attackOverride: nonNegativeNumberSchema.optional(),
    hpOverride: nonNegativeNumberSchema.optional(),
  })
  .strict();

const weaponSchema = z
  .object({
    slot: positiveSlotSchema,
    position: z.enum(["main", "grid"]),
    weaponId: idSchema,
    isJobFallback: z.boolean().optional(),
    nameHint: nameHintSchema,
    level: nonNegativeIntegerSchema.optional(),
    skillLevel: nonNegativeIntegerSchema.optional(),
    uncapLevel: nonNegativeIntegerSchema.optional(),
    plusMark: equipmentPlusMarkSchema.optional(),
    awakening: awakeningSchema.optional(),
    attackOverride: nonNegativeNumberSchema.optional(),
    hpOverride: nonNegativeNumberSchema.optional(),
  })
  .strict();

const summonSchema = z
  .object({
    slot: positiveSlotSchema,
    position: z.enum(["main", "grid", "sub"]),
    summonId: idSchema,
    nameHint: nameHintSchema,
    level: nonNegativeIntegerSchema.optional(),
    uncapLevel: nonNegativeIntegerSchema.optional(),
    plusMark: equipmentPlusMarkSchema.optional(),
    attackOverride: nonNegativeNumberSchema.optional(),
    hpOverride: nonNegativeNumberSchema.optional(),
  })
  .strict();

const characterSchema = z
  .object({
    slot: positiveSlotSchema,
    position: z.enum(["front", "back"]),
    characterId: idSchema,
    nameHint: nameHintSchema,
    level: nonNegativeIntegerSchema.optional(),
    uncapLevel: nonNegativeIntegerSchema.optional(),
    plusMark: equipmentPlusMarkSchema.optional(),
    attackOverride: nonNegativeNumberSchema.optional(),
    hpOverride: nonNegativeNumberSchema.optional(),
  })
  .strict();

const calculatorDeckConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    format: z.literal("gbf-helper-calculator-deck"),
    name: z.string().trim().min(1).optional(),
    protagonist: protagonistSchema,
    weapons: z.array(weaponSchema).default([]),
    summons: z.array(summonSchema).default([]),
    characters: z.array(characterSchema).default([]),
  })
  .strict()
  .superRefine((config, context) => {
    const reportDuplicateKeys = (
      keys: string[],
      path: Array<string | number>,
      label: string,
    ): void => {
      const seen = new Set<string>();
      keys.forEach((key, index) => {
        if (seen.has(key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `duplicate ${label}: ${key}`,
            path: [...path, index],
          });
        }
        seen.add(key);
      });
    };

    reportDuplicateKeys(
      config.weapons.map((weapon) => String(weapon.slot)),
      ["weapons"],
      "weapon slot",
    );
    reportDuplicateKeys(
      config.summons.map((summon) => `${summon.position}:${summon.slot}`),
      ["summons"],
      "summon position/slot",
    );
    reportDuplicateKeys(
      config.characters.map((character) => String(character.slot)),
      ["characters"],
      "character slot",
    );

    if (config.weapons.filter((weapon) => weapon.position === "main").length > 1) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "only one main weapon is allowed", path: ["weapons"] });
    }
    config.weapons.forEach((weapon, index) => {
      if (weapon.isJobFallback === true && (weapon.position !== "main" || weapon.slot !== 1)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "a job fallback weapon is only allowed in main slot 1",
          path: ["weapons", index, "isJobFallback"],
        });
      }
    });
    if (config.summons.filter((summon) => summon.position === "main").length > 1) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "only one main summon is allowed", path: ["summons"] });
    }
  });

function removeUndefinedValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeUndefinedValues);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .map(([key, nested]) => [key, removeUndefinedValues(nested)]),
  );
}

/** Validates user-authored calculator deck JSON and normalizes IDs/numeric strings. */
export function parseCalculatorDeckConfig(input: unknown): CalculatorDeckConfig {
  return calculatorDeckConfigSchema.parse(input);
}

/**
 * Converts a live game deck response to the stable, user-editable config.
 * Account/instance IDs and game UI calculation results are intentionally omitted.
 */
export function convertDeckResponseToCalculatorDeckConfig(input: unknown): CalculatorDeckConfig {
  const snapshot = parseDeckResponse(input);
  const config = {
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    name: snapshot.name,
    protagonist: {
      elementCode: snapshot.protagonist.elementCode,
      jobId: snapshot.protagonist.job?.masterId,
      jobNameHint: snapshot.protagonist.job?.name,
      jobLevel: snapshot.protagonist.job?.level,
      masterLevel: snapshot.protagonist.job?.masterLevel,
      perfectionProofLevel: snapshot.protagonist.job?.perfectionProofLevel,
      baseDoubleAttackRate: snapshot.protagonist.job?.baseDoubleAttackRate,
      baseTripleAttackRate: snapshot.protagonist.job?.baseTripleAttackRate,
      attackOverride: snapshot.protagonist.attack,
      hpOverride: snapshot.protagonist.hp,
    },
    weapons: snapshot.weapons.map((weapon) => ({
      slot: weapon.slot,
      position: weapon.position,
      weaponId: weapon.masterId,
      isJobFallback: weapon.isJobFallback,
      nameHint: weapon.name,
      level: weapon.level,
      skillLevel: weapon.skillLevel,
      uncapLevel: weapon.uncapLevel,
      plusMark: weapon.plusMark,
      awakening: weapon.awakening,
      attackOverride: weapon.attack,
      hpOverride: weapon.hp,
    })),
    summons: snapshot.summons.map((summon) => ({
      slot: summon.slot,
      position: summon.position,
      summonId: summon.masterId,
      nameHint: summon.name,
      level: summon.level,
      uncapLevel: summon.uncapLevel,
      plusMark: summon.plusMark,
      attackOverride: summon.attack,
      hpOverride: summon.hp,
    })),
    characters: snapshot.characters.map((character) => ({
      slot: character.slot,
      position: character.position,
      characterId: character.masterId,
      nameHint: character.name,
      level: character.level,
      uncapLevel: character.uncapLevel,
      plusMark: character.plusMark,
      attackOverride: character.attack,
      hpOverride: character.hp,
    })),
  };
  return parseCalculatorDeckConfig(removeUndefinedValues(config));
}
