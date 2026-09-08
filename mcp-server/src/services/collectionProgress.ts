import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { z } from "zod";
import { loadIncrementalSummonCatalog } from "../calculator/summonCatalog.js";
import { loadIncrementalWeaponCatalog } from "../calculator/weaponCatalog.js";

const categorySchema = z.enum(["weapons", "summons"]);
const rarityCountsSchema = z.object({
  N: z.number().int().nonnegative(),
  R: z.number().int().nonnegative(),
  SR: z.number().int().nonnegative(),
  SSR: z.number().int().nonnegative(),
}).strict();
const archiveProgressSchema = z.object({
  schemaVersion: z.literal(1),
  archiveSnapshots: z.array(z.object({
    category: categorySchema,
    capturedCount: z.number().int().nonnegative(),
    capturedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scope: z.string().min(1),
    byRarity: rarityCountsSchema,
  }).strict()).length(2),
}).strict().superRefine((progress, context) => {
  const categories = progress.archiveSnapshots.map((snapshot) => snapshot.category);
  if (new Set(categories).size !== categories.length) {
    context.addIssue({ code: "custom", message: "archive snapshot categories must be unique" });
  }
  progress.archiveSnapshots.forEach((snapshot, index) => {
    const rarityTotal = Object.values(snapshot.byRarity).reduce((sum, count) => sum + count, 0);
    if (rarityTotal !== snapshot.capturedCount) {
      context.addIssue({
        code: "custom",
        path: ["archiveSnapshots", index, "byRarity"],
        message: "rarity counts must equal capturedCount",
      });
    }
  });
});

const KNOWLEDGE_ROOT = fileURLToPath(new URL("../../../knowledge/", import.meta.url));
const RARITY_ORDER = ["N", "R", "SR", "SSR", "未設定"];
const ELEMENT_ORDER = ["火", "水", "土", "風", "光", "闇", "無属性", "未設定"];
const RARITY_CODES: Record<string, string> = { "1": "N", "2": "R", "3": "SR", "4": "SSR" };
const ELEMENT_CODES: Record<string, string> = { "1": "火", "2": "水", "3": "土", "4": "風", "5": "光", "6": "闇" };

interface KnowledgeEntry {
  status: string;
  rarity: string;
  element: string;
  series: string;
  lastUpdated?: string;
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  return undefined;
}

export interface ProgressBreakdownEntry {
  label: string;
  count: number;
}

export interface CollectionProgressCategory {
  id: "weapons" | "summons";
  label: string;
  archive: {
    total: number;
    capturedAt: string;
    scope: string;
    byRarity: ProgressBreakdownEntry[];
  };
  knowledge: {
    total: number;
    verified: number;
    draft: number;
    latestUpdated?: string;
    byRarity: ProgressBreakdownEntry[];
    byElement: ProgressBreakdownEntry[];
    bySeries: ProgressBreakdownEntry[];
  };
  calculator: {
    total: number;
    verified: number;
    statReady: number;
    statReadyLabel: string;
    byRarity: ProgressBreakdownEntry[];
    byElement: ProgressBreakdownEntry[];
  };
  calculatorToKnowledgePercent: number;
}

export interface CollectionProgressView {
  schemaVersion: 1;
  summary: {
    archiveTotal: number;
    knowledgeTotal: number;
    calculatorTotal: number;
  };
  categories: CollectionProgressCategory[];
}

function readArchiveProgress() {
  const location = new URL("../../catalog/collection-progress.v1.json", import.meta.url);
  return archiveProgressSchema.parse(JSON.parse(readFileSync(location, "utf8")));
}

function loadKnowledgeEntries(category: "weapons" | "summons"): KnowledgeEntry[] {
  const directory = path.join(KNOWLEDGE_ROOT, category);
  return readdirSync(directory)
    .filter((file) => file.endsWith(".md") && file !== "README.md" && !file.startsWith("_"))
    .map((file) => matter(readFileSync(path.join(directory, file), "utf8")).data)
    .map((data) => ({
      status: String(data.status ?? "未設定"),
      rarity: String(data.rarity ?? "未設定").toUpperCase(),
      element: String(data.element ?? "未設定"),
      series: String(data.series ?? "未設定"),
      lastUpdated: normalizeDate(data.last_updated),
    }));
}

function countBy(values: string[], preferredOrder: string[] = []): ProgressBreakdownEntry[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left.label);
      const rightIndex = preferredOrder.indexOf(right.label);
      if (leftIndex !== -1 || rightIndex !== -1) {
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      }
      return right.count - left.count || left.label.localeCompare(right.label, "ja");
    });
}

