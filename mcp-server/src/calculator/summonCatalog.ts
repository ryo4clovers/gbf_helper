import { readFileSync } from "node:fs";
import { z } from "zod";
import type {
  BattleSnapshot,
  ResolvedSupportSummon,
  SummonMasterCatalogEntry,
} from "./types.js";

const auraEffectSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("elemental-attack-up"),
      elementCode: z.string().min(1),
      amountPercent: z.number().finite(),
      activation: z.enum(["always", "main-only"]),
      description: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("normal-skill-boost"),
      elementCode: z.string().min(1),
      amountPercent: z.number().finite(),
      targetSkillNamePrefixes: z.array(z.string().min(1)).min(1),
      activation: z.enum(["always", "main-only"]),
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
          verificationStatus: z.enum(["検証済み", "下書き"]),
          source: z.string().min(1),
          confirmedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        })
        .strict(),
    ),
  })
  .strict();

export interface IncrementalSummonCatalog {
  schemaVersion: 1;
  summons: Map<string, SummonMasterCatalogEntry>;
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
  if (master === undefined) return undefined;
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
