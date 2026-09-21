import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const catalogDirectory = path.join(repositoryRoot, "mcp-server/catalog");
const skillCatalogPath = path.join(catalogDirectory, "weapon-skills.v1.json");
const wikiSource = "gbf.wiki『Weapon Skills』のSLv1/10/15/20/25代表値（2026-09-21閲覧）を区間内等差で展開。二次情報のため実機未検証値は下書き";

function expandCurve(anchors) {
  const values = [];
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const [startLevel, startAmount] = anchors[index];
    const [endLevel, endAmount] = anchors[index + 1];
    for (let skillLevel = startLevel; skillLevel < endLevel; skillLevel += 1) {
      const ratio = (skillLevel - startLevel) / (endLevel - startLevel);
      values.push({
        skillLevel,
        amountPercent: Math.round((startAmount + (endAmount - startAmount) * ratio) * 10_000) / 10_000,
      });
    }
  }
  const [skillLevel, amountPercent] = anchors.at(-1);
  values.push({ skillLevel, amountPercent });
  return values;
}

const definitions = {
  "weapon-skill-normal-attack-tables.v1.json": {
    "normal-small": [[1, 1], [10, 10], [15, 12], [20, 13]],
    "normal-godmight-small": [[1, 1], [10, 10], [15, 12], [20, 12.5]],
    "normal-medium": [[1, 3], [10, 12], [15, 14.5], [20, 16]],
    "normal-godmight-medium": [[1, 3], [10, 12], [15, 14.5], [20, 15.5], [25, 16.5]],
    "normal-large": [[1, 6], [10, 15], [15, 18], [20, 20]],
    "normal-godmight-large": [[1, 6], [10, 15], [15, 18], [20, 20], [25, 22]],
    "normal-ii": [[1, 7], [10, 16], [15, 20], [20, 22]],
    "normal-iii": [[1, 8], [10, 17], [15, 22], [20, 25.5]],
    "normal-tyrant-ii": [[1, 9], [10, 18], [15, 23], [20, 25.5]],
    "gale-might-extra-large": [[1, 16], [10, 25], [15, 33]],
  },
  "weapon-skill-normal-hp-tables.v1.json": {
    "normal-godmight-small": [[1, 1], [10, 10], [15, 12], [20, 12.5]],
    "normal-godmight-medium": [[1, 3], [10, 12], [15, 14.5], [20, 15.5], [25, 16.5]],
    "normal-godmight-large": [[1, 6], [10, 15], [15, 18], [20, 20], [25, 22]],
    "normal-aegis-small": [[1, 3], [10, 12], [15, 14], [20, 16]],
    "normal-aegis-medium": [[1, 6], [10, 15], [15, 17]],
    "normal-aegis-large": [[1, 9], [10, 18], [15, 21], [20, 24]],
    "normal-aegis-ii": [[1, 10], [10, 19], [15, 24]],
    "magna-hp-small": [[1, 3], [10, 12], [15, 14], [20, 16]],
  },
  "weapon-skill-rate-tables.v1.json": {
    "critical-small": [[1, 1.1], [10, 2], [15, 3], [20, 4]],
    "critical-medium": [[1, 3.2], [10, 5], [15, 6.5], [20, 7.5]],
    "critical-large": [[1, 4.4], [10, 8], [15, 10], [20, 11]],
    "critical-ii": [[1, 5.5], [10, 10], [15, 12]],
    "double-attack-small": [[1, 0.4], [10, 2.2], [15, 3.5]],
    "multiattack-small": [[1, 0.25], [10, 2.5], [15, 3.5]],
    "multiattack-medium": [[1, 0.8], [10, 3.5], [15, 5], [20, 6], [25, 7]],
    "multiattack-large": [[1, 1.2], [10, 5], [15, 7]],
    "fandango-small": [[1, 0.18], [10, 1.35], [15, 2]],
    "fandango-medium": [[1, 0.8], [10, 2.15], [15, 2.9], [20, 3.65]],
    "fandango-large": [[1, 1.2], [10, 3.45], [15, 4.2], [20, 4.95], [25, 5.7]],
  },
};

const sourceNotes = {
  "weapon-skill-normal-hp-tables.v1.json": {
    "normal-aegis-small": "SLv20は既存のユーザー提供攻略サイト表を維持",
    "normal-aegis-large": "SLv20は既存のユーザー提供攻略サイト表を維持",
    "magna-hp-small": "SLv15は恩寵の実機編成表示と一致。SLv20は既存のユーザー提供攻略サイト表を維持",
  },
  "weapon-skill-rate-tables.v1.json": {
    "double-attack-small": "WikiではSLv1をVerification neededと注記",
  },
};

for (const [fileName, curves] of Object.entries(definitions)) {
  const filePath = path.join(catalogDirectory, fileName);
  const catalog = JSON.parse(await readFile(filePath, "utf8"));
  const tables = new Map(catalog.tables.map((table) => [table.tableId, table]));
  for (const [tableId, anchors] of Object.entries(curves)) {
    let table = tables.get(tableId);
    if (table === undefined) {
      table = { tableId, values: [], verificationStatus: "下書き", source: wikiSource };
      catalog.tables.push(table);
      tables.set(tableId, table);
    }
    table.values = expandCurve(anchors);
    const confirmation = table.source.includes("実機一致")
      ? `。${table.source.split("。").filter((part) => part.includes("実機一致")).join("。")}`
      : "";
    const note = sourceNotes[fileName]?.[tableId];
    table.source = `${wikiSource}${note === undefined ? "" : `。${note}`}${confirmation}`;
  }
  await writeFile(filePath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

const skillCatalog = JSON.parse(await readFile(skillCatalogPath, "utf8"));
const godmightLargeSkillIds = new Set(["1228", "1229", "1230", "1231", "1232", "1233"]);
for (const skill of skillCatalog.skills) {
  if (godmightLargeSkillIds.has(skill.skillId)) {
    skill.normalAttackAmountTable.tableId = "normal-godmight-large";
  }
}
await writeFile(skillCatalogPath, `${JSON.stringify(skillCatalog, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  expandedTables: Object.values(definitions).reduce((total, curves) => total + Object.keys(curves).length, 0),
  reassignedGodmightLargeSkills: godmightLargeSkillIds.size,
}, null, 2));
