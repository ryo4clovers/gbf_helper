import fs from "node:fs";
import path from "node:path";

// Fetches GameWith's "SSR召喚石の加護効果/召喚効果一覧" master page (a single
// table covering ~270 SSR summons with stats + guard/call effect text already
// inline, no per-summon page fetch needed), and writes one list.json entry per
// summon for the given element.
// Usage: node scratch-build-summon-list.mjs <element-jp e.g. 火> <scratch-dir-abs-path>

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const LIST_URL = "https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/136372";

// zoN class -> element, matches gbf.wiki's standard numbering (confirmed via
// spot-checks: シヴァ=zo1/火, エウロペ=zo2/水, バアル=zo3/土, グリームニル=zo4/風,
// ルシフェル=zo5/光, テュポーン=zo6/闇).
const ZONE_TO_ELEMENT = { 1: "火", 2: "水", 3: "土", 4: "風", 5: "光", 6: "闇" };
const ELEMENT_TO_ZONE = Object.fromEntries(Object.entries(ZONE_TO_ELEMENT).map(([k, v]) => [v, k]));

const element = process.argv[2];
const scratchDir = process.argv[3];
if (!element || !scratchDir) {
  console.error("usage: node scratch-build-summon-list.mjs <element-jp> <scratch-dir-abs-path>");
  process.exit(1);
}
if (!ELEMENT_TO_ZONE[element]) {
  console.error(`unknown element "${element}"; expected one of ${Object.keys(ELEMENT_TO_ZONE).join(", ")}`);
  process.exit(1);
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

async function main() {
  fs.mkdirSync(scratchDir, { recursive: true });
  const cachePath = path.join(scratchDir, "_raw_list_page.html");
  let html;
  if (fs.existsSync(cachePath)) {
    html = fs.readFileSync(cachePath, "utf-8");
    console.log("using cached raw list page");
  } else {
    const res = await fetch(LIST_URL, { headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.8" } });
    if (!res.ok) {
      console.error("fetch failed, status", res.status);
      process.exit(1);
    }
    html = await res.text();
    fs.writeFileSync(cachePath, html);
  }

  const listStart = html.indexOf("w-instant-database-list");
  const listEnd = html.indexOf("データ貼り付けここまで", listStart);
  if (listStart === -1 || listEnd === -1) {
    console.error("could not locate w-instant-database-list block");
    process.exit(1);
  }
  const listHtml = html.slice(listStart, listEnd);

  // Each summon spans 3 consecutive <tr class="w-idb-element zoN ..." data-col1="Name">
  // rows (stats / 加護効果 / 召喚効果). Find all opening-tag positions, then group
  // consecutive rows sharing the same data-col1 into one entry.
  const rowOpenRe = /<tr class="w-idb-element zo(\d)[^"]*" data-col1="([^"]+)">/g;
  const rows = [];
  let m;
  while ((m = rowOpenRe.exec(listHtml)) !== null) {
    rows.push({ zo: m[1], name: m[2], start: m.index, tagEnd: m.index + m[0].length });
  }

  const entries = [];
  let i = 0;
  while (i < rows.length) {
    const name = rows[i].name;
    const zo = rows[i].zo;
    let j = i;
    while (j + 1 < rows.length && rows[j + 1].name === name) j++;
    const blockStart = rows[i].start;
    const blockEnd = j + 1 < rows.length ? rows[j + 1].start : listHtml.length;
    const block = listHtml.slice(blockStart, blockEnd);

    const hrefMatch = block.match(/<a href='([^']+)'\s*>/);
    const statsMatch = block.match(
      /ATK<\/span>…([\d,]+)(?:\s*<span[^>]*>\(([\d,]+)\)<\/span>)?\s*\/\s*<span class='bolder'>HP<\/span>…([\d,]+)(?:\s*<span[^>]*>\(([\d,]+)\)<\/span>)?/,
    );
    const obtainMatch = block.match(/<\/a><\/span>((?:<span[^>]*>[^<]*<\/span>|[^<])*)<br>/);
    const guardMatch = block.match(/【加護効果】<\/span><br>([\s\S]*?)<\/td><\/tr>/);
    const callMatch = block.match(/【召喚効果】<\/span><br>([\s\S]*?)<\/td><\/tr>/);

    entries.push({
      name,
      element: ZONE_TO_ELEMENT[zo],
      href: hrefMatch ? hrefMatch[1] : "",
      obtain: obtainMatch ? stripTags(obtainMatch[1]) : "",
      atk: statsMatch ? statsMatch[1] : "",
      atk_max: statsMatch ? statsMatch[2] || statsMatch[1] : "",
      hp: statsMatch ? statsMatch[3] : "",
      hp_max: statsMatch ? statsMatch[4] || statsMatch[3] : "",
      guard_effect_raw: guardMatch ? stripTags(guardMatch[1]) : "",
      call_effect_raw: callMatch ? stripTags(callMatch[1]) : "",
    });
    i = j + 1;
  }

  console.log("parsed total summon entries:", entries.length);
  const filtered = entries.filter((e) => e.element === element);
  console.log(`filtered to element=${element}:`, filtered.length);
  fs.writeFileSync(path.join(scratchDir, "list.json"), JSON.stringify(filtered, null, 2));
  console.log("wrote", path.join(scratchDir, "list.json"));
}

main();
