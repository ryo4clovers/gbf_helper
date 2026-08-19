import fs from "node:fs";
import path from "node:path";

// Parses each summon's individual GameWith page (fetched by
// scratch-fetch-gamewith-summons.sh) for per-uncap-tier call blocks:
// 召喚『スキル名』(N凸解放時) ... effect text ... 使用間隔/召喚までの間隔：Nターン
// and writes one merged call_tiers[] array per summon into summon_turns.json.
// Usage: node scratch-extract-summon-turns.mjs <scratch-dir-abs-path>

const SCRATCH = process.argv[2];
if (!SCRATCH) {
  console.error("usage: node scratch-extract-summon-turns.mjs <scratch-dir-abs-path>");
  process.exit(1);
}

function htmlToText(html) {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<(br|\/tr|\/table|\/div|\/li|\/p|\/h[1-6])\s*\/?>/gi, "\n");
  html = html.replace(/<[^>]+>/g, "");
  html = html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&times;/g, "×")
    .replace(/&rarr;/g, "→");
  html = html.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").replace(/^[ \t]+/gm, "");
  return html.trim();
}

// GameWith uses two different heading styles for the same thing across
// summon pages: 召喚『スキル名』(タグ) with a quoted skill name (Shiva), or
// bare 召喚 / 召喚(タグ) with no name at all (The Sun). The parenthesized tag
// itself varies freely ("4凸解放時", "最大解放時", "限界超越時" ...) — don't
// require a specific "凸" substring, just any single parenthetical group.
// Split on either starting a new block, ending at the next 召喚-block or the
// 加護効果 heading.
const BLOCK_START_RE = /召喚(?:『([^』]+)』)?\s*(?:\(([^)]+)\))?\n/g;

// Within one block: turn-count fields can appear independently, and GameWith
// phrases the "can't call again until turn N" concept three different ways
// across articles ("初回召喚", "使用可能") — treat them as equivalent. The
// recurring cooldown is likewise phrased two ways ("使用間隔"/"召喚までの間隔").
const FIRST_USE_RE = /(?:初回召喚|使用可能)[：:]\s*(\d+)ターン(?:後)?/;
const INTERVAL_RE = /(?:使用間隔|召喚までの間隔)[：:]\s*(\d+)ターン(?:後)?/;

function extractCallTiers(text) {
  const starts = [];
  let m;
  BLOCK_START_RE.lastIndex = 0;
  while ((m = BLOCK_START_RE.exec(text)) !== null) {
    starts.push({ index: m.index, end: m.index + m[0].length, skillName: m[1], tierTag: m[2] });
  }
  // "加護効果" also appears in the article's intro blurb, before any 召喚
  // block — search for the heading that actually terminates the last call
  // block, i.e. the first occurrence at or after that block starts. The
  // review-section heading ("XXXの評価と使い道") is a second, independent
  // universal marker every GameWith summon page has right after the skills
  // section — whichever boundary comes first wins, since either one alone
  // can occasionally be preceded by a stray same-word mention inside the
  // call effect text itself.
  let guardIdx = -1;
  if (starts.length > 0) {
    const from = starts[starts.length - 1].index;
    const auraIdx = text.indexOf("加護効果", from);
    const reviewIdx = text.search(/の(?:評価と使い道|評価\/使い方)/);
    const candidates = [auraIdx, reviewIdx].filter((x) => x > from);
    guardIdx = candidates.length > 0 ? Math.min(...candidates) : -1;
  }
  const tiers = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const blockEnd = i + 1 < starts.length ? starts[i + 1].index : guardIdx > -1 ? guardIdx : text.length;
    const body = text.slice(s.end, blockEnd);
    const firstUseMatch = body.match(FIRST_USE_RE);
    const intervalMatch = body.match(INTERVAL_RE);
    if (!firstUseMatch && !intervalMatch) continue; // not a real call block (e.g. false 召喚 mention in prose)
    // Strip the turn-count lines out of the effect text — they're surfaced
    // separately as 初回召喚/使用間隔 fields, so leaving them in the effect
    // bullet would just duplicate the same number twice.
    const cleanedEffect = body
      .replace(FIRST_USE_RE, "")
      .replace(INTERVAL_RE, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");
    // For the last tier on a page, the "加護効果" boundary search can land on
    // a mention embedded inside the call effect's own follow-up text rather
    // than the actual section heading, letting the slice run past the call
    // block into unrelated review prose. 220 chars comfortably covers every
    // real call effect description seen so far without reaching that far.
    tiers.push({
      skillName: s.skillName ? s.skillName.trim() : null,
      tier: s.tierTag ? s.tierTag.replace("解放時", "") : "初期",
      effect: cleanedEffect.slice(0, 220),
      firstUseTurn: firstUseMatch ? firstUseMatch[1] : null,
      cooldownTurns: intervalMatch ? intervalMatch[1] : null,
      noReSummon: body.includes("再召喚不可"),
    });
  }
  return tiers;
}

function extractGameWithBody(html) {
  const bodyStart = html.indexOf('id="article-body"');
  if (bodyStart === -1) return "";
  let body = html.slice(bodyStart);
  const endMarker = body.indexOf("他のグラブル攻略記事");
  if (endMarker > 0) body = body.slice(0, endMarker);
  return htmlToText(body);
}

const list = JSON.parse(fs.readFileSync(path.join(SCRATCH, "list.json"), "utf-8"));
const results = [];

for (let i = 0; i < list.length; i++) {
  const c = list[i];
  const idStr = String(i).padStart(3, "0");
  const pagePath = path.join(SCRATCH, "gamewith", `${idStr}_page.html`);
  if (!fs.existsSync(pagePath)) {
    results.push({ i, name: c.name, status: "PAGE_NOT_FOUND", tiers: [] });
    continue;
  }
  const html = fs.readFileSync(pagePath, "utf-8");
  const text = extractGameWithBody(html);
  const tiers = extractCallTiers(text);
  results.push({
    i,
    name: c.name,
    status: tiers.length > 0 ? "OK" : "NO_TIERS_FOUND",
    tiers,
  });
}

fs.writeFileSync(path.join(SCRATCH, "summon_turns.json"), JSON.stringify(results, null, 2));

const counts = {};
for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
console.log("summon_turns.json written:", results.length, "entries");
console.log(counts);
