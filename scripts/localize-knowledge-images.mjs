import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HOST = "prd-game-a-granbluefantasy.akamaized.net";
const MAX_BYTES = 1_048_576;
const imagePattern = () => /!\[[^\]]*\]\((https?:\/\/[^\s)]+)(?:\s+[^)]*)?\)/g;
const relative = (root, file) => path.relative(root, file).split(path.sep).join("/");
// Code examples document historical URLs; they are not rendered images.
const codePattern = () => /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;
const withoutCode = text => text.replace(codePattern(), "");

export function localImagePath(source) {
  const url = new URL(source);
  if (url.protocol !== "https:" || url.hostname !== HOST || url.port || url.username || url.password || url.search || url.hash
    || !/^\/assets\/(?:img|img_low)\/sp\/(?:assets\/(?:leader|weapon)\/m\/\d+(?:_01)?\.jpg|ui\/icon\/ability\/m\/\d+(?:_\d+)?\.png)$/.test(url.pathname)) {
    throw new Error(`Unsupported static image: ${source}`);
  }
  return `knowledge/_images/cdn${url.pathname}`;
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
    if (entry.name === "_images") continue;
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
        const source = match[1];
        if (source.includes("{")) { templates.push({ file, source }); continue; }
        try {
          const localPath = localImagePath(source);
          externalReferences++;
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
  const manifest = JSON.parse(await fs.readFile(path.join(root, "knowledge/_images/manifest.json"), "utf8"));
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
export async function localizeImages(root, { apply = false, fetchImage = fetch, delayMs = 1500,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now,
  onProgress = console.log } = {}) {
  const inventory = await inventoryImages(root);
  const manifestPath = path.join(root, "knowledge/_images/manifest.json");
  let previous = { images: [] };
  try { previous = JSON.parse(await fs.readFile(manifestPath, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const entry of previous.images) {
    // Validate persisted paths against the fixed CDN mapping, never trust filesystem paths from JSON.
    if (localImagePath(entry.source) !== entry.localPath) throw new Error("Invalid manifest image path");
    const current = inventory.entries.get(entry.source);
    inventory.entries.set(entry.source, { ...entry, ...(current ?? {}) });
  }
  const entries = [...inventory.entries.values()].sort((a, b) => a.source.localeCompare(b.source));
  const summary = { images: entries.length, externalReferences: inventory.externalReferences,
    templates: inventory.templates.length, unsupported: inventory.unsupported, downloaded: 0, reused: 0, failed: [], changedDocuments: 0 };
  if (!apply) return summary;
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
  const saved = new Set();
  let nextFetchAt = 0;
  let processed = 0;
  for (const entry of entries) {
    const destination = path.join(root, entry.localPath);
    try {
      let bytes;
      try { bytes = await fs.readFile(destination); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      if (bytes && validImage(bytes, entry.localPath)
        && (!entry.sha256 || createHash("sha256").update(bytes).digest("hex") === entry.sha256)) summary.reused++;
      else {
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
      saved.add(entry.source);
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
      let localPath;
      if (saved.has(source)) localPath = inventory.entries.get(source).localPath;
      else if (source.includes("{")) {
        // Validate the namespace using numeric placeholder values, then retain the placeholders.
        try {
          localImagePath(source.replace(/\{\{?[^}]+\}\}?/g, "0"));
          localPath = `knowledge/_images/cdn/${source.slice(`https://${HOST}/`.length)}`;
        } catch { return full; }
      }
      if (!localPath) return full;
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
    : await localizeImages(root, { apply: process.argv.includes("--apply") });
  console.log(JSON.stringify(summary));
  if (summary.errors?.length || summary.failed?.length || summary.unsupported?.length) process.exitCode = 1;
}
