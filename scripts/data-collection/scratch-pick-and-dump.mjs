import fs from "node:fs";
import path from "node:path";

const SCRATCH = "C:/Users/iriwa/AppData/Local/Temp/claude/C--Users-iriwa-Desktop-00-workspace-gbf-helper/166049f5-b9fd-402f-a61d-2e002751260d/scratchpad/dark_r";

function htmlToText(html) {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<(br|\/tr|\/table|\/div|\/li|\/p|\/h[1-6])\s*\/?>/gi, "\n");
  html = html.replace(/<[^>]+>/g, "");
  html = html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  html = html.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").replace(/^[ \t]+/gm, "");
  return html.trim();
}

function extractGameWithText(html) {
  const bodyStart = html.indexOf('id="article-body"');
  if (bodyStart === -1) return "(article-body not found)";
  let body = html.slice(bodyStart);
  const endMarker = body.indexOf("他のグラブル攻略記事");
  if (endMarker > 0) body = body.slice(0, endMarker);
  return htmlToText(body).slice(0, 6000);
}

const NON_CHARACTER_MARKERS = ["(Summon)", "(Raid)", "(Weapon)", "(NPC)", "(Enemy)", "/Lore", "/Voice", "(category", "(Skin)"];

function extractGbfWikiSearchCandidates(html) {
  const re = /<a href="\/([^"]+)" title="([^"]+)"/g;
  const seen = new Set();
  const results = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = decodeURIComponent(m[1]);
    const title = m[2];
    if (href.startsWith("index.php") || href.startsWith("Special:")) continue;
    if (NON_CHARACTER_MARKERS.some((marker) => title.includes(marker))) continue;
    if (seen.has(title)) continue;
    seen.add(title);
    results.push({ href, title });
    if (results.length >= 12) break;
  }
  return results;
}

const TAG_SUFFIX_HINTS = {
  "水着": ["(Summer)"],
  "浴衣": ["(Yukata)", "(Summer)"],
  "ハロウィン": ["(Halloween)", "(Holiday)"],
  "クリスマス": ["(Christmas)", "(Holiday)"],
  "バレンタイン": ["(Valentine)", "(Holiday)"],
  "ドレス": ["(Dress)", "(Holiday)"],
  "リミテッド": ["(Grand)"],
  "コラボ": [],
  "四聖": [],
  "配布": ["(Event)"],
};

// A bare "光アンリエット" (no 水着/浴衣/etc tag) is a distinct elemental version of a
// character who also exists in other elements — gbf.wiki names these "Name (Element)".
const ELEMENT_PREFIX_HINTS = {
  "光": ["(Light)"],
  "闇": ["(Dark)"],
  "火": ["(Fire)"],
  "水": ["(Water)"],
  "土": ["(Earth)"],
  "風": ["(Wind)"],
};

// GameWith's `tag` (rel attribute) is not always consistent with the character's
// actual displayed name (e.g. a character literally named "浴衣コルワ" was tagged
// 水着 instead of 浴衣, which picked the wrong gbf.wiki page — a same-named but
// different-element version). Derive the hint from the name text itself first —
// it's what a human would go by — and only fall back to the site's tag metadata
// if the name doesn't contain a recognizable keyword.
const NAME_KEYWORD_HINTS = [
  ["浴衣", ["(Yukata)", "(Summer)"]],
  ["水着", ["(Summer)"]],
  ["ハロウィン", ["(Halloween)", "(Holiday)"]],
  ["クリスマス", ["(Christmas)", "(Holiday)"]],
  ["バレンタイン", ["(Valentine)", "(Holiday)"]],
  ["ドレス", ["(Dress)", "(Holiday)"]],
];

// If the name or tag positively identifies this as a specific costume/element variant
// but none of that keyword's known hints match any fetched candidate, we do NOT fall
// back to guessing (candidates[0] or the bare page) — that has repeatedly picked a
// wrong, differently-kitted character/summon (Europa Summon, base-element Arriet,
// Summer-not-Yukata Korwa, 2018 Zooey (Event) instead of the 2025 Christmas version).
// Returning null forces a manual check for that one character instead of silently
// shipping cross-checked-against-the-wrong-entity data.
function pickCandidate(candidates, tag, name) {
  if (candidates.length === 0) return null;
  for (const [keyword, hints] of NAME_KEYWORD_HINTS) {
    if (!name.includes(keyword)) continue;
    for (const hint of hints) {
      const found = candidates.find((c) => c.title.includes(hint));
      if (found) return found;
    }
    return null;
  }
  const hints = TAG_SUFFIX_HINTS[tag] || [];
  if (hints.length > 0) {
    for (const hint of hints) {
      const found = candidates.find((c) => c.title.includes(hint));
      if (found) return found;
    }
    // NOTE: previously tried falling back to the bare (no-parens) title for
    // "リミテッド" tags, on the theory that Grand/Limited characters often have no
    // separate "(Grand)" page (true for Caesar, Basara). Disabled: it also matched
    // weapon/summon pages with no parenthetical marker at all (Sandalphon ->
    // "Triple Zero" summon, Cosmos -> "Cosmic Sword" weapon) — wrong more often than
    // right. Null out and let these get checked by hand instead.
    return null;
  }
  if (!tag) {
    const elementPrefix = name.match(/^(光|闇|火|水|土|風)/)?.[1];
    if (elementPrefix) {
      const elementHints = ELEMENT_PREFIX_HINTS[elementPrefix] || [];
      for (const hint of elementHints) {
        const found = candidates.find((c) => c.title.includes(hint));
        if (found) return found;
      }
      // No "(Element)" page exists on gbf.wiki for this variant — do not silently
      // fall back to the bare/base-element page, that would cross-check the wrong kit.
      return null;
    }
    const bare = candidates.find((c) => !c.title.includes("("));
    if (bare) return bare;
  }
  // Any other known-but-unmapped tag (e.g. "十二神将" zodiac characters, which have
  // yearly re-releases under the same base name) falls through to here. Guessing
  // candidates[0] has now been wrong for Makura (十二神将 -> matched an unrelated
  // 2025 Valentine version instead of the 2022 zodiac version, caught by an HP/ATK
  // mismatch). Null out rather than guess; these need a manual pick.
  return null;
}

const list = JSON.parse(fs.readFileSync(path.join(SCRATCH, "list.json"), "utf-8"));

// Phase 1: pick candidates, write a shell script to fetch chosen gbf.wiki pages
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
    candidate = pickCandidate(candidates, c.tag, c.name);
  }
  picks.push({ i, fname, name: c.name, tag: c.tag, href: c.href, candidate });
}
fs.writeFileSync(path.join(SCRATCH, "picks.json"), JSON.stringify(picks, null, 2));

// Phase 2: emit bash script to fetch each picked gbf.wiki page via curl
const SCRATCH_BASH_PATH =
  "/c/Users/iriwa/AppData/Local/Temp/claude/C--Users-iriwa-Desktop-00-workspace-gbf-helper/166049f5-b9fd-402f-a61d-2e002751260d/scratchpad/dark_r";
const lines = [
  "#!/bin/bash",
  `SCRATCH="${SCRATCH_BASH_PATH}"`,
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
console.log("fetch_pages.sh written with", lines.length - 2, "curl calls");
