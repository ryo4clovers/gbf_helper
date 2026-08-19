import fs from "node:fs";
import path from "node:path";

const SCRATCH = "C:/Users/iriwa/AppData/Local/Temp/claude/C--Users-iriwa-Desktop-00-workspace-gbf-helper/166049f5-b9fd-402f-a61d-2e002751260d/scratchpad/water_r";

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
  const endMarker = body.indexOf("出演声優一覧");
  if (endMarker > 0) body = body.slice(0, endMarker);
  return htmlToText(body).slice(0, 6000);
}

function extractGbfWikiPageText(html) {
  // Cut from title through "Contents" heading (infobox + charge attack + skills + support skills)
  const start = html.indexOf("<h1");
  let body = start >= 0 ? html.slice(start) : html;
  const endMarker = body.indexOf("Gameplay Notes");
  const endMarker2 = body.indexOf("Uncap Materials");
  const cut = endMarker > 0 ? endMarker : endMarker2 > 0 ? endMarker2 : 6000;
  body = body.slice(0, cut > 0 ? cut : 6000);
  return htmlToText(body).slice(0, 4000);
}

const list = JSON.parse(fs.readFileSync(path.join(SCRATCH, "list.json"), "utf-8"));
const picks = JSON.parse(fs.readFileSync(path.join(SCRATCH, "picks.json"), "utf-8"));

const outDir = path.join(SCRATCH, "dossiers");
fs.mkdirSync(outDir, { recursive: true });

const BATCH_SIZE = 8;
for (let start = 0; start < list.length; start += BATCH_SIZE) {
  const end = Math.min(start + BATCH_SIZE, list.length);
  const parts = [];
  for (let i = start; i < end; i++) {
    const c = list[i];
    const p = picks[i];
    const idStr = String(i).padStart(3, "0");
    const safe = c.name.replace(/[\\/:*?"<>|]/g, "_");
    const fname = `${idStr}_${safe}`;

    const gwPath = path.join(SCRATCH, "gamewith", `${fname}.html`);
    const gwText = fs.existsSync(gwPath) ? extractGameWithText(fs.readFileSync(gwPath, "utf-8")) : "(GameWith fetch missing)";

    let gbfText = "(no gbf.wiki candidate found)";
    let gbfUrl = "";
    if (p.candidate) {
      gbfUrl = `https://gbf.wiki/${p.candidate.href}`;
      const pagePath = path.join(SCRATCH, "gbfwiki", `${fname}_page.html`);
      if (fs.existsSync(pagePath)) {
        gbfText = extractGbfWikiPageText(fs.readFileSync(pagePath, "utf-8"));
      }
    }

    parts.push(
      `\n${"=".repeat(80)}\n[${i}] ${c.name} (element=${c.element}, tag=${c.tag}, gamewith=${c.href})\ngbf.wiki候補: ${gbfUrl || "(なし)"}\n${"-".repeat(80)}\n--- GameWith ---\n${gwText}\n\n--- gbf.wiki ---\n${gbfText}\n`,
    );
  }
  const outPath = path.join(outDir, `batch_${String(start).padStart(3, "0")}-${String(end - 1).padStart(3, "0")}.txt`);
  fs.writeFileSync(outPath, parts.join("\n"));
}

console.log("dossiers written to", outDir);
