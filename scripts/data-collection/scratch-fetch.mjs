import fs from "node:fs";
import path from "node:path";

const SCRATCH = "C:/Users/iriwa/AppData/Local/Temp/claude/C--Users-iriwa-Desktop-00-workspace-gbf-helper/166049f5-b9fd-402f-a61d-2e002751260d/scratchpad/fire_ssr";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const list = JSON.parse(fs.readFileSync(path.join(SCRATCH, "list.json"), "utf-8"));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.8" } });
  return { status: res.status, body: await res.text() };
}

function safeFilename(s) {
  return s.replace(/[\\/:*?"<>|]/g, "_");
}

async function main() {
  const startIndex = Number(process.argv[2] || 0);
  const endIndex = Number(process.argv[3] || list.length);
  const progressPath = path.join(SCRATCH, "fetch-progress.json");
  let progress = fs.existsSync(progressPath) ? JSON.parse(fs.readFileSync(progressPath, "utf-8")) : {};

  for (let i = startIndex; i < Math.min(endIndex, list.length); i++) {
    const c = list[i];
    const idStr = String(i).padStart(3, "0");
    const fname = `${idStr}_${safeFilename(c.name)}`;
    if (progress[fname]?.done) continue;

    try {
      const gw = await fetchText(c.href);
      fs.writeFileSync(path.join(SCRATCH, "gamewith", `${fname}.html`), gw.body);

      await sleep(600);

      const searchName = c.name.replace(/^(水着|浴衣|光|闇|火|水|土|風)/, "").replace(/\(.*?\)/g, "").trim() || c.name;
      const searchUrl = `https://gbf.wiki/index.php?search=${encodeURIComponent(searchName)}&title=Special%3ASearch`;
      const gbfSearch = await fetchText(searchUrl);
      fs.writeFileSync(path.join(SCRATCH, "gbfwiki", `${fname}_search.html`), gbfSearch.body);

      progress[fname] = { done: true, index: i, name: c.name, gwStatus: gw.status, gbfSearchStatus: gbfSearch.status };
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
      console.log(`[${i}] ${c.name} -> gw:${gw.status} gbfsearch:${gbfSearch.status}`);
    } catch (err) {
      console.error(`[${i}] ${c.name} FAILED: ${err.message}`);
      progress[fname] = { done: false, index: i, name: c.name, error: err.message };
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
    }

    await sleep(700);
  }
  console.log("DONE batch", startIndex, endIndex);
}

main();
