import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createThumbnailCache } from "../src/services/thumbnailCache.ts";

const bytes = Buffer.from([255, 216, 1, 2, 255, 217]);
const keys = new Set(["npc/3040456000_01.jpg", "npc/3040456000_01_st2.jpg", "leader/100501_01.jpg", "weapon/1040014300.jpg"]);
const image = () => new Response(bytes, { headers: { "content-type": "image/jpeg" } });

test("cache coalesces concurrent images, spaces all category misses and survives restart offline", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "gbf-thumbnails-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let clock = 0;
  const calls: { url: string; time: number }[] = [];
  const cache = createThumbnailCache({ directory, allowedKeys: keys, delayMs: 0, now: () => clock,
    sleep: async ms => { clock += ms; }, fetchImage: async (url, init) => {
      assert.equal(init?.redirect, "error");
      assert.ok(init?.signal);
      calls.push({ url: String(url), time: clock });
      return image();
    } });
  await Promise.all([cache.get("npc/3040456000_01.jpg"), cache.get("npc/3040456000_01.jpg"),
    cache.get("leader/100501_01.jpg"), cache.get("npc/3040456000_01_st2.jpg")]);
  assert.deepEqual(calls.map(c => c.time), [0, 1500, 3000]);
  assert.ok(calls.some(c => c.url === "https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/npc/m/3040456000_01.jpg"));
  assert.ok(calls.some(c => c.url.endsWith("_01_st2.jpg")));
  assert.deepEqual(await readFile(path.join(directory, "npc/3040456000_01.jpg")), bytes);
  const offline = createThumbnailCache({ directory, allowedKeys: keys, fetchImage: async () => { throw new Error("offline"); } });
  assert.deepEqual(await offline.get("npc/3040456000_01.jpg"), bytes);
  assert.equal(calls.length, 3);
  for (const key of ["../outside.jpg", "npc/9999999999_01.jpg", "https://example.com/image.jpg", "npc/3040456000_01.jpg?url=x"]) {
    assert.equal(await cache.get(key), undefined);
  }
  assert.equal(calls.length, 3);
});

test("failure cooldown avoids repeat downloads, allows other images, then permits recovery", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "gbf-thumbnails-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let clock = 0, count = 0;
  const cache = createThumbnailCache({ directory, allowedKeys: keys, now: () => clock,
    sleep: async ms => { clock += ms; }, fetchImage: async () => ++count === 1 ? new Response("missing", { status: 404 }) : image() });
  await assert.rejects(cache.get("npc/3040456000_01.jpg"));
  await assert.rejects(cache.get("npc/3040456000_01.jpg"));
  assert.equal(count, 1);
  assert.deepEqual(await cache.get("leader/100501_01.jpg"), bytes);
  clock += 300000;
  assert.deepEqual(await cache.get("npc/3040456000_01.jpg"), bytes);
  assert.equal(count, 3);
});

test("HTML and oversized/invalid images are never saved; invalid disk images are repaired", async t => {
  for (const response of [new Response("html", { headers: { "content-type": "text/html" } }),
    new Response("bad", { headers: { "content-type": "image/jpeg" } }),
    new Response(new Uint8Array(1_048_577), { headers: { "content-type": "image/jpeg" } })]) {
    const directory = await mkdtemp(path.join(tmpdir(), "gbf-thumbnails-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const cache = createThumbnailCache({ directory, allowedKeys: keys, fetchImage: async () => response });
    await assert.rejects(cache.get("weapon/1040014300.jpg"));
    await assert.rejects(readFile(path.join(directory, "weapon/1040014300.jpg")), { code: "ENOENT" });
  }
  const directory = await mkdtemp(path.join(tmpdir(), "gbf-thumbnails-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "weapon"));
  await writeFile(path.join(directory, "weapon/1040014300.jpg"), "corrupt");
  const cache = createThumbnailCache({ directory, allowedKeys: keys, fetchImage: async () => image() });
  assert.deepEqual(await cache.get("weapon/1040014300.jpg"), bytes);
});
