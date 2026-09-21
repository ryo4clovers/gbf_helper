import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIKI_CATALOG = join(ROOT, "knowledge", "weapons", "wiki-catalog.v1.json");
const CALCULATOR_CATALOG = join(ROOT, "mcp-server", "catalog", "weapons.v1.json");
const APPLY = process.argv.includes("--apply");

const wikiCatalog = JSON.parse(readFileSync(WIKI_CATALOG, "utf8"));
const calculatorCatalog = JSON.parse(readFileSync(CALCULATOR_CATALOG, "utf8"));
const wikiById = new Map(wikiCatalog.weapons.filter((weapon) => weapon.weaponId).map((weapon) => [weapon.weaponId, weapon]));

let uncapsAdded = 0;
let levelStatsAdded = 0;
let selectionDefaultsCompleted = 0;
for (const weapon of calculatorCatalog.weapons) {
  const wiki = wikiById.get(weapon.weaponId);
  if (!wiki) continue;
  const uncaps = wiki.uncaps;
  if (uncaps && [uncaps.minimum, uncaps.base, uncaps.maximum, uncaps.reduced].every(Number.isInteger)) {
    weapon.uncaps = {
      ...uncaps,
      verificationStatus: "下書き",
      source: `gbf.wiki Cargo weaponsテーブル（${wikiCatalog.source.retrievedAt}取得）の上限解放範囲`,
    };
    uncapsAdded += 1;
  }

  const points = wiki.statPoints ?? [];
  const lastPoint = points.at(-1);
  if (!weapon.levelStats && points.length >= 2) {
    weapon.levelStats = { maximumLevel: lastPoint.level, points };
    levelStatsAdded += 1;
  }
  if (lastPoint) {
    const previous = weapon.selectionDefaults ?? {};
    const next = {
      ...previous,
      level: previous.level ?? lastPoint.level,
      uncapLevel: previous.uncapLevel ?? uncaps?.maximum,
      attack: previous.attack ?? lastPoint.attack,
      hp: previous.hp ?? lastPoint.hp,
    };
    if (JSON.stringify(previous) !== JSON.stringify(next)) selectionDefaultsCompleted += 1;
    weapon.selectionDefaults = next;
  }
}

console.log(JSON.stringify({
  totalWeapons: calculatorCatalog.weapons.length,
  wikiMatches: calculatorCatalog.weapons.filter((weapon) => wikiById.has(weapon.weaponId)).length,
  uncapsAdded,
  levelStatsAdded,
  selectionDefaultsCompleted,
  apply: APPLY,
}, null, 2));

if (APPLY) writeFileSync(CALCULATOR_CATALOG, `${JSON.stringify(calculatorCatalog, null, 2)}\n`, "utf8");
