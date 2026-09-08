import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const KNOWLEDGE_CATALOG = join(ROOT, "knowledge", "weapons", "wiki-catalog.v1.json");
const CALCULATOR_CATALOG = join(ROOT, "mcp-server", "catalog", "weapons.v1.json");
const APPLY = process.argv.includes("--apply");
const inputDirectoryIndex = process.argv.indexOf("--input-dir");
const inputDirectory = inputDirectoryIndex >= 0
  ? resolve(process.argv[inputDirectoryIndex + 1])
  : undefined;
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const ELEMENT_CODES = new Map([
  ["fire", "1"],
  ["water", "2"],
  ["earth", "3"],
  ["wind", "4"],
  ["light", "5"],
  ["dark", "6"],
  ["any", "0"],
]);
const WEAPON_KIND_CODES = new Map([
  ["sabre", "1"],
  ["dagger", "2"],
  ["spear", "3"],
  ["axe", "4"],
  ["staff", "5"],
  ["gun", "6"],
  ["melee", "7"],
  ["bow", "8"],
  ["harp", "9"],
  ["katana", "10"],
]);
const RARITY_CODES = new Map([
  ["N", "1"],
  ["R", "2"],
  ["SR", "3"],
  ["SSR", "4"],
]);
const STAT_LEVELS = {
  N: [1, 30, 80, 130, 180],
  R: [1, 40, 90, 140, 190],
  SR: [1, 60, 120, 150, 200],
  SSR: [1, 100, 150, 200, 250],
};

function usage(message) {
  if (message) console.error(message);
  console.error("usage: node scripts/data-collection/import-wiki-weapon-cargo.mjs --input-dir <dir> [--apply]");
  process.exit(1);
}

function optionalText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function optionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function positiveNumber(value) {
  const number = optionalNumber(value);
  return number && number > 0 ? number : undefined;
}

function cargoJson(markdown, filename) {
  const start = markdown.indexOf("{");
  if (start < 0) throw new Error(`${filename}: Cargo JSONが見つかりません`);
  const parsed = JSON.parse(markdown.slice(start));
  if (!Array.isArray(parsed.cargoquery)) {
    throw new Error(`${filename}: cargoquery配列がありません`);
  }
  return parsed.cargoquery.map((entry) => entry.title);
}

function statPoints(row) {
  const levels = STAT_LEVELS[row.rarity];
  if (!levels) return [];
  return levels.flatMap((level, index) => {
    const attack = positiveNumber(row[`atk${index + 1}`]);
    const hp = positiveNumber(row[`hp${index + 1}`]);
    return attack === undefined && hp === undefined
      ? []
      : [{ level, attack: attack ?? 0, hp: hp ?? 0 }];
  });
}

function skillStage(row, prefix) {
  const name = optionalText(row[`${prefix} name`]);
  const description = optionalText(row[`${prefix} desc`]);
  const icon = optionalText(row[`${prefix} icon`]);
  const level = optionalNumber(row[`${prefix} lvl`]);
  if (!name && !description && !icon && level === undefined) return undefined;
  return {
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    ...(icon ? { icon } : {}),
    ...(level !== undefined ? { level } : {}),
  };
}

function normalizeRow(row) {
  const wikiId = String(row.id ?? "");
  const points = statPoints(row);
  const skills = [1, 2, 3].flatMap((slot) => {
    const initial = skillStage(row, `s${slot}`);
    const upgraded = skillStage(row, `s${slot}u1`);
    return initial || upgraded ? [{ slot, ...(initial ? { initial } : {}), ...(upgraded ? { upgraded } : {}) }] : [];
  });
  const chargeAttacks = [1, 2, 3].flatMap((stage) => {
    const name = optionalText(row[`ca${stage} name`]);
    const description = optionalText(row[`ca${stage} desc`]);
    return name || description ? [{ stage, ...(name ? { name } : {}), ...(description ? { description } : {}) }] : [];
  });
  return {
    wikiKey: String(row["unique key"] ?? wikiId),
    wikiId,
    weaponId: /^\d{10}$/u.test(wikiId) ? wikiId : null,
    nameJa: optionalText(row.jpname) ?? null,
    nameEn: optionalText(row.name) ?? "名称未登録",
    title: optionalText(row.title) ?? null,
    rarity: optionalText(row.rarity) ?? null,
    element: optionalText(row.element) ?? null,
    weaponType: optionalText(row.type) ?? null,
    anyWeapon: optionalText(row["any weapon"]) ?? null,
    series: optionalText(row.series) ?? null,
    group: optionalText(row.grp) ?? null,
    releaseDate: optionalText(row["release date"]) ?? null,
    fourStarDate: optionalText(row["4star date"]) ?? null,
    fiveStarDate: optionalText(row["5star date"]) ?? null,
    awakening: {
      available: optionalText(row.awakening) ?? null,
      types: [optionalText(row["awakening type1"]), optionalText(row["awakening type2"])].filter(Boolean),
    },
    uncaps: {
      minimum: optionalNumber(row["evo min"]) ?? null,
      base: optionalNumber(row["evo base"]) ?? null,
      maximum: optionalNumber(row["evo max"]) ?? null,
      reduced: optionalNumber(row["evo red"]) ?? null,
    },
    statPoints: points,
    skills,
    chargeAttacks,
  };
}

