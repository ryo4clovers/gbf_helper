import { readFileSync } from "node:fs";
import { z } from "zod";
import type { WeaponMasterCatalogEntry, WeaponSkillCatalogEntry } from "./types.js";

const statusSchema = z.enum(["検証済み", "下書き"]);
const effectSchema = z
  .object({
    kind: z.enum([
      "normal-attack-up",
      "critical-rate-up",
      "double-attack-rate-up",
      "triple-attack-rate-up",
      "elemental-pursuit",
      "normal-skill-boost",
    ]),
    elementCode: z.string().min(1).optional(),
    amountPercent: z.number().finite(),
    skillLevel: z.number().int().nonnegative().optional(),
    boostGroup: z.literal("normal").optional(),
    targetSkillNamePrefixes: z.array(z.string().min(1)).optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

const sourceFields = {
  verificationStatus: statusSchema,
  source: z.string().min(1),
  confirmedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
};

const levelStatsSchema = z
  .object({
    maximumLevel: z.number().int().min(1).max(250),
    points: z.array(
      z.object({
        level: z.number().int().min(1).max(250),
        attack: z.number().int().nonnegative(),
        hp: z.number().int().nonnegative(),
      }).strict(),
    ).min(2),
  })
  .strict()
  .superRefine((progression, context) => {
    const levels = progression.points.map((point) => point.level);
    if (levels.at(-1) !== progression.maximumLevel) {
      context.addIssue({ code: "custom", message: "levelStats must end at maximumLevel" });
    }
    if (levels.some((level, index) => index > 0 && level <= levels[index - 1])) {
      context.addIssue({ code: "custom", message: "levelStats points must be strictly ascending" });
    }
  });

const weaponsFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    weapons: z.array(
      z
        .object({
          weaponId: z.string().min(1),
          name: z.string().min(1),
          nameEn: z.string().min(1).optional(),
          elementCode: z.string().min(1),
          weaponKindCode: z.string().min(1),
          rarityCode: z.string().min(1),
          seriesId: z.string().min(1).optional(),
          selectionDefaults: z.object({
            level: z.number().int().positive().optional(),
            uncapLevel: z.number().int().nonnegative().optional(),
            skillLevel: z.number().int().min(1).max(99).optional(),
            attack: z.number().int().nonnegative().optional(),
            hp: z.number().int().nonnegative().optional(),
          }).strict().optional(),
          levelStats: levelStatsSchema.optional(),
          skillSlots: z.array(
            z
              .object({
                sourceKey: z.enum(["skill1", "skill2", "skill3", "skill4"]),
                skillId: z.string().min(1),
              })
              .strict(),
          ),
          listedSkills: z.array(
            z.object({
              sourceKey: z.enum(["skill1", "skill2", "skill3", "skill4"]),
              name: z.string().min(1),
              description: z.string().min(1),
            }).strict(),
          ).optional(),
          ...sourceFields,
        })
        .strict(),
    ),
  })
  .strict();

const skillsFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    skills: z.array(
      z
        .object({
          skillId: z.string().min(1),
          name: z.string().min(1),
          description: z.string().min(1),
          effects: z.array(effectSchema),
          ...sourceFields,
        })
        .strict(),
    ),
  })
  .strict();

export interface IncrementalWeaponCatalog {
  schemaVersion: 1;
  weapons: Map<string, WeaponMasterCatalogEntry>;
  skills: Map<string, WeaponSkillCatalogEntry>;
}

function readJson(relativePath: string): unknown {
  const path = new URL(`../../catalog/${relativePath}`, import.meta.url);
  return JSON.parse(readFileSync(path, "utf8"));
}

function uniqueMap<T>(items: T[], getId: (item: T) => string, label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    const id = getId(item);
    if (result.has(id)) throw new Error(`duplicate ${label} ID: ${id}`);
    result.set(id, item);
  }
  return result;
}

/** Loads and validates the small on-demand weapon/skill catalog on every call. */
export function loadIncrementalWeaponCatalog(): IncrementalWeaponCatalog {
  const weaponFile = weaponsFileSchema.parse(readJson("weapons.v1.json"));
  const skillFile = skillsFileSchema.parse(readJson("weapon-skills.v1.json"));
  const weapons = uniqueMap(weaponFile.weapons, (weapon) => weapon.weaponId, "weapon");
  const skills = uniqueMap(skillFile.skills, (skill) => skill.skillId, "weapon skill");

  for (const weapon of weapons.values()) {
    for (const slot of weapon.skillSlots) {
      if (!skills.has(slot.skillId)) {
        throw new Error(`weapon ${weapon.weaponId} references unknown skill ${slot.skillId}`);
      }
    }
  }

  return {
    schemaVersion: 1,
    weapons: weapons as Map<string, WeaponMasterCatalogEntry>,
    skills: skills as Map<string, WeaponSkillCatalogEntry>,
  };
}
