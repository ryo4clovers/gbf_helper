import fs from "node:fs";
import path from "node:path";

// Cross-checks each summon's GameWith-listed ATK/HP (list.json) against the
// gbf.wiki per-level stats table (Level 100 = 3★, Level 150 = 4★) for whichever
// gbf.wiki page was picked in picks.json, and writes a consolidated report so
// stats don't need to be verified one page at a time by hand.
// Usage: node scratch-verify-summon-stats.mjs <scratch-dir-abs-path>

const SCRATCH = process.argv[2];
if (!SCRATCH) {
  console.error("usage: node scratch-verify-summon-stats.mjs <scratch-dir-abs-path>");
  process.exit(1);
}

function extractLevelStats(html) {
  const re = /<th>Level (\d+)<\/th>\s*<td>([\d,]+)<\/td>\s*<td>([\d,]+)<\/td>/g;
  const levels = {};
  let m;
  while ((m = re.exec(html)) !== null) {
    levels[m[1]] = { hp: m[2].replace(/,/g, ""), atk: m[3].replace(/,/g, "") };
  }
  return levels;
}

const list = JSON.parse(fs.readFileSync(path.join(SCRATCH, "list.json"), "utf-8"));
const picks = JSON.parse(fs.readFileSync(path.join(SCRATCH, "picks.json"), "utf-8"));

const report = [];
for (let i = 0; i < list.length; i++) {
  const c = list[i];
  const p = picks[i];
  const row = {
    i,
    name: c.name,
    gamewith: { atk: c.atk, atk_max: c.atk_max, hp: c.hp, hp_max: c.hp_max },
  };
  if (!p.candidate) {
    row.status = "NO_CANDIDATE";
    report.push(row);
    continue;
  }
  const pagePath = path.join(SCRATCH, "gbfwiki", `${p.fname}_page.html`);
  if (!fs.existsSync(pagePath)) {
    row.status = "PAGE_NOT_FETCHED";
    row.candidateTitle = p.candidate.title;
    report.push(row);
    continue;
  }
  const html = fs.readFileSync(pagePath, "utf-8");
  const levels = extractLevelStats(html);
  row.candidateTitle = p.candidate.title;
  row.candidateHref = p.candidate.href;
  row.gbfwikiLevels = levels;

  const lvl100 = levels["100"];
  const lvl150 = levels["150"];
  const baseMatch = lvl100 && lvl100.atk === c.atk && lvl100.hp === c.hp;
  // GameWith shows a single value (no parenthesized "max") for summons that
  // don't have a further uncap tier in its table; atk === atk_max in that case.
  // Only require the Lv150 match too when GameWith actually distinguishes them.
  const singleTier = c.atk === c.atk_max && c.hp === c.hp_max;
  const maxMatch = singleTier ? true : lvl150 && lvl150.atk === c.atk_max && lvl150.hp === c.hp_max;
  if (Object.keys(levels).length === 0) {
    row.status = "NO_STATS_TABLE_FOUND";
  } else if (baseMatch && maxMatch) {
    row.status = "MATCH";
  } else if (baseMatch || maxMatch) {
    row.status = "PARTIAL_MATCH";
  } else {
    row.status = "MISMATCH";
  }
  report.push(row);
}

fs.writeFileSync(path.join(SCRATCH, "verify_report.json"), JSON.stringify(report, null, 2));

const counts = {};
for (const r of report) counts[r.status] = (counts[r.status] || 0) + 1;
console.log("verify_report.json written:", report.length, "entries");
console.log(counts);

const lines = report.map((r) => {
  const base = `[${r.status}] ${r.name}`;
  if (r.status === "MATCH") return base;
  if (r.status === "NO_CANDIDATE") return `${base} (no gbf.wiki candidate found)`;
  if (r.status === "PAGE_NOT_FETCHED") return `${base} (candidate: ${r.candidateTitle}, page not fetched)`;
  if (r.status === "NO_STATS_TABLE_FOUND") return `${base} (candidate: ${r.candidateTitle}, no stats table on page)`;
  return `${base} (candidate: ${r.candidateTitle}) GameWith atk=${r.gamewith.atk}(${r.gamewith.atk_max}) hp=${r.gamewith.hp}(${r.gamewith.hp_max}) | gbf.wiki Lv100=${JSON.stringify(r.gbfwikiLevels["100"])} Lv150=${JSON.stringify(r.gbfwikiLevels["150"])}`;
});
fs.writeFileSync(path.join(SCRATCH, "verify_report.txt"), lines.join("\n"));
console.log("verify_report.txt written");
