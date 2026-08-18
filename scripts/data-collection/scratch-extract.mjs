import fs from "node:fs";
import path from "node:path";

const SCRATCH = "C:/Users/iriwa/AppData/Local/Temp/claude/C--Users-iriwa-Desktop-00-workspace-gbf-helper/166049f5-b9fd-402f-a61d-2e002751260d/scratchpad/fire_ssr";

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
  return htmlToText(body);
}

function extractGbfWikiSearchCandidates(html) {
  const re = /<a href="\/([^"]+)" title="([^"]+)"/g;
  const seen = new Set();
  const results = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = decodeURIComponent(m[1]);
    const title = m[2];
    if (href.startsWith("index.php") || href.startsWith("Special:")) continue;
    if (title.includes("/Lore") || title.includes("/Voice") || title.includes("(category")) continue;
    if (seen.has(title)) continue;
    seen.add(title);
    results.push({ href, title });
    if (results.length >= 8) break;
  }
  return results;
}

const idxArg = process.argv[2];
if (idxArg === undefined) {
  console.error("usage: node scratch-extract.mjs <index|all>");
  process.exit(1);
}

const list = JSON.parse(fs.readFileSync(path.join(SCRATCH, "list.json"), "utf-8"));

function processOne(i) {
  const c = list[i];
  const idStr = String(i).padStart(3, "0");
  const safeFilename = c.name.replace(/[\\/:*?"<>|]/g, "_");
  const fname = `${idStr}_${safeFilename}`;
  const gwPath = path.join(SCRATCH, "gamewith", `${fname}.html`);
  const gbfPath = path.join(SCRATCH, "gbfwiki", `${fname}_search.html`);
  if (!fs.existsSync(gwPath)) {
    console.log(`[${i}] ${c.name}: not fetched yet`);
    return;
  }
  const gwHtml = fs.readFileSync(gwPath, "utf-8");
  const gwText = extractGameWithText(gwHtml);
  const outPath = path.join(SCRATCH, "gamewith", `${fname}_text.txt`);
  fs.writeFileSync(outPath, gwText);

  let candidatesText = "(no gbf.wiki search file)";
  if (fs.existsSync(gbfPath)) {
    const gbfHtml = fs.readFileSync(gbfPath, "utf-8");
    const candidates = extractGbfWikiSearchCandidates(gbfHtml);
    candidatesText = candidates.map((c) => `${c.title} => https://gbf.wiki/${c.href}`).join("\n");
  }
  const candPath = path.join(SCRATCH, "gbfwiki", `${fname}_candidates.txt`);
  fs.writeFileSync(candPath, candidatesText);
  console.log(`[${i}] ${c.name}: extracted (${gwText.length} chars) candidates:\n${candidatesText}\n`);
}

if (idxArg === "all") {
  for (let i = 0; i < list.length; i++) processOne(i);
} else {
  processOne(Number(idxArg));
}
