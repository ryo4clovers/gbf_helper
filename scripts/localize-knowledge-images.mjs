import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HOST = "prd-game-a-granbluefantasy.akamaized.net";
const MAX_BYTES = 1_048_576;
const imagePattern = () => /!\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g;
const relative = (root, file) => path.relative(root, file).split(path.sep).join("/");
// Code examples document historical URLs; they are not rendered images.
const codePattern = () => /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;
const withoutCode = text => text.replace(codePattern(), "");

export function localImagePath(source) {
  const url = new URL(source);
  const match = /^\/assets\/(img|img_low)\/sp\/(?:assets\/(leader|weapon|npc|summon)\/m\/(\d+(?:_01(?:_st2)?)?\.jpg)|ui\/icon\/ability\/m\/(\d+(?:_\d+)?\.png))$/.exec(url.pathname);
  if (url.protocol !== "https:" || url.hostname !== HOST || url.port || url.username || url.password || url.search || url.hash || !match) {
    throw new Error(`Unsupported static image: ${source}`);
  }
  const category = { leader: "job", npc: "character", weapon: "weapon", summon: "summon" }[match[2]] ?? "ability";
  const filename = (match[3] ?? match[4]).replace(/\.(jpg|png)$/, match[1] === "img_low" ? "_low.$1" : ".$1");
  return `knowledge/_image/${category}/${filename}`;
}

