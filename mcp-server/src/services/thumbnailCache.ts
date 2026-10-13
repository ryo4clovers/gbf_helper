import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";

const CDN = "https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/";
const MAX_BYTES = 1_048_576;
function jpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes.length <= MAX_BYTES && bytes[0] === 255 && bytes[1] === 216
    && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
}

/** Only catalog-listed static thumbnails; no game API, arbitrary URL or redirect. */
export function createThumbnailCache(options: {
  directory: string; allowedKeys: ReadonlySet<string>; delayMs?: number;
  fetchImage?: typeof fetch; now?: () => number; sleep?: (ms: number) => Promise<void>;
}) {
  const fetchImage = options.fetchImage ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  // A caller can increase the interval, but cannot remove production throttling.
  const delayMs = Math.max(1500, options.delayMs ?? 1500);
  const pending = new Map<string, Promise<Buffer>>();
  const failedUntil = new Map<string, number>();
  let queue: Promise<void> = Promise.resolve();
  let nextFetchAt = 0;

  async function load(key: string): Promise<Buffer> {
    const target = path.join(options.directory, key);
    try {
      const cached = await readFile(target);
      if (jpeg(cached)) return cached;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if ((failedUntil.get(key) ?? 0) > now()) throw new Error("画像取得の再試行待ちです");
    // Serialize cache misses across every category, including failed requests.
    const task = queue.then(async () => {
      if ((failedUntil.get(key) ?? 0) > now()) throw new Error("画像取得の再試行待ちです");
      await sleep(Math.max(0, nextFetchAt - now()));
      nextFetchAt = now() + delayMs;
      const response = await fetchImage(`${CDN}${key.replace("/", "/m/")}`, {
        redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { Accept: "image/jpeg" },
      });
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("image/jpeg")) {
        await response.body?.cancel();
        throw new Error("CDNからJPEG画像を取得できませんでした");
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (!response.body) throw new Error("画像レスポンスが空です");
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > MAX_BYTES) throw new Error("画像が保存上限を超えています");
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks);
      if (!jpeg(bytes)) throw new Error("JPEG画像の形式が不正です");
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.part`;
      try {
        await writeFile(temporary, bytes);
        await rename(temporary, target);
      } finally {
        await unlink(temporary).catch(() => {});
      }
      return bytes;
    });
    queue = task.then(() => {}, () => {});
    try { return await task; }
    catch (error) { failedUntil.set(key, now() + 300000); throw error; }
  }

  return {
    async get(key: string): Promise<Buffer | undefined> {
      if (!/^(npc|leader|weapon|summon)\/\d+(?:_01(?:_st2)?)?\.jpg$/.test(key)
        || !options.allowedKeys.has(key)) return undefined;
      const existing = pending.get(key);
      if (existing) return existing;
      // Bound queued work while scrolling through a large catalog.
      if (pending.size >= 128) throw new Error("画像取得の待機数が上限に達しました");
      const task = load(key);
      pending.set(key, task);
      try { return await task; }
      finally { pending.delete(key); }
    },
  };
}
