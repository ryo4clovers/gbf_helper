import { readFileSync } from "node:fs";
import { z } from "zod";
import { loadIncrementalWeaponCatalog } from "../calculator/weaponCatalog.js";
import { loadIncrementalSummonCatalog } from "../calculator/summonCatalog.js";
import { weaponCoverage, weaponEffectTypes, type CatalogEffectCoverage, summonCoverage, characterCoverage, emptyFacets, seriesLabels, type CatalogCoverage, type CatalogFacets } from "./catalogCoverage.js";
import { createSelectableCharacterCatalog, readCharacterCatalogRecords } from "../calculator/characterCatalogView.js";

const targetsSchema = z.object({
  schemaVersion: z.literal(1),
  confirmedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  totals: z.object({
    weapons: z.number().int().positive(),
    summons: z.number().int().positive(),
    characters: z.number().int().positive(),
  }).strict(),
}).strict();

export type CalculatorCatalogCategoryId = "weapons" | "summons" | "characters";

export interface CalculatorCatalogItem {
  id: string;
  name: string;
  nameEn?: string;
  elementCode: string;
  rarity: string;
  verificationStatus: "検証済み" | "下書き" | "未着手";
  detail: string;
  facets: CatalogFacets;
  coverage: CatalogCoverage;
}

export interface CalculatorCatalogProgressCategory {
  id: CalculatorCatalogCategoryId;
  label: string;
  registeredCount: number;
  targetCount: number;
  remainingCount: number;
  coveragePercent: number;
  exceedsTarget: boolean;
  items: CalculatorCatalogItem[];
  stateCounts: Record<string, number>;
}

export interface CalculatorCatalogProgressView {
  schemaVersion: 2;
  targetConfirmedAt: string;
  targetSource: string;
  categories: CalculatorCatalogProgressCategory[];
}

const RARITY_CODES: Record<string, string> = { "1": "N", "2": "R", "3": "SR", "4": "SSR" };
const WEAPON_KIND_CODES: Record<string, string> = {
  "1": "剣",
  "2": "短剣",
  "3": "槍",
  "4": "斧",
  "5": "杖",
  "6": "銃",
  "7": "格闘",
  "8": "弓",
  "9": "楽器",
  "10": "刀",
};

function readTargets(): z.infer<typeof targetsSchema> {
  const location = new URL("../../catalog/calculator-catalog-targets.v1.json", import.meta.url);
  return targetsSchema.parse(JSON.parse(readFileSync(location, "utf8")));
}

function percentage(part: number, total: number): number {
  return Math.round((part / total) * 1000) / 10;
}

function category(
  id: CalculatorCatalogCategoryId,
  label: string,
  targetCount: number,
  items: CalculatorCatalogItem[],
): CalculatorCatalogProgressCategory {
  return {
    id,
    label,
    registeredCount: items.length,
    targetCount,
    remainingCount: Math.max(targetCount - items.length, 0),
    coveragePercent: percentage(items.length, targetCount),
    exceedsTarget: items.length > targetCount,
    items,
    stateCounts: {
      connected: items.filter(item => item.coverage.connection === "connected").length,
      partial: items.filter(item => item.coverage.connection === "partial").length,
      unconnected: items.filter(item => item.coverage.connection === "unconnected").length,
      unknown: items.filter(item => item.coverage.connection === "unknown").length,
      missing: items.filter(item => item.coverage.missing.length > 0).length,
      unverified: items.filter(item => item.verificationStatus !== "検証済み").length,
    },
  };
}

/** Builds a browser-safe view of calculator catalog coverage and registered entries. */
export function createCalculatorCatalogProgressView(): CalculatorCatalogProgressView {
  const targets = readTargets();
  const weaponCatalog = loadIncrementalWeaponCatalog();
  const summonCatalog = loadIncrementalSummonCatalog();
  const skillCoverageCache = new Map<string, CatalogEffectCoverage[]>();
  const weapons = [...weaponCatalog.weapons.values()].sort((a, b) => a.name.localeCompare(b.name, "ja")).map((weapon): CalculatorCatalogItem => ({
    coverage: weaponCoverage(weapon, weaponCatalog.skills, skillCoverageCache),
    facets: { ...emptyFacets(), weaponKind: [WEAPON_KIND_CODES[weapon.weaponKindCode] ?? "未設定"], series: weapon.seriesId ? [seriesLabels[weapon.seriesId] ?? `シリーズID ${weapon.seriesId}（表示名未登録）`] : [], skills: [...weapon.skillSlots.flatMap(slot => weaponCatalog.skills.get(slot.skillId)?.name ?? []), ...(weapon.listedSkills ?? []).map(skill => skill.name)], effectTypes: weaponEffectTypes(weapon, weaponCatalog.skills) },
    id: weapon.weaponId,
    name: weapon.name,
    nameEn: weapon.nameEn,
    elementCode: weapon.elementCode,
    rarity: RARITY_CODES[weapon.rarityCode] ?? "未設定",
    verificationStatus: weapon.verificationStatus,
    detail: [WEAPON_KIND_CODES[weapon.weaponKindCode] ?? "武器種未設定", weapon.levelStats ? "Lv境界あり" : "Lv境界なし"].join(" · "),
  }));
  const summons = [...summonCatalog.summons.values()].sort((a, b) => a.name.localeCompare(b.name, "ja")).map((summon): CalculatorCatalogItem => ({
    coverage: summonCoverage(summon),
    facets: emptyFacets(),
    id: summon.summonId,
    name: summon.name,
    elementCode: summon.elementCode,
    rarity: RARITY_CODES[summon.rarityCode] ?? "未設定",
    verificationStatus: summon.verificationStatus,
    detail: summon.supportSelectable ? "サポート選択可" : "サポート選択不可",
  }));
  const characterRecords = readCharacterCatalogRecords();
  const characterRecordsById = new Map(characterRecords.map(record => [record.data.id, record]));
  const characters = createSelectableCharacterCatalog(undefined, characterRecords).characters.map((character): CalculatorCatalogItem => ({
    ...characterCoverage(character.characterId, character.masterId, character.styleId, characterRecordsById.get(character.characterId)),
    id: character.characterId,
    name: character.name,
    nameEn: character.nameEn,
    elementCode: character.elementCode,
    rarity: character.rarity,
    verificationStatus: character.verificationStatus,
    detail: character.nameEn,
  }));

  return {
    schemaVersion: 2,
    targetConfirmedAt: targets.confirmedAt,
    targetSource: targets.source,
    categories: [
      category("weapons", "武器", targets.totals.weapons, weapons),
      category("summons", "召喚石", targets.totals.summons, summons),
      category("characters", "キャラクター", targets.totals.characters, characters),
    ],
  };
}
