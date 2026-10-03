import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import matter from "gray-matter";

// Offline importer: input is the public Wiki Cargo characters table, never game responses.
const root = fileURLToPath(new URL("../../", import.meta.url));
const normalize = (text) => text.normalize("NFKC").replaceAll("&#039;", "'").replaceAll("&amp;", "&").replaceAll("’", "'").replaceAll("_", " ").trim().toLowerCase();
const elements = { fire: "火", water: "水", earth: "土", wind: "風", light: "光", dark: "闇" };
const variantName = (name) => normalize(name).replace(/\bchristmas\b/g, "holiday").replace(/\blimited\b/g, "grand")
  .replace(/&/g, "and").replace(/\s*\((?:fire|water|earth|wind|light|dark|ssr|sr|r)\)$/, "");
// Keep reviewed exceptions explicit: an incorrect source URL must not silently replace
// an otherwise correct match, and a missing/changed Cargo row must stop regeneration.
export function resolveCharacterImages(characters, rows, resolutions = {}) {
  const entries = {};
  const unmatched = [];
  for (const id of Object.keys(resolutions)) {
    if (!characters.some((character) => character.id === id)) throw new Error(`Unknown reviewed character: ${id}`);
  }
  for (const data of characters) {
    const reviewed = resolutions[data.id];
    if (reviewed) {
      const matches = rows.filter((row) => row.id === reviewed.masterId && row.name === reviewed.wikiPage
        && Number(row["style id"]) === (reviewed.styleId ?? 1));
      if (matches.length !== 1) throw new Error(`Reviewed Cargo row missing or ambiguous: ${data.id}`);
      const row = matches[0];
      const element = normalize(row.element);
      if (row.rarity.toUpperCase() !== data.rarity || normalize(row.jpname) !== normalize(reviewed.jpName)
        || !(elements[element] === data.element || (element === "any" && reviewed.allowAnyElement === true))) {
        throw new Error(`Reviewed identity mismatch: ${data.id}`);
      }
      const sourceArticles = [...String(data.source).matchAll(/\/article\/show\/(\d+)/g)].map((match) => match[1]);
      if (reviewed.gameWithArticle && (!sourceArticles.includes(reviewed.gameWithArticle)
        || !row["link gamewith"]?.endsWith(`/article/show/${reviewed.gameWithArticle}`))) {
        throw new Error(`Reviewed source mismatch: ${data.id}`);
      }
      if (!/^30[234]\d{7}$/.test(row.id) || ![1, 2].includes(reviewed.styleId ?? 1)) throw new Error(`Unexpected identity: ${data.id}`);
      entries[data.id] = { masterId: row.id, wikiPage: row.name,
        ...(reviewed.styleId === 2 ? { styleId: 2 } : {}) };
      continue;
    }
    const names = new Set([normalize(data.name_en)]);
    // Existing explicit Wiki references resolve local variant labels without fuzzy name matching.
    for (const match of String(data.source).matchAll(/https:\/\/gbf\.wiki\/([A-Za-z0-9_%'().&+-]+)/g)) {
      names.add(normalize(decodeURIComponent(match[1])));
    }
    // Unreviewed matching only targets the default style, never an arbitrary shared ID.
    const compatible = rows.filter((row) => row.rarity.toUpperCase() === data.rarity
      && elements[normalize(row.element)] === data.element && Number(row["style id"] ?? 1) === 1);
    let matches = compatible.filter((row) => names.has(normalize(row.name)));
    if (!matches.length) matches = compatible.filter((row) => variantName(row.name) === variantName(data.name_en));
    // Some Grand characters use an unqualified Wiki page; prefer an explicit Grand match above.
    if (!matches.length && /\((?:Limited|Grand)\)$/.test(data.name_en)) {
      matches = compatible.filter((row) => normalize(row.name) === normalize(data.name_en.replace(/\s*\((?:Limited|Grand)\)$/, "")));
    }
    const unique = new Map(matches.map((row) => [row.id, row]));
    if (unique.size !== 1) { unmatched.push({ id: data.id, name: data.name_en }); continue; }
    const row = [...unique.values()][0];
    if (!/^30[234]\d{7}$/.test(row.id)) throw new Error(`Unexpected master ID: ${row.id}`);
    entries[data.id] = { masterId: row.id, wikiPage: row.name };
  }
  // Sharing a master is valid only when the styles are different.
  const owners = new Map();
  for (const [id, entry] of Object.entries(entries)) {
    const key = `${entry.masterId}:${entry.styleId ?? 1}`;
    owners.set(key, [...(owners.get(key) ?? []), id]);
  }
  for (const ids of owners.values()) if (ids.length > 1) {
    if (ids.some((id) => resolutions[id])) throw new Error(`Reviewed identity collision: ${ids.join(", ")}`);
    for (const id of ids) { unmatched.push({ id, reason: "duplicate-master-id" }); delete entries[id]; }
  }
  return { entries, unmatched };
}

function main() {
  const inputs = process.argv.slice(2).filter((arg) => arg !== "--apply" && !arg.startsWith("--date="));
  if (!inputs.length) throw new Error("usage: node scripts/import-character-images.mjs <Cargo JSON/Jina text files...> [--apply]");
  const rows = inputs.flatMap((file) => {
    const content = readFileSync(file, "utf8");
    const parsed = JSON.parse(content.slice(content.indexOf("{")));
    if (!Array.isArray(parsed.cargoquery)) throw new Error(`Cargo rows missing: ${file}`);
    return parsed.cargoquery.map(({ title }) => title);
  });
  const characters = readdirSync(path.join(root, "knowledge/characters")).sort()
    .filter((name) => name.endsWith(".md") && !name.startsWith("_") && name !== "README.md")
    .map((name) => matter(readFileSync(path.join(root, "knowledge/characters", name), "utf8")).data);
  const resolutions = JSON.parse(readFileSync(path.join(root, "mcp-server/catalog/character-image-resolutions.v1.json"), "utf8")).entries;
  const { entries, unmatched } = resolveCharacterImages(characters, rows, resolutions);
  const date = process.argv.find((arg) => arg.startsWith("--date="))?.slice(7)
    ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("--date must be YYYY-MM-DD");
  const output = { schemaVersion: 1, updatedAt: date, verificationStatus: "下書き",
    source: "https://gbf.wiki/Special:CargoTables/characters", transport: "r.jina.ai",
    imageUrlPattern: "https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/npc/m/{masterId}_01.jpg",
    styleImageUrlPattern: "https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/npc/m/{masterId}_01_st{styleId}.jpg",
    entries };
  if (process.argv.includes("--apply")) writeFileSync(path.join(root, "mcp-server/catalog/character-images.v1.json"), JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify({ matched: Object.keys(entries).length, unmatched }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
