import { readFileSync } from "node:fs";
import { z } from "zod";
import { createSelectableCharacterCatalog } from "../calculator/characterCatalogView.js";
import { createSelectableSummonCatalog } from "../calculator/summonCatalogView.js";
import { createSelectableWeaponCatalog } from "../calculator/weaponCatalogView.js";

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
  };
}

/** Builds a browser-safe view of calculator catalog coverage and registered entries. */
export function createCalculatorCatalogProgressView(): CalculatorCatalogProgressView {
  const targets = readTargets();
  const weapons = createSelectableWeaponCatalog().weapons.map((weapon): CalculatorCatalogItem => ({
    id: weapon.weaponId,
    name: weapon.name,
    nameEn: weapon.nameEn,
    elementCode: weapon.elementCode,
    rarity: RARITY_CODES[weapon.rarityCode] ?? "未設定",
    verificationStatus: weapon.verificationStatus,
    detail: [WEAPON_KIND_CODES[weapon.weaponKindCode] ?? "武器種未設定", weapon.levelStats ? "Lv境界あり" : "Lv境界なし"].join(" · "),
  }));
  const summons = createSelectableSummonCatalog().summons.map((summon): CalculatorCatalogItem => ({
    id: summon.summonId,
    name: summon.name,
    elementCode: summon.elementCode,
    rarity: RARITY_CODES[summon.rarityCode] ?? "未設定",
    verificationStatus: summon.verificationStatus,
    detail: summon.supportSelectable ? "サポート選択可" : "サポート選択不可",
  }));
  const characters = createSelectableCharacterCatalog().characters.map((character): CalculatorCatalogItem => ({
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
