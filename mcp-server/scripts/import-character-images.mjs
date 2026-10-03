import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import matter from "gray-matter";

// Offline importer: input is the public Wiki Cargo characters table, never game responses.
const root = fileURLToPath(new URL("../../", import.meta.url));
const inputs = process.argv.slice(2).filter((arg) => arg !== "--apply" && !arg.startsWith("--date="));
if (!inputs.length) throw new Error("usage: node scripts/import-character-images.mjs <Cargo JSON/Jina text files...> [--apply]");
const rows = inputs.flatMap((file) => {
  const content = readFileSync(file, "utf8");
  const parsed = JSON.parse(content.slice(content.indexOf("{")));
  if (!Array.isArray(parsed.cargoquery)) throw new Error(`Cargo rows missing: ${file}`);
  return parsed.cargoquery.map(({ title }) => title);
});
const normalize = (text) => text.normalize("NFKC").replaceAll("&#039;", "'").replaceAll("&amp;", "&").replaceAll("’", "'").replaceAll("_", " ").trim().toLowerCase();
const elements = { Fire: "火", Water: "水", Earth: "土", Wind: "風", Light: "光", Dark: "闇" };
const variantName = (name) => normalize(name).replace(/\bchristmas\b/g, "holiday").replace(/\blimited\b/g, "grand")
  .replace(/&/g, "and").replace(/\s*\((?:fire|water|earth|wind|light|dark|ssr|sr|r)\)$/, "");
const entries = {};
const unmatched = [];
for (const filename of readdirSync(path.join(root, "knowledge/characters")).sort()) {
  if (!filename.endsWith(".md") || filename.startsWith("_") || filename === "README.md") continue;
  const { data } = matter(readFileSync(path.join(root, "knowledge/characters", filename), "utf8"));
  const names = new Set([normalize(data.name_en)]);
  // Existing explicit Wiki references resolve local variant labels without fuzzy name matching.
  for (const match of String(data.source).matchAll(/https:\/\/gbf\.wiki\/([A-Za-z0-9_%'().&+-]+)/g)) {
    names.add(normalize(decodeURIComponent(match[1])));
  }
  const compatible = rows.filter((row) => row.rarity === data.rarity && elements[row.element] === data.element);
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
// A master shared by different knowledge entries needs manual disambiguation.
const owners = new Map();
for (const [id, entry] of Object.entries(entries)) owners.set(entry.masterId, [...(owners.get(entry.masterId) ?? []), id]);
for (const ids of owners.values()) if (ids.length > 1) for (const id of ids) {
  unmatched.push({ id, reason: "duplicate-master-id" }); delete entries[id];
}
const date = process.argv.find((arg) => arg.startsWith("--date="))?.slice(7)
  ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("--date must be YYYY-MM-DD");
const output = { schemaVersion: 1, updatedAt: date, verificationStatus: "下書き",
  source: "https://gbf.wiki/Special:CargoTables/characters", transport: "r.jina.ai",
  imageUrlPattern: "https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/npc/m/{masterId}_01.jpg",
  entries };
if (process.argv.includes("--apply")) writeFileSync(path.join(root, "mcp-server/catalog/character-images.v1.json"), JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({ matched: Object.keys(entries).length, unmatched }, null, 2));
