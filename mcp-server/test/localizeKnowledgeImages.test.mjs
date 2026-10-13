import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { localImagePath, inventoryImages, localizeImages, verifyLocalImages } from "../../scripts/localize-knowledge-images.mjs";

const host = "https://prd-game-a-granbluefantasy.akamaized.net";
const job = `${host}/assets/img/sp/assets/leader/m/100501_01.jpg`;
const ability = `${host}/assets/img/sp/ui/icon/ability/m/18_3.png`;
const jpeg = Buffer.from([255, 216, 1, 2, 255, 217]);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z8sAAAAASUVORK5CYII=", "base64");
async function setup(t) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "gbf-document-images-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "knowledge/jobs"), { recursive: true });
  await fs.mkdir(path.join(root, "docs"));
  return root;
}

test("document inventory deduplicates CDN images; delayed localization preserves titles and restores offline", async t => {
  const root = await setup(t);
  const file = path.join(root, "knowledge/jobs/job.md");
  await fs.writeFile(file, `![job](${job} "title")\n![repeat](${job})\n![ability](${ability})\n`);
  await fs.writeFile(path.join(root, "docs/history.md"), `Historical code: \`![job](${job})\`\n`);
  const template = path.join(root, "knowledge/jobs/_template.md");
  await fs.writeFile(template, `![template](${host}/assets/img/sp/assets/leader/m/{{job_id}}_01.jpg)\n`);
  assert.equal((await inventoryImages(root)).entries.size, 2);
  let clock = 0;
  const times = [];
  const result = await localizeImages(root, { apply: true, collect: true, delayMs: 0, now: () => clock,
    sleep: async ms => { clock += ms; }, onProgress: () => {}, fetchImage: async (url, init) => {
      assert.equal(init.redirect, "error"); times.push(clock);
      return new Response(url.endsWith(".png") ? png : jpeg,
        { headers: { "content-type": url.endsWith(".png") ? "image/png" : "image/jpeg" } });
    } });
  assert.deepEqual(times, [0, 1500]);
  assert.equal(result.downloaded, 2);
  const text = await fs.readFile(file, "utf8");
  assert.ok(text.includes('../_image/job/100501_01.jpg "title"'));
  assert.ok(!text.includes(host));
  assert.ok(!(await fs.readFile(template, "utf8")).includes(host));
  assert.ok((await fs.readFile(template, "utf8")).includes("{{job_id}}_01.jpg"));
  assert.ok((await fs.readFile(path.join(root, "docs/history.md"), "utf8")).includes(job));
  const manifest = JSON.parse(await fs.readFile(path.join(root, "knowledge/_image/manifest.json")));
  assert.equal(manifest.images.length, 2);
  assert.ok(manifest.images.every(i => i.sha256.length === 64 && i.bytes > 0));
  const offline = await localizeImages(root, { apply: true, sources: [job], onProgress: () => {}, fetchImage: async () => { throw new Error("offline"); } });
  assert.equal(offline.reused, 2);
  assert.deepEqual(offline.failed, []);
  assert.equal(offline.changedDocuments, 0);
  const restored = JSON.parse(await fs.readFile(path.join(root, "knowledge/_image/manifest.json")));
  assert.deepEqual(restored.images.find(entry => entry.source === job).documents, ["knowledge/jobs/job.md"]);
  assert.deepEqual(await verifyLocalImages(root), { images: 2, localReferences: 3, errors: [] });
  await fs.writeFile(path.join(root, localImagePath(job)), Buffer.from([255, 216, 99, 0, 255, 217]));
  assert.ok((await verifyLocalImages(root)).errors.some(error => error.includes("SHA-256 mismatch")));
});

test("failed downloads retain local references and never save HTML; manifest path manipulation is rejected", async t => {
  const root = await setup(t);
  const file = path.join(root, "knowledge/jobs/job.md");
  await fs.writeFile(file, `![job](${job})\n`);
  const result = await localizeImages(root, { apply: true, collect: true, onProgress: () => {},
    fetchImage: async () => new Response("login", { headers: { "content-type": "text/html" } }) });
  assert.equal(result.failed.length, 1);
  assert.ok((await fs.readFile(file, "utf8")).includes("../_image/job/100501_01.jpg"));
  await assert.rejects(fs.readFile(path.join(root, localImagePath(job))), { code: "ENOENT" });
  const manifest = path.join(root, "knowledge/_image/manifest.json");
  await fs.writeFile(manifest, JSON.stringify({ images: [{ source: job, localPath: "../../outside.jpg" }] }));
  await assert.rejects(localizeImages(root), /Invalid manifest image path/);
});