const legacyImagePath = source => `knowledge/_images/cdn${new URL(source).pathname}`;
function imageSource(root, file, source) {
  if (/^https?:/.test(source)) return source;
  const target = relative(root, path.resolve(path.dirname(file), source));
  const prefix = "knowledge/_images/cdn/";
  return target.startsWith(prefix) ? `https://${HOST}/${target.slice(prefix.length)}` : undefined;
}
function templateImagePath(source) {
  const placeholders = [];
  const masked = source.replace(/\{\{?[^}]+\}\}?/g, value => { placeholders.push(value); return "987654321"; });
  let result = localImagePath(masked);
  for (const value of placeholders) result = result.replace("987654321", value);
  return result;
}
async function readManifest(root) {
  for (const directory of ["_image", "_images"]) {
    try { return JSON.parse(await fs.readFile(path.join(root, "knowledge", directory, "manifest.json"), "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return { images: [] };
}

export function validImage(bytes, filename) {
  if (!bytes.length || bytes.length > MAX_BYTES) return false;
  if (filename.endsWith(".jpg")) return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216
    && bytes.at(-2) === 255 && bytes.at(-1) === 217;
  return bytes.length >= 12 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (["_images", "_image"].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(file));
    else if (entry.name.endsWith(".md")) files.push(file);
  }
  return files.sort();
}

export async function inventoryImages(root) {
  const documents = [];
  const entries = new Map();
  const templates = [];
  const unsupported = [];
  let externalReferences = 0;
  for (const directory of ["knowledge", "docs"]) {
    for (const file of await markdownFiles(path.join(root, directory))) {
      const text = await fs.readFile(file, "utf8");
      documents.push({ file, text });
      for (const match of withoutCode(text).matchAll(imagePattern())) {
        const source = imageSource(root, file, match[1]);
        if (!source) continue;
        if (source.includes("{")) { templates.push({ file, source }); continue; }
        try {
          const localPath = localImagePath(source);
          if (/^https?:/.test(match[1])) externalReferences++;
          const entry = entries.get(source) ?? { source, localPath, documents: [] };
          if (!entry.documents.includes(relative(root, file))) entry.documents.push(relative(root, file));
          entries.set(source, entry);
        } catch (error) { unsupported.push({ document: relative(root, file), source, error: error.message }); }
      }
    }
  }
  return { documents, entries, templates, unsupported, externalReferences };
}

/** Offline verification of referenced files and committed source mapping. */
export async function verifyLocalImages(root) {
  const manifest = await readManifest(root);
  const errors = [];
  let references = 0;
  for (const { file, text } of (await inventoryImages(root)).documents) {
    for (const match of withoutCode(text).matchAll(/!\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)) {
      const source = match[1];
      if (source.includes("{")) continue;
      if (/^https?:/.test(source)) { errors.push(`External image remains: ${relative(root, file)}: ${source}`); continue; }
      references++;
      const target = path.resolve(path.dirname(file), source);
      try { if (!(await fs.stat(target)).isFile()) throw new Error("Not a file"); }
      catch { errors.push(`Missing local image: ${relative(root, file)}: ${source}`); }
    }
  }
  for (const entry of manifest.images) {
    try {
      if (localImagePath(entry.source) !== entry.localPath) throw new Error("Invalid manifest path");
      const bytes = await fs.readFile(path.join(root, entry.localPath));
      if (!validImage(bytes, entry.localPath) || createHash("sha256").update(bytes).digest("hex") !== entry.sha256) {
        throw new Error("Invalid image or SHA-256 mismatch");
      }
    } catch (error) { errors.push(`${entry.localPath}: ${error.message}`); }
  }
  return { images: manifest.images.length, localReferences: references, errors };
}

/** Resumable: committed manifest restores images even after Markdown URLs are localized. */
export async function localizeImages(root, { apply = false, collect = false, bothVariants = false, sources = [], legacyRoot = root, fetchImage = fetch, delayMs = 1500,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now,
  onProgress = console.log } = {}) {
  const inventory = await inventoryImages(root);
  const manifestPath = path.join(root, "knowledge/_image/manifest.json");
  const previous = await readManifest(root);
  for (const source of sources) inventory.entries.set(source, { source, localPath: localImagePath(source), documents: [] });
  for (const entry of previous.images) {
    // Validate persisted paths against the fixed CDN mapping, never trust filesystem paths from JSON.
    if (![localImagePath(entry.source), legacyImagePath(entry.source)].includes(entry.localPath)) throw new Error("Invalid manifest image path");
    const current = inventory.entries.get(entry.source);
    inventory.entries.set(entry.source, { ...entry, ...(current ?? {}), localPath: localImagePath(entry.source),
      documents: [...new Set([...(entry.documents ?? []), ...(current?.documents ?? [])])] });
  }
  if (bothVariants) {
    for (const entry of [...inventory.entries.values()]) {
      const source = entry.source.replace(/\/assets\/(img|img_low)\//, (_, kind) => kind === "img" ? "/assets/img_low/" : "/assets/img/");
      if (!inventory.entries.has(source)) inventory.entries.set(source, { source, localPath: localImagePath(source), documents: [] });
    }
  }
  const entries = [...inventory.entries.values()].sort((a, b) => a.source.localeCompare(b.source));
  const summary = { images: entries.length, externalReferences: inventory.externalReferences,
    templates: inventory.templates.length, unsupported: inventory.unsupported, downloaded: 0, reused: 0, migrated: 0, missing: [], failed: [], changedDocuments: 0 };
  if (!apply && !collect) return summary;
  const manifest = { schemaVersion: 1, note: "Public static images, local-only files; download success does not verify knowledge claims", images: entries };
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const saveManifest = async () => {
    const temporary = `${manifestPath}.part`;
    await fs.writeFile(temporary, JSON.stringify(manifest, null, 2) + "\n");
    // Windows indexers/antivirus may briefly hold the destination open.
    for (let attempt = 0; ; attempt++) {
      try { await fs.rename(temporary, manifestPath); break; }
      catch (error) {
        if (attempt >= 5 || !["EPERM", "EACCES", "EBUSY"].includes(error.code)) throw error;
        await new Promise(resolve => setTimeout(resolve, 50 * 2 ** attempt));
      }
    }
  };
  let nextFetchAt = 0;
  let processed = 0;
  for (const entry of entries) {
    const destination = path.join(root, entry.localPath);
    try {
      let bytes;
      try { bytes = await fs.readFile(destination); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      if (!bytes) {
        // Copy from the previous layout only; retain the source as a local backup.
        try {
          bytes = await fs.readFile(path.join(legacyRoot, legacyImagePath(entry.source)));
          if (!validImage(bytes, entry.localPath) || (entry.sha256 && createHash("sha256").update(bytes).digest("hex") !== entry.sha256)) {
            throw new Error("Invalid legacy image or SHA-256 mismatch");
          }
          await fs.mkdir(path.dirname(destination), { recursive: true });
          await fs.writeFile(destination, bytes, { flag: "wx" });
          summary.migrated++;
        } catch (error) { if (error.code !== "ENOENT") throw error; }
      }
      if (bytes && validImage(bytes, entry.localPath)
        && (!entry.sha256 || createHash("sha256").update(bytes).digest("hex") === entry.sha256)) summary.reused++;
      else {
        if (bytes) throw new Error("Invalid local image or SHA-256 mismatch; preserved without replacement");
        if (!collect) {
          summary.missing.push(entry.localPath);
          continue;
        }
        await sleep(Math.max(0, nextFetchAt - now()));
        nextFetchAt = now() + Math.max(1500, delayMs);
        const response = await fetchImage(entry.source, { redirect: "error", signal: AbortSignal.timeout(15000),
          headers: { Accept: entry.localPath.endsWith(".png") ? "image/png" : "image/jpeg" } });
        const mime = entry.localPath.endsWith(".png") ? "image/png" : "image/jpeg";
        if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith(mime)) {
          await response.body?.cancel(); throw new Error(`HTTP ${response.status} or invalid content type`);
        }
        if (!response.body) throw new Error("Empty image response");
        const chunks = []; let length = 0;
        for await (const chunk of response.body) {
          length += chunk.length;
          if (length > MAX_BYTES) throw new Error("Image exceeds 1 MiB");
          chunks.push(chunk);
        }
        bytes = Buffer.concat(chunks);
        if (!validImage(bytes, entry.localPath)) throw new Error("Invalid image signature");
        await fs.mkdir(path.dirname(destination), { recursive: true });
        const temporary = `${destination}.part`;
        try { await fs.writeFile(temporary, bytes); await fs.rename(temporary, destination); }
        finally { await fs.unlink(temporary).catch(() => {}); }
        entry.downloadedAt = new Date(now()).toISOString();
        summary.downloaded++;
      }
      entry.bytes = bytes.length;
      entry.downloadedAt ??= (await fs.stat(destination)).mtime.toISOString();
      entry.sha256 = createHash("sha256").update(bytes).digest("hex");
      delete entry.error;
    } catch (error) {
      entry.error = error.message;
      summary.failed.push({ source: entry.source, error: error.message });
    }
    // Checkpoint every 20 items; cached files allow recovery after interruption.
    if ((processed + 1) % 20 === 0 || processed + 1 === entries.length) await saveManifest();
    if (++processed % 20 === 0 || processed === entries.length) onProgress(JSON.stringify({ processed, total: entries.length,
      downloaded: summary.downloaded, reused: summary.reused, failed: summary.failed.length }));
  }
  for (const { file, text } of inventory.documents) {
    const changed = text.split(codePattern()).map((part, index) => index % 2 ? part : part.replace(imagePattern(), (full, source) => {
      const original = imageSource(root, file, source);
      if (!original) return full;
      let localPath;
      try { localPath = original.includes("{") ? templateImagePath(original) : localImagePath(original); }
      catch { return full; }
      return full.replace(source, relative(path.dirname(file), path.join(root, localPath)));
    })).join("");
    if (changed !== text) { await fs.writeFile(file, changed); summary.changedDocuments++; }
  }
  await saveManifest();
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const summary = process.argv.includes("--verify") ? await verifyLocalImages(root)
    : await localizeImages(root, { apply: process.argv.includes("--apply"), collect: process.argv.includes("--collect"), bothVariants: process.argv.includes("--both-variants"),
      sources: process.argv.filter(value => value.startsWith("--source=")).map(value => value.slice(9)),
      legacyRoot: process.argv.find(value => value.startsWith("--legacy-root="))?.slice(14) ?? root });
  console.log(JSON.stringify(summary));
  if (summary.errors?.length || summary.failed?.length || summary.unsupported?.length) process.exitCode = 1;
}
