import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLocalImageStore } from "../src/services/localImageStore.ts";

const jpeg = Buffer.from([255,216,1,2,255,217]);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z8sAAAAASUVORK5CYII=", "base64");
async function setup(t: TestContext) {
  const directory = await mkdtemp(path.join(tmpdir(), "gbf-local-images-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("local images preserve normal/low variants, MIME and files across restarts", async t => {
  const directory = await setup(t);
  for (const category of ["weapon", "ability"]) await mkdir(path.join(directory, category));
  const low = Buffer.from([255,216,9,8,255,217]);
  for (const [name, bytes] of [["weapon/1040014300.jpg", jpeg], ["weapon/1040014300_low.jpg", low], ["ability/18_3.png", png]] as const) {
    await writeFile(path.join(directory, name), bytes);
    for (let restart = 0; restart < 2; restart++) {
      const image = await createLocalImageStore(directory).get(name);
      assert.deepEqual(image?.bytes, bytes);
      assert.equal(image?.contentType, name.endsWith("png") ? "image/png" : "image/jpeg");
    }
  }
});

test("missing images and directories never collect, and low does not replace normal", async t => {
  const directory = await setup(t);
  await mkdir(path.join(directory, "weapon"));
  await writeFile(path.join(directory, "weapon/1040014300_low.jpg"), jpeg);
  const original = globalThis.fetch;
  globalThis.fetch = async () => { assert.fail("Display must never fetch an image"); };
  try {
    assert.equal(await createLocalImageStore(directory).get("weapon/1040014300.jpg"), undefined);
    assert.equal(await createLocalImageStore(path.join(directory, "missing")).get("job/100501_01.jpg"), undefined);
    assert.deepEqual(await readFile(path.join(directory, "weapon/1040014300_low.jpg")), jpeg);
  } finally { globalThis.fetch = original; }
});

test("traversal, unrecognized types, corrupt and oversized images are not served or repaired", async t => {
  const directory = await setup(t);
  await mkdir(path.join(directory, "job"));
  const store = createLocalImageStore(directory);
  for (const key of ["../outside.jpg", "job/../outside.jpg", "job/x.svg", "private/x.jpg", "job/x.jpg?url=x", "job/x.jpg:stream", "https://example.com/x.jpg"]) {
    assert.equal(await store.get(key), undefined);
  }
  for (const bytes of [Buffer.from("html"), Buffer.alloc(1_048_577)]) {
    await writeFile(path.join(directory, "job/100501_01.jpg"), bytes);
    assert.equal(await store.get("job/100501_01.jpg"), undefined);
    assert.deepEqual(await readFile(path.join(directory, "job/100501_01.jpg")), bytes);
  }
});

test("directory junctions cannot expose images outside the configured root", async t => {
  const directory = await setup(t);
  const outside = await setup(t);
  await writeFile(path.join(outside, "100501_01.jpg"), jpeg);
  await symlink(outside, path.join(directory, "job"), "junction");
  assert.equal(await createLocalImageStore(directory).get("job/100501_01.jpg"), undefined);
});
