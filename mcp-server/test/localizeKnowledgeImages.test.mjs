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
  const result = await localizeImages(root, { apply: true, delayMs: 0, now: () => clock,
    sleep: async ms => { clock += ms; }, onProgress: () => {}, fetchImage: async (url, init) => {
      assert.equal(init.redirect, "error"); times.push(clock);
      return new Response(url.endsWith(".png") ? png : jpeg,
        { headers: { "content-type": url.endsWith(".png") ? "image/png" : "image/jpeg" } });
    } });
  assert.deepEqual(times, [0, 1500]);
  assert.equal(result.downloaded, 2);
  const text = await fs.readFile(file, "utf8");
  assert.ok(text.includes('../_images/cdn/assets/img/sp/assets/leader/m/100501_01.jpg "title"'));
  assert.ok(!text.includes(host));
  assert.ok(!(await fs.readFile(template, "utf8")).includes(host));
  assert.ok((await fs.readFile(template, "utf8")).includes("{{job_id}}_01.jpg"));
  assert.ok((await fs.readFile(path.join(root, "docs/history.md"), "utf8")).includes(job));
  const manifest = JSON.parse(await fs.readFile(path.join(root, "knowledge/_images/manifest.json")));
  assert.equal(manifest.images.length, 2);
  assert.ok(manifest.images.every(i => i.sha256.length === 64 && i.bytes > 0));
  const offline = await localizeImages(root, { apply: true, onProgress: () => {}, fetchImage: async () => { throw new Error("offline"); } });
  assert.equal(offline.reused, 2);
  assert.deepEqual(offline.failed, []);
  assert.equal(offline.changedDocuments, 0);
  assert.deepEqual(await verifyLocalImages(root), { images: 2, localReferences: 3, errors: [] });
  await fs.writeFile(path.join(root, localImagePath(job)), Buffer.from([255, 216, 99, 0, 255, 217]));
  assert.ok((await verifyLocalImages(root)).errors.some(error => error.includes("SHA-256 mismatch")));
});

test("failed downloads leave original references and never save HTML; manifest path manipulation is rejected", async t => {
  const root = await setup(t);
  const file = path.join(root, "knowledge/jobs/job.md");
  await fs.writeFile(file, `![job](${job})\n`);
  const result = await localizeImages(root, { apply: true, onProgress: () => {},
    fetchImage: async () => new Response("login", { headers: { "content-type": "text/html" } }) });
  assert.equal(result.failed.length, 1);
  assert.ok((await fs.readFile(file, "utf8")).includes(job));
  await assert.rejects(fs.readFile(path.join(root, localImagePath(job))), { code: "ENOENT" });
  const manifest = path.join(root, "knowledge/_images/manifest.json");
  await fs.writeFile(manifest, JSON.stringify({ images: [{ source: job, localPath: "../../outside.jpg" }] }));
  await assert.rejects(localizeImages(root), /Invalid manifest image path/);
});

test("only fixed public image namespaces are accepted, including low-resolution weapon thumbnails", () => {
  assert.ok(localImagePath(`${host}/assets/img_low/sp/assets/weapon/m/1040014300.jpg`).endsWith("1040014300.jpg"));
  for (const url of ["https://game.granbluefantasy.jp/api/test.jpg", "https://example.com/x.jpg", `${job}?x=1`, `${host}/assets/private.jpg`]) {
    assert.throws(() => localImagePath(url), /Unsupported/);
  }
});