function calculatorListedSkills(entry) {
  return entry.skills.flatMap((skill) => {
    const stage = skill.upgraded?.name ? skill.upgraded : skill.initial;
    if (!stage?.name) return [];
    return [{
      sourceKey: `skill${skill.slot}`,
      name: stage.name,
      description: stage.description ?? "効果量・計算枠は要検証",
    }];
  });
}

function calculatorEntry(entry) {
  if (!entry.weaponId) return undefined;
  const elementCode = ELEMENT_CODES.get(entry.element);
  const weaponKindCode = WEAPON_KIND_CODES.get(entry.weaponType);
  const rarityCode = RARITY_CODES.get(entry.rarity);
  if (!elementCode || !weaponKindCode || !rarityCode) return undefined;
  const lastPoint = entry.statPoints.at(-1);
  const levelStats = entry.statPoints.length >= 2
    ? { maximumLevel: lastPoint.level, points: entry.statPoints }
    : undefined;
  const listedSkills = calculatorListedSkills(entry);
  return {
    weaponId: entry.weaponId,
    name: entry.nameJa ?? entry.nameEn,
    nameEn: entry.nameEn,
    elementCode,
    weaponKindCode,
    rarityCode,
    ...(lastPoint ? {
      selectionDefaults: {
        level: lastPoint.level,
        ...(entry.uncaps.maximum !== null ? { uncapLevel: entry.uncaps.maximum } : {}),
        attack: lastPoint.attack,
        hp: lastPoint.hp,
      },
    } : {}),
    ...(levelStats ? { levelStats } : {}),
    skillSlots: [],
    ...(listedSkills.length ? { listedSkills } : {}),
    verificationStatus: "下書き",
    source: `gbf.wiki Cargo weaponsテーブルをr.jina.ai経由で${TODAY}参照。ID・名称・属性・武器種・上限解放境界ステータス・スキル文は二次情報のため要検証`,
  };
}

if (!inputDirectory) usage("--input-dirが必要です");
const files = readdirSync(inputDirectory)
  .filter((name) => /^gbf-wiki-cargo-weapons-\d{4}\.md$/u.test(name))
  .sort();
if (files.length === 0) usage(`${inputDirectory}: 入力ファイルがありません`);

const entries = files
  .flatMap((file) => cargoJson(readFileSync(join(inputDirectory, file), "utf8"), file))
  .map(normalizeRow)
  .sort((left, right) => left.wikiKey.localeCompare(right.wikiKey));
const duplicateKeys = entries.filter((entry, index) => entries.findIndex((candidate) => candidate.wikiKey === entry.wikiKey) !== index);
if (duplicateKeys.length) throw new Error(`wikiKeyが重複しています: ${duplicateKeys.map(({ wikiKey }) => wikiKey).join(", ")}`);

const existingCatalog = JSON.parse(readFileSync(CALCULATOR_CATALOG, "utf8"));
const calculatorById = new Map(existingCatalog.weapons.map((weapon) => [weapon.weaponId, weapon]));
const skipped = [];
let added = 0;
let refreshed = 0;
for (const entry of entries) {
  const weapon = calculatorEntry(entry);
  if (!weapon) {
    skipped.push({ wikiId: entry.wikiId, name: entry.nameJa ?? entry.nameEn, reason: entry.weaponId ? "計算機用属性・武器種・レアリティ不足" : "実マスターIDではない説明行" });
    continue;
  }
  if (!calculatorById.has(weapon.weaponId)) {
    calculatorById.set(weapon.weaponId, weapon);
    added += 1;
  } else if (calculatorById.get(weapon.weaponId)?.source?.startsWith("gbf.wiki Cargo weaponsテーブル")) {
    calculatorById.set(weapon.weaponId, weapon);
    refreshed += 1;
  }
}

const knowledgeCatalog = {
  schemaVersion: 1,
  source: {
    title: "gbf.wiki Cargo table: weapons",
    url: "https://gbf.wiki/Special:CargoTables/weapons",
    transport: "r.jina.ai proxy",
    retrievedAt: TODAY,
    rowCount: entries.length,
    note: "コミュニティWiki由来の二次情報。数値・効果量・枠は要検証。*_noteは属性可変武器の説明行で実マスターIDではない。",
  },
  weapons: entries,
};

if (APPLY) {
  writeFileSync(KNOWLEDGE_CATALOG, `${JSON.stringify(knowledgeCatalog, null, 2)}\n`, "utf8");
  existingCatalog.weapons = [...calculatorById.values()].sort((left, right) => left.weaponId.localeCompare(right.weaponId));
  writeFileSync(CALCULATOR_CATALOG, `${JSON.stringify(existingCatalog, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  apply: APPLY,
  inputFiles: files.map((file) => basename(file)),
  wikiRows: entries.length,
  masterIdRows: entries.filter(({ weaponId }) => weaponId !== null).length,
  noteRows: entries.filter(({ weaponId }) => weaponId === null).length,
  calculatorAdded: added,
  calculatorRefreshed: refreshed,
  calculatorTotal: calculatorById.size,
  skippedCount: skipped.length,
  skipped: skipped.slice(0, 100),
}, null, 2));