function completeRarityBreakdown(values: ProgressBreakdownEntry[]): ProgressBreakdownEntry[] {
  const counts = new Map(values.map((entry) => [entry.label, entry.count]));
  return RARITY_ORDER.slice(0, 4).map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

function archiveRarityBreakdown(counts: z.infer<typeof rarityCountsSchema>): ProgressBreakdownEntry[] {
  return RARITY_ORDER.slice(0, 4).map((label) => ({
    label,
    count: counts[label as keyof z.infer<typeof rarityCountsSchema>],
  }));
}

function latestDate(entries: KnowledgeEntry[]): string | undefined {
  return entries
    .map((entry) => entry.lastUpdated)
    .filter((value): value is string => value !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort()
    .at(-1);
}

function percentage(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

function buildWeaponProgress(
  archive: z.infer<typeof archiveProgressSchema>["archiveSnapshots"][number],
): CollectionProgressCategory {
  const entries = loadKnowledgeEntries("weapons");
  const catalog = [...loadIncrementalWeaponCatalog().weapons.values()];
  return {
    id: "weapons",
    label: "武器",
    archive: {
      total: archive.capturedCount,
      capturedAt: archive.capturedAt,
      scope: archive.scope,
      byRarity: archiveRarityBreakdown(archive.byRarity),
    },
    knowledge: {
      total: entries.length,
      verified: entries.filter((entry) => entry.status === "検証済み").length,
      draft: entries.filter((entry) => entry.status === "下書き").length,
      latestUpdated: latestDate(entries),
      byRarity: completeRarityBreakdown(countBy(entries.map((entry) => entry.rarity), RARITY_ORDER)),
      byElement: countBy(entries.map((entry) => entry.element), ELEMENT_ORDER),
      bySeries: countBy(entries.map((entry) => entry.series)),
    },
    calculator: {
      total: catalog.length,
      verified: catalog.filter((entry) => entry.verificationStatus === "検証済み").length,
      statReady: catalog.filter((entry) => entry.levelStats !== undefined).length,
      statReadyLabel: "Lv境界登録",
      byRarity: completeRarityBreakdown(countBy(catalog.map((entry) => RARITY_CODES[entry.rarityCode] ?? "未設定"), RARITY_ORDER)),
      byElement: countBy(catalog.map((entry) => ELEMENT_CODES[entry.elementCode] ?? "未設定"), ELEMENT_ORDER),
    },
    calculatorToKnowledgePercent: percentage(catalog.length, entries.length),
  };
}

function buildSummonProgress(
  archive: z.infer<typeof archiveProgressSchema>["archiveSnapshots"][number],
): CollectionProgressCategory {
  const entries = loadKnowledgeEntries("summons");
  const catalog = [...loadIncrementalSummonCatalog().summons.values()];
  return {
    id: "summons",
    label: "召喚石",
    archive: {
      total: archive.capturedCount,
      capturedAt: archive.capturedAt,
      scope: archive.scope,
      byRarity: archiveRarityBreakdown(archive.byRarity),
    },
    knowledge: {
      total: entries.length,
      verified: entries.filter((entry) => entry.status === "検証済み").length,
      draft: entries.filter((entry) => entry.status === "下書き").length,
      latestUpdated: latestDate(entries),
      byRarity: completeRarityBreakdown(countBy(entries.map((entry) => entry.rarity), RARITY_ORDER)),
      byElement: countBy(entries.map((entry) => entry.element), ELEMENT_ORDER),
      bySeries: [],
    },
    calculator: {
      total: catalog.length,
      verified: catalog.filter((entry) => entry.verificationStatus === "検証済み").length,
      statReady: catalog.filter((entry) => entry.selectionDefaults !== undefined).length,
      statReadyLabel: "既定ステータス登録",
      byRarity: completeRarityBreakdown(countBy(catalog.map((entry) => RARITY_CODES[entry.rarityCode] ?? "未設定"), RARITY_ORDER)),
      byElement: countBy(catalog.map((entry) => ELEMENT_CODES[entry.elementCode] ?? "未設定"), ELEMENT_ORDER),
    },
    calculatorToKnowledgePercent: percentage(catalog.length, entries.length),
  };
}

/** Builds a privacy-safe progress view from committed knowledge and catalog data. */
export function createCollectionProgressView(): CollectionProgressView {
  const archiveProgress = readArchiveProgress();
  const weaponArchive = archiveProgress.archiveSnapshots.find((entry) => entry.category === "weapons");
  const summonArchive = archiveProgress.archiveSnapshots.find((entry) => entry.category === "summons");
  if (weaponArchive === undefined || summonArchive === undefined) {
    throw new Error("collection progress requires weapon and summon archive snapshots");
  }
  const categories = [buildWeaponProgress(weaponArchive), buildSummonProgress(summonArchive)];
  return {
    schemaVersion: 1,
    summary: {
      archiveTotal: categories.reduce((sum, category) => sum + category.archive.total, 0),
      knowledgeTotal: categories.reduce((sum, category) => sum + category.knowledge.total, 0),
      calculatorTotal: categories.reduce((sum, category) => sum + category.calculator.total, 0),
    },
    categories,
  };
}
