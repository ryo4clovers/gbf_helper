import fs from "node:fs";
import path from "node:path";

// Fetches GameWith's SSR character list (default "new release" order) and
// filters to one element, writing list.json into the given scratch dir.
// Usage: node scratch-build-list.mjs <element-jp e.g. 火> <scratch-dir-abs-path>

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const LIST_URL = "https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/20722";

const element = process.argv[2];
const scratchDir = process.argv[3];
if (!element || !scratchDir) {
  console.error("usage: node scratch-build-list.mjs <element-jp> <scratch-dir-abs-path>");
  process.exit(1);
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
    html = await res.text();
    fs.writeFileSync(cachePath, html);
  }

  const olStart = html.indexOf('id="GBFCharactorList"');
  if (olStart === -1) {
    console.error("GBFCharactorList not found in page (status " + res.status + ")");
    process.exit(1);
  }
  const olBody = html.slice(olStart);
  const liRe = /<li data-attr='([^']*)'[^>]*data-kana='([^']*)'>([\s\S]*?)<\/li>/g;
  const all = [];
  let m;
  while ((m = liRe.exec(olBody)) !== null) {
    const [, attr, kana, inner] = m;
    const hrefMatch = inner.match(/<a href='([^']+)'/);
    const nameBlockMatch = inner.match(/<div class='_n'(?: rel='([^']*)')?>([^<]*)<\/div>/);
    all.push({
      element: attr,
      kana,
      href: hrefMatch ? hrefMatch[1] : "",
      tag: nameBlockMatch ? nameBlockMatch[1] || "" : "",
      name: nameBlockMatch ? nameBlockMatch[2].trim() : "",
      rating: "",
    });
  }
  console.log("parsed total li entries:", all.length);
  const filtered = all.filter((c) => c.element === element);
  console.log(`filtered to element=${element}:`, filtered.length);
  fs.writeFileSync(path.join(scratchDir, "list.json"), JSON.stringify(filtered, null, 2));
  console.log("wrote", path.join(scratchDir, "list.json"));
}

main();
