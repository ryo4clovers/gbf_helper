import { readFileSync } from "node:fs";
import { z } from "zod";
import type {
  BattleSnapshot,
  ResolvedSupportSummon,
  SummonMasterCatalogEntry,
} from "./types.js";

const auraEffectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("damage-cap-up"), elementCode: z.string().min(1), amountPercent: z.number().finite().nonnegative(),
    activation: z.enum(["always", "main-only", "sub-only"]), stackingGroup: z.string().min(1), description: z.string().min(1),
    targetElementCode: z.string().min(1).optional(),
  }).strict(),
  z.object({
    kind: z.literal("damage-dealt-up"), elementCode: z.string().min(1), amountPercent: z.number().finite().nonnegative(),
    activation: z.enum(["always", "main-only", "sub-only"]), stackingGroup: z.string().min(1), description: z.string().min(1),
    targetElementCode: z.string().min(1).optional(),
  }).strict(),
  z.object({ kind: z.literal("supplemental-damage"), elementCode: z.string().min(1), amountFlat: z.number().finite().nonnegative(),
    activation: z.enum(["always", "main-only", "sub-only"]), stackingGroup: z.string().min(1), description: z.string().min(1),
    enemyMaxHpPercent: z.number().positive().max(100).optional(), minimumHpPercent: z.number().min(0).max(100).optional(),
  }).strict(),
  z
    .object({
      kind: z.literal("elemental-attack-up"),
      elementCode: z.string().min(1),
      amountPercent: z.number().finite(),
      activation: z.enum(["always", "main-only", "sub-only"]),
      requiredPartyCharacterIds: z.array(z.string().min(1)).min(1).optional(),
      stackingGroup: z.string().min(1).optional(),
      description: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("normal-skill-boost"),
      elementCode: z.string().min(1),
      amountPercent: z.number().finite(),
      boostGroup: z.enum(["normal", "magna"]).optional(),
      targetSkillNamePrefixes: z.array(z.string().min(1)).min(1),
      activation: z.enum(["always", "main-only", "sub-only"]),
      description: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("character-attack-up"),
      elementCode: z.string().min(1),
      amountPercent: z.number().finite(),
      activation: z.enum(["always", "main-only", "sub-only"]),
      description: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.enum(["character-hp-up", "character-hp-down"]),
      elementCode: z.string().min(1),
      amountPercent: z.number().finite(),
      activation: z.enum(["always", "main-only", "sub-only"]),
      stackingGroup: z.string().min(1),
      description: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("character-hp-flat"),
      elementCode: z.string().min(1),
      amount: z.number().int().nonnegative(),
      activation: z.enum(["always", "main-only", "sub-only"]),
      description: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("utility"),
      description: z.string().min(1),
    })
    .strict(),
]);

const summonLevelStatsSchema = z
  .object({
    maximumLevel: z.number().int().min(1).max(250),
    points: z.array(
      z.object({
        level: z.number().int().min(1).max(250),
        uncapLevel: z.number().int().nonnegative(),
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

const summonCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    summons: z.array(
      z
        .object({
          summonId: z.string().min(1),
          name: z.string().min(1),
          elementCode: z.string().min(1),
          rarityCode: z.string().min(1),
          auraName: z.string().min(1),
          auraDescription: z.string().min(1),
          auraEffects: z.array(auraEffectSchema),
          auraMinimumLevel: z.number().int().positive().optional(),
          auraOverrides: z
            .array(
              z
                .object({
                  uncapLevel: z.number().int().nonnegative(),
                  auraDescription: z.string().min(1),
                  auraEffects: z.array(auraEffectSchema),
                  verificationStatus: z.enum(["検証済み", "下書き"]),
                  source: z.string().min(1),
                  confirmedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
                })
                .strict(),
            )
            .optional(),
          verificationStatus: z.enum(["検証済み", "下書き"]),
          source: z.string().min(1),
          confirmedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          supportSelectable: z.boolean(),
          levelStats: summonLevelStatsSchema.optional(),
          selectionDefaults: z
            .object({
              level: z.number().int().positive(),
              uncapLevel: z.number().int().nonnegative(),
              plusMark: z.number().int().min(0).max(99),
              attack: z.number().int().nonnegative(),
              hp: z.number().int().nonnegative(),
            })
            .strict()
            .optional(),
        })
        .strict(),
    ),
  })
  .strict();

export interface IncrementalSummonCatalog {
  schemaVersion: 1;
  summons: Map<string, SummonMasterCatalogEntry>;
}

/** Uses an exact verified uncap override when available, otherwise the catalog default. */
export function resolveCatalogSummonAura(
  master: SummonMasterCatalogEntry,
  uncapLevel?: number,
  level?: number,
): Pick<
  SummonMasterCatalogEntry,
  "auraDescription" | "auraEffects" | "verificationStatus" | "source" | "confirmedAt"
> {
  const override = master.auraOverrides?.find((candidate) => candidate.uncapLevel === uncapLevel);
  if (!override && master.auraMinimumLevel !== undefined && ((level !== undefined && level < master.auraMinimumLevel)
    || (uncapLevel !== undefined && uncapLevel < (master.selectionDefaults?.uncapLevel ?? 0)))) {
    return { ...master, auraEffects: [{ kind: "utility", description: `この段階の加護は未接続（登録値はLv${master.auraMinimumLevel}）` }] };
  }
  return override ?? master;
}

/** Loads the small on-demand summon/aura catalog. */
export function loadIncrementalSummonCatalog(): IncrementalSummonCatalog {
  const path = new URL("../../catalog/summons.v1.json", import.meta.url);
  const file = summonCatalogSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  const summons = new Map<string, SummonMasterCatalogEntry>();
  for (const summon of file.summons) {
    if (summons.has(summon.summonId)) throw new Error(`duplicate summon ID: ${summon.summonId}`);
    summons.set(summon.summonId, summon);
  }
  return { schemaVersion: 1, summons };
}

/** Resolves the sanitized support summon from a battle snapshot. */
export function resolveBattleSupportSummon(
  battle: BattleSnapshot,
  catalog: IncrementalSummonCatalog = loadIncrementalSummonCatalog(),
): ResolvedSupportSummon | undefined {
  const masterId = battle.supportSummon?.masterId;
  if (masterId === undefined) return undefined;
  const master = catalog.summons.get(masterId);
  if (master === undefined || !master.supportSelectable) return undefined;
  return {
    masterId,
    name: master.name,
    elementCode: master.elementCode,
    aura: {
      name: master.auraName,
      description: master.auraDescription,
      effects: master.auraEffects,
      verificationStatus: master.verificationStatus,
      source: master.source,
      confirmedAt: master.confirmedAt,
    },
  };
}