test("only fixed public image namespaces are accepted, including low-resolution weapon thumbnails", () => {
  assert.ok(localImagePath(`${host}/assets/img_low/sp/assets/weapon/m/1040014300.jpg`).endsWith("1040014300_low.jpg"));
  for (const url of ["https://game.granbluefantasy.jp/api/test.jpg", "https://example.com/x.jpg", `${job}?x=1`, `${host}/assets/private.jpg`]) {
    assert.throws(() => localImagePath(url), /Unsupported/);
  }
});


test("offline apply rewrites missing images without calling fetch, collection requires explicit opt-in", async t => {
  const root = await setup(t);
  const file = path.join(root, "knowledge/jobs/job.md");
  await fs.writeFile(file, `![job](${job})
`);
  let calls = 0;
  const result = await localizeImages(root, { apply: true, onProgress: () => {}, fetchImage: async () => { calls++; throw new Error("network"); } });
  assert.equal(calls, 0);
  assert.deepEqual(result.missing, [localImagePath(job)]);
  assert.equal(result.failed.length, 0);
  assert.ok((await fs.readFile(file, "utf8")).includes("../_image/job/100501_01.jpg"));
  assert.ok((await verifyLocalImages(root)).errors.length > 0, "optional missing files remain visible in the explicit audit");
});

test("legacy migration retains sources and stores normal/low separately without downloading", async t => {
  const root = await setup(t);
  const normal = `${host}/assets/img/sp/assets/weapon/m/1040014300.jpg`;
  const low = normal.replace("/img/", "/img_low/");
  const entries = [];
  for (const source of [normal, low]) {
    const localPath = `knowledge/_images/cdn${new URL(source).pathname}`;
    await fs.mkdir(path.dirname(path.join(root, localPath)), { recursive: true });
    await fs.writeFile(path.join(root, localPath), jpeg);
    entries.push({ source, localPath, documents: [] });
  }
  await fs.writeFile(path.join(root, "knowledge/_images/manifest.json"), JSON.stringify({ images: entries }));
  await fs.writeFile(path.join(root, "knowledge/jobs/job.md"), entries.map(e => `![image](${path.posix.relative("knowledge/jobs", e.localPath)})`).join("\n"));
  const result = await localizeImages(root, { apply: true, onProgress: () => {}, fetchImage: async () => assert.fail("Migration must be offline") });
  assert.equal(result.migrated, 2);
  assert.equal(result.downloaded, 0);
  assert.deepEqual(result.failed, []);
  assert.notEqual(localImagePath(normal), localImagePath(low));
  for (const entry of entries) assert.deepEqual(await fs.readFile(path.join(root, entry.localPath)), jpeg);
  assert.deepEqual(await verifyLocalImages(root), { images: 2, localReferences: 2, errors: [] });
});


test("explicit collection spaces normal and low requests and keeps their distinct bytes", async t => {
  const root = await setup(t);
  const normal = `${host}/assets/img/sp/assets/npc/m/3040456000_01_st2.jpg`;
  const lowBytes = Buffer.from([255,216,5,6,255,217]);
  let clock = 0;
  const calls = [];
  const result = await localizeImages(root, { collect: true, bothVariants: true, sources: [normal], delayMs: 0,
    now: () => clock, sleep: async ms => { clock += ms; }, onProgress: () => {},
    fetchImage: async source => {
      calls.push({ source, clock });
      return new Response(source.includes("/img_low/") ? lowBytes : jpeg, { headers: { "content-type": "image/jpeg" } });
    } });
  assert.equal(result.downloaded, 2);
  assert.deepEqual(calls.map(call => call.clock), [0, 1500]);
  assert.deepEqual(await fs.readFile(path.join(root, localImagePath(normal))), jpeg);
  assert.deepEqual(await fs.readFile(path.join(root, localImagePath(normal.replace("/img/", "/img_low/")))), lowBytes);
});
