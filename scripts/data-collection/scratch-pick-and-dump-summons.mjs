import fs from "node:fs";
import path from "node:path";

// Summon-flavored variant of scratch-pick-and-dump.mjs: picks the correct
// gbf.wiki candidate page for each summon in list.json, preferring rarity-
// disambiguated titles (e.g. "The Sun (SSR)") over same-named character/NPC
// pages, then writes fetch_pages.sh to bulk-curl the chosen pages.
// Usage: node scratch-pick-and-dump-summons.mjs <scratch-dir-abs-path>

const SCRATCH = process.argv[2];
if (!SCRATCH) {
  console.error("usage: node scratch-pick-and-dump-summons.mjs <scratch-dir-abs-path>");
  process.exit(1);
}

// Pages that are never a summon: character/NPC/raid-boss/weapon pages, and
// generic wiki meta/event pages that happen to have no parenthetical suffix
// (which would otherwise look like a "bare" summon title).
const NON_SUMMON_MARKERS = [
  "(NPC)",
  "(Enemy)",
  "(Raid)",
  "(Weapon)",
  "(Character)",
  "/Lore",
  "/Voice",
  "/History",
  "(Skin)",
  "Co-op Terms",
  "Glossary",
  "Side-scrolling Quotes",
  "Unite and Fight",
  "Rise of the Beasts",
  "Omega Raids",
  "Impossible ",
  "Terms",
  "Chapter ",
];

function extractGbfWikiSearchCandidates(html) {
  const re = /<a href="\/([^"]+)" title="([^"]+)"/g;
  const seen = new Set();
  const results = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = decodeURIComponent(m[1]);
    const title = m[2];
    if (href.startsWith("index.php") || href.startsWith("Special:")) continue;
    if (seen.has(title)) continue;
    seen.add(title);
    results.push({ href, title });
    if (results.length >= 20) break;
  }
  return results;
}

// Derived from the summon's own name text (list.json has no separate "tag"
// field the way the character list does) — a "水着○○" entry should prefer a
// "(Summer)" gbf.wiki page, etc.
const NAME_KEYWORD_HINTS = [
  ["水着", ["(Summer)"]],
  ["浴衣", ["(Yukata)"]],
  ["ハロウィン", ["(Halloween)"]],
  ["クリスマス", ["(Christmas)", "(Holiday)"]],
  ["バレンタイン", ["(Valentine)"]],
];

// gbf.wiki summon pages follow no single convention: some use an explicit
// "(Summon)" suffix to disambiguate from a same-named playable character
// (Shiva, Wilnas), some use "(SSR)" to disambiguate from an SR/R version of
// the same summon (The Sun), and many are simply the bare name with no
// character/NPC of the same name to collide with (Lucifer, Surtr). Try each
// disambiguator in order, then fall back to a single surviving bare candidate
// after stripping known-irrelevant pages. If it's still ambiguous, return
// null and let it fall back to GameWith-only sourcing rather than guess.
function pickCandidate(name, candidates) {
  if (candidates.length === 0) return null;

  for (const [keyword, hints] of NAME_KEYWORD_HINTS) {
    if (!name.includes(keyword)) continue;
    for (const hint of hints) {
      const found = candidates.find((c) => c.title.includes(hint));
      if (found) return found;
    }
  }

  const summonMatch = candidates.find((c) => c.title.includes("(Summon)"));
  if (summonMatch) return summonMatch;

  const ssrMatch = candidates.find((c) => c.title.includes("(SSR)"));
  if (ssrMatch) return ssrMatch;

  const plausible = candidates.filter(
    (c) => !NON_SUMMON_MARKERS.some((marker) => c.title.includes(marker)),
  );
  const bareCandidates = plausible.filter((c) => !c.title.includes("("));
  if (bareCandidates.length === 1) return bareCandidates[0];

  return null;
}

const list = JSON.parse(fs.readFileSync(path.join(SCRATCH, "list.json"), "utf-8"));

const picks = [];
for (let i = 0; i < list.length; i++) {
  const c = list[i];
  const idStr = String(i).padStart(3, "0");
  const safe = c.name.replace(/[\\/:*?"<>|]/g, "_");
  const fname = `${idStr}_${safe}`;
  const searchPath = path.join(SCRATCH, "gbfwiki", `${fname}_search.html`);
  let candidate = null;
  if (fs.existsSync(searchPath)) {
    const html = fs.readFileSync(searchPath, "utf-8");
    const candidates = extractGbfWikiSearchCandidates(html);
    candidate = pickCandidate(c.name, candidates);
  }
  picks.push({ i, fname, name: c.name, href: c.href, candidate });
}
fs.writeFileSync(path.join(SCRATCH, "picks.json"), JSON.stringify(picks, null, 2));

const scratchBashPath = SCRATCH.replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`).replace(/\\/g, "/");
const lines = [
  "#!/bin/bash",
  `SCRATCH="${scratchBashPath}"`,
  'UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"',
];
let fetchCount = 0;
for (const p of picks) {
  if (!p.candidate) continue;
  const outFile = `"$SCRATCH/gbfwiki/${p.fname}_page.html"`;
  lines.push(`curl -s -A "$UA" -w "${p.fname} HTTP:%{http_code}\\n" "https://gbf.wiki/${encodeURI(p.candidate.href)}" -o ${outFile}`);
  lines.push(`sleep 0.4`);
  fetchCount++;
}
lines.push(`echo "FETCH_PAGES_DONE count=${fetchCount}"`);
fs.writeFileSync(path.join(SCRATCH, "fetch_pages.sh"), lines.join("\n"));

console.log("picks written:", picks.filter((p) => p.candidate).length, "/", picks.length, "have a gbf.wiki candidate");
console.log("fetch_pages.sh written with", fetchCount, "curl calls");
