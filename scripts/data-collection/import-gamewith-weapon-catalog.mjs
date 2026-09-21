import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "../..");
const DEFAULT_WIKI_CATALOG = join(ROOT, "knowledge", "weapons", "wiki-catalog.v1.json");
const DEFAULT_CALCULATOR_CATALOG = join(ROOT, "mcp-server", "catalog", "weapons.v1.json");
const DEFAULT_OUTPUT = join(ROOT, "knowledge", "weapons", "gamewith-catalog.v1.json");
const WEAPON_DIRECTORY = join(ROOT, "knowledge", "weapons");

const ELEMENTS = new Map([
  ["fire", "火"],
  ["water", "水"],
  ["earth", "土"],
  ["wind", "風"],
  ["light", "光"],
  ["dark", "闇"],
]);

const WEAPON_TYPES = new Map([
  ["sabre", "剣"],
  ["dagger", "短剣"],
  ["spear", "槍"],
  ["axe", "斧"],
  ["staff", "杖"],
  ["gun", "銃"],
  ["melee", "格闘"],
  ["bow", "弓"],
  ["harp", "楽器"],
  ["katana", "刀"],
]);

function parseArguments(argv) {
  const valueAfter = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    input: valueAfter("--input"),
    wikiCatalog: valueAfter("--wiki-catalog") ?? DEFAULT_WIKI_CATALOG,
    calculatorCatalog: valueAfter("--calculator-catalog") ?? DEFAULT_CALCULATOR_CATALOG,
    output: valueAfter("--output") ?? DEFAULT_OUTPUT,
    apply: argv.includes("--apply"),
  };
}

function requiredJson(path, label) {
  if (!path) throw new Error(`${label}を指定してください`);
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

export function normalizeWeaponName(value, { removeElementSuffix = false } = {}) {
  let normalized = String(value ?? "").normalize("NFKC").trim();
  if (removeElementSuffix) {
    normalized = normalized.replace(/\((?:火|水|土|風|光|闇)属性\)$/u, "");
  }
  return normalized
    .replace(/[・･·\s'’`]/gu, "")
    .replace(/[‐‑‒–—―]/gu, "-")
    .toLowerCase();
}

function wikiCandidate(row) {
  if (row.rarity !== "SSR" || !/^\d{10}$/u.test(String(row.weaponId ?? "")) || !row.nameJa) {
    return undefined;
  }
  return {
    weaponId: String(row.weaponId),
    nameJa: row.nameJa,
    nameEn: row.nameEn ?? null,
    element: ELEMENTS.get(String(row.element ?? "").toLowerCase()) ?? null,
    weaponType: WEAPON_TYPES.get(String(row.weaponType ?? "").toLowerCase()) ?? null,
    series: row.series ?? null,
  };
}

function buildNameIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    const candidate = wikiCandidate(row);
    if (!candidate) continue;
    for (const relaxed of [false, true]) {
      const key = normalizeWeaponName(candidate.nameJa, { removeElementSuffix: relaxed });
      if (!key) continue;
      const current = index.get(key) ?? [];
      if (!current.some((entry) => entry.weaponId === candidate.weaponId)) current.push(candidate);
      index.set(key, current);
    }
  }
  return index;
}

function frontmatterValue(markdown, key) {
  const match = markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, "mu"));
  return match?.[1]?.trim();
}

function knowledgeByWeaponId(directory = WEAPON_DIRECTORY) {
  const entries = new Map();
  for (const filename of readdirSync(directory)) {
    if (!filename.endsWith(".md") || filename === "README.md" || filename === "_template.md") continue;
    const markdown = readFileSync(join(directory, filename), "utf8");
    const weaponId = frontmatterValue(markdown, "weapon_id");
    if (!/^\d{10}$/u.test(weaponId ?? "")) continue;
    const source = frontmatterValue(markdown, "source") ?? "";
    const skillIds = [...markdown.matchAll(/skill_id:\s*`?(\d+)`?/gu)].map((match) => match[1]);
    entries.set(weaponId, {
      file: filename,
      status: frontmatterValue(markdown, "status") ?? "未着手",
      officialArchiveChecked: /本家(?:ルリアノート)?武器図鑑|archive\/weapon_detail/u.test(`${source}\n${markdown}`),
      skillIds: [...new Set(skillIds)],
    });
  }
  return entries;
}

function uniqueCandidates(candidates) {
  return [...new Map(candidates.map((candidate) => [candidate.weaponId, candidate])).values()];
}

