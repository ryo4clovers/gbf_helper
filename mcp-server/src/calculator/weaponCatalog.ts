import { readFileSync } from "node:fs";
import { z } from "zod";
import type {
  WeaponMasterCatalogEntry,
  WeaponSkillCatalogEntry,
  WeaponSkillEffectDefinition,
} from "./types.js";

const statusSchema = z.enum(["検証済み", "下書き"]);
const effectSchema = z
  .object({
    kind: z.enum([
      "normal-attack-up",
      "normal-stamina-up",
      "magna-stamina-up",
      "normal-enmity-up",
      "normal-hp-up",
      "magna-hp-up",
      "critical-rate-up",
      "double-attack-rate-up",
      "triple-attack-rate-up",
      "healing-cap-up",
      "debuff-resistance-up",
      "damage-dealt-up",
      "ability-damage-cap-up",
      "ability-supplemental-damage",
      "elemental-pursuit",
      "normal-skill-boost",
    ]),
    elementCode: z.string().min(1).optional(),
    amountPercent: z.number().finite().optional(),
    amountFlat: z.number().finite().nonnegative().optional(),
    skillLevel: z.number().int().nonnegative().optional(),
    boostGroup: z.enum(["normal", "magna"]).optional(),
    targetSkillNamePrefixes: z.array(z.string().min(1)).optional(),
    hpDependentCurve: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("stamina"), coefficient: z.number().finite().positive() }).strict(),
      z.object({ kind: z.literal("enmity") }).strict(),
    ]).optional(),
    note: z.string().min(1).optional(),
    verificationStatus: statusSchema.optional(),
    source: z.string().min(1).optional(),
    confirmedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict()
  .superRefine((effect, context) => {
    const isFlat = effect.kind === "ability-supplemental-damage";
    if (isFlat && effect.amountFlat === undefined) {
      context.addIssue({ code: "custom", message: `${effect.kind} requires amountFlat` });
    }
    if (isFlat && effect.amountPercent !== undefined) {
      context.addIssue({ code: "custom", message: `${effect.kind} must not use amountPercent` });
    }
    if (!isFlat && effect.amountPercent === undefined) {
      context.addIssue({ code: "custom", message: `${effect.kind} requires amountPercent` });
    }
    if (!isFlat && effect.amountFlat !== undefined) {
      context.addIssue({ code: "custom", message: `${effect.kind} must not use amountFlat` });
    }
  });

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

const skillAmountTableAssignmentSchema = z.object({
  tableId: z.string().min(1),
  elementCode: z.string().min(1),
}).strict();

const rateAmountTableAssignmentSchema = skillAmountTableAssignmentSchema.extend({
  boostGroup: z.enum(["normal", "magna"]),
}).strict();

const skillEntrySchema = z
  .object({
    skillId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    effects: z.array(effectSchema),
    normalAttackAmountTable: skillAmountTableAssignmentSchema.optional(),
    normalStaminaAmountTable: skillAmountTableAssignmentSchema.optional(),
    magnaStaminaAmountTable: skillAmountTableAssignmentSchema.optional(),
    normalEnmityAmountTable: skillAmountTableAssignmentSchema.optional(),
    normalHpAmountTable: skillAmountTableAssignmentSchema.optional(),
    magnaHpAmountTable: skillAmountTableAssignmentSchema.optional(),
    criticalRateAmountTable: rateAmountTableAssignmentSchema.optional(),
    doubleAttackRateAmountTable: rateAmountTableAssignmentSchema.optional(),
    tripleAttackRateAmountTable: rateAmountTableAssignmentSchema.optional(),
    healingCapAmountTable: rateAmountTableAssignmentSchema.optional(),
    debuffResistanceAmountTable: rateAmountTableAssignmentSchema.optional(),
    unsupportedEffects: z.array(z.string().min(1)).min(1).optional(),
    ...sourceFields,
  })
  .strict();

const skillsFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    skills: z.array(skillEntrySchema),
  })
  .strict();

const skillAmountTablesFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    tables: z.array(
      z.object({
        tableId: z.string().min(1),
        values: z.array(z.object({
          skillLevel: z.number().int().min(1).max(99),
          amountPercent: z.number().finite(),
        }).strict()).min(1),
        ...sourceFields,
      }).strict(),
    ),
  })
  .strict();

const hpDependentAmountTablesFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    tables: z.array(
      z.object({
        tableId: z.string().min(1),
        hpDependentCurve: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("stamina"), coefficient: z.number().finite().positive() }).strict(),
          z.object({ kind: z.literal("enmity") }).strict(),
        ]),
        values: z.array(z.object({
          skillLevel: z.number().int().min(1).max(99),
          amountPercent: z.number().finite(),
        }).strict()).min(1),
        ...sourceFields,
      }).strict(),
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
  const normalAttackTableFile = skillAmountTablesFileSchema.parse(
    readJson("weapon-skill-normal-attack-tables.v1.json"),
  );
  const normalHpTableFile = skillAmountTablesFileSchema.parse(
    readJson("weapon-skill-normal-hp-tables.v1.json"),
  );
  const rateTableFile = skillAmountTablesFileSchema.parse(
    readJson("weapon-skill-rate-tables.v1.json"),
  );
  const hpDependentTableFile = hpDependentAmountTablesFileSchema.parse(
    readJson("weapon-skill-hp-dependent-attack-tables.v1.json"),
  );
  const weapons = uniqueMap(weaponFile.weapons, (weapon) => weapon.weaponId, "weapon");
  const normalAttackTables = uniqueMap(
    normalAttackTableFile.tables,
    (table) => table.tableId,
    "normal attack amount table",
  );
  const normalHpTables = uniqueMap(
    normalHpTableFile.tables,
    (table) => table.tableId,
    "normal HP amount table",
  );
  const rateTables = uniqueMap(rateTableFile.tables, (table) => table.tableId, "rate amount table");
  const hpDependentTables = uniqueMap(
    hpDependentTableFile.tables,
    (table) => table.tableId,
    "HP-dependent attack amount table",
  );
  const expandedSkills = skillFile.skills.map((skill): WeaponSkillCatalogEntry => {
    const {
      normalAttackAmountTable,
      normalStaminaAmountTable,
      magnaStaminaAmountTable,
      normalEnmityAmountTable,
      normalHpAmountTable,
      magnaHpAmountTable,
      criticalRateAmountTable,
      doubleAttackRateAmountTable,
      tripleAttackRateAmountTable,
      healingCapAmountTable,
      debuffResistanceAmountTable,
      ...baseSkill
    } = skill;
    const assignments = [
      {
        kind: "normal-attack-up" as const,
        assignment: normalAttackAmountTable,
        tables: normalAttackTables,
        label: "normal attack",
      },
      {
        kind: "normal-stamina-up" as const,
        assignment: normalStaminaAmountTable,
        tables: hpDependentTables,
        label: "normal stamina",
      },
      {
        kind: "magna-stamina-up" as const,
        assignment: magnaStaminaAmountTable,
        tables: hpDependentTables,
        label: "magna stamina",
      },
      {
        kind: "normal-enmity-up" as const,
        assignment: normalEnmityAmountTable,
        tables: hpDependentTables,
        label: "normal enmity",
      },
      {
        kind: "normal-hp-up" as const,
        assignment: normalHpAmountTable,
        tables: normalHpTables,
        label: "normal HP",
      },
      {
        kind: "magna-hp-up" as const,
        assignment: magnaHpAmountTable,
        tables: normalHpTables,
        label: "magna HP",
      },
      {
        kind: "critical-rate-up" as const,
        assignment: criticalRateAmountTable,
        tables: rateTables,
        label: "critical rate",
      },
      {
        kind: "double-attack-rate-up" as const,
        assignment: doubleAttackRateAmountTable,
        tables: rateTables,
        label: "double attack rate",
      },
      {
        kind: "triple-attack-rate-up" as const,
        assignment: tripleAttackRateAmountTable,
        tables: rateTables,
        label: "triple attack rate",
      },
      {
        kind: "healing-cap-up" as const,
        assignment: healingCapAmountTable,
        tables: rateTables,
        label: "healing cap",
      },
      {
        kind: "debuff-resistance-up" as const,
        assignment: debuffResistanceAmountTable,
        tables: rateTables,
        label: "debuff resistance",
      },
    ];
    const generatedEffects: WeaponSkillEffectDefinition[] = [];
    for (const { kind, assignment, tables, label } of assignments) {
      if (assignment === undefined) continue;
      const table = tables.get(assignment.tableId);
      if (table === undefined) {
        throw new Error(
          `weapon skill ${skill.skillId} references unknown ${label} amount table ${assignment.tableId}`,
        );
      }
      generatedEffects.push(
        ...table.values
          .filter((value) => !baseSkill.effects.some(
            (effect) => effect.kind === kind && effect.skillLevel === value.skillLevel,
          ))
          .map((value): WeaponSkillEffectDefinition => ({
            kind,
            elementCode: assignment.elementCode,
            amountPercent: value.amountPercent,
            skillLevel: value.skillLevel,
            boostGroup: "boostGroup" in assignment
              ? assignment.boostGroup
              : kind.startsWith("magna-") ? "magna" : "normal",
            ...("hpDependentCurve" in table
              ? {
                  hpDependentCurve:
                    table.hpDependentCurve as WeaponSkillEffectDefinition["hpDependentCurve"],
                }
              : {}),
            verificationStatus: table.verificationStatus,
            source: table.source,
            ...(table.confirmedAt === undefined ? {} : { confirmedAt: table.confirmedAt }),
          })),
      );
    }
    return { ...baseSkill, effects: [...baseSkill.effects, ...generatedEffects] };
  });
  const skills = uniqueMap(expandedSkills, (skill) => skill.skillId, "weapon skill");

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