export function matchGameWithWeapon(weapon, nameIndex) {
  const names = [weapon.nameJp, ...(weapon.aliases ?? [])].filter(Boolean);
  const strictKeys = names.map((name) => normalizeWeaponName(name));
  const relaxedKeys = names.map((name) => normalizeWeaponName(name, { removeElementSuffix: true }));
  const lookup = (keys) => uniqueCandidates(keys.flatMap((key) => nameIndex.get(key) ?? []))
    .filter((candidate) => (!weapon.element || candidate.element === weapon.element)
      && (!weapon.weaponType || candidate.weaponType === weapon.weaponType));

  let candidates = lookup(strictKeys);
  let method = "exact-name-element-type";
  if (candidates.length === 0) {
    candidates = lookup(relaxedKeys);
    method = "normalized-name-element-type";
  }
  if (candidates.length === 1) {
    return { status: "matched", method, ...candidates[0] };
  }
  if (candidates.length > 1) {
    return {
      status: "ambiguous",
      method,
      candidates: candidates.map(({ weaponId, nameJa, nameEn, element, weaponType }) => ({
        weaponId,
        nameJa,
        nameEn,
        element,
        weaponType,
      })),
    };
  }
  return { status: "unmatched" };
}

function articleId(url) {
  return String(url ?? "").match(/\/article\/show\/(\d+)/u)?.[1] ?? null;
}

function finalUncap(value) {
  const text = String(value ?? "");
  if (text.startsWith("あり")) return true;
  if (text.startsWith("なし")) return false;
  return null;
}

export function buildGameWithCatalog({ rawCatalog, wikiCatalog, calculatorCatalog, knowledgeEntries = new Map() }) {
  const nameIndex = buildNameIndex(wikiCatalog.weapons ?? []);
  const calculatorIds = new Set((calculatorCatalog.weapons ?? []).map((weapon) => String(weapon.weaponId)));
  const weapons = (rawCatalog.weapons ?? []).map((weapon) => {
    const wikiMatch = matchGameWithWeapon(weapon, nameIndex);
    const knowledge = wikiMatch.status === "matched" ? knowledgeEntries.get(wikiMatch.weaponId) : undefined;
    const calculator = wikiMatch.status === "matched" && calculatorIds.has(wikiMatch.weaponId)
      ? "catalogued-draft"
      : "not-catalogued";
    return {
      index: weapon.index,
      nameJp: weapon.nameJp,
      ...(weapon.aliases?.length ? { aliases: weapon.aliases } : {}),
      element: weapon.element,
      weaponType: weapon.weaponType,
      articleId: articleId(weapon.articleUrl),
      articleUrl: weapon.articleUrl,
      finalUncap: finalUncap(weapon.finalUncap),
      obtain: weapon.obtain ?? null,
      chargeAttackName: weapon.chargeAttack?.name ?? null,
      skillNames: (weapon.skills ?? []).map(({ slot, name }) => ({ slot, name })),
      wikiMatch,
      coverage: {
        gameWith: "indexed-secondary-source",
        gbfWiki: wikiMatch.status,
        officialArchive: knowledge?.officialArchiveChecked ? "checked-in-knowledge" : "unverified",
        skillIds: knowledge?.skillIds?.length ? "recorded-in-knowledge" : "unverified",
        calculator,
      },
      ...(knowledge ? { knowledge } : {}),
    };
  });

  const count = (selector) => weapons.filter(selector).length;
  return {
    schemaVersion: 1,
    source: {
      title: rawCatalog.source?.title ?? "GameWith 全SSR武器一覧",
      url: rawCatalog.source?.url ?? "https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/74390",
      retrievedAt: rawCatalog.source?.retrievedAt ?? null,
      rowCount: weapons.length,
      sourceQuality: "secondary",
      note: "GameWith掲載の事実項目だけを保持し、説明文の全文複製はしない。数値・効果・武器IDは実機または公式情報で別途検証する。",
    },
    summary: {
      total: weapons.length,
      wikiMatched: count((weapon) => weapon.wikiMatch.status === "matched"),
      wikiAmbiguous: count((weapon) => weapon.wikiMatch.status === "ambiguous"),
      wikiUnmatched: count((weapon) => weapon.wikiMatch.status === "unmatched"),
      knowledgeLinked: count((weapon) => Boolean(weapon.knowledge)),
      calculatorCatalogued: count((weapon) => weapon.coverage.calculator === "catalogued-draft"),
      officialArchiveUnverified: count((weapon) => weapon.coverage.officialArchive === "unverified"),
      skillIdsUnverified: count((weapon) => weapon.coverage.skillIds === "unverified"),
    },
    weapons,
  };
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options.input) {
    console.error("usage: node scripts/data-collection/import-gamewith-weapon-catalog.mjs --input <browser-capture.json> [--apply]");
    process.exit(1);
  }
  const catalog = buildGameWithCatalog({
    rawCatalog: requiredJson(options.input, "--input"),
    wikiCatalog: requiredJson(options.wikiCatalog, "--wiki-catalog"),
    calculatorCatalog: requiredJson(options.calculatorCatalog, "--calculator-catalog"),
    knowledgeEntries: knowledgeByWeaponId(),
  });
  console.log(JSON.stringify(catalog.summary, null, 2));
  if (options.apply) {
    writeFileSync(resolve(options.output), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    console.log(`wrote ${resolve(options.output)}`);
  } else {
    console.log("dry-run: --apply を指定すると出力します");
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) main();
