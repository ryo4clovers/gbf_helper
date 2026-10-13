import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("..", import.meta.url));
async function startServer(t, mode, assets = {}) {
  const cache = await mkdtemp(path.join(tmpdir(), "gbf-image-unavailable-"));
  for (const [key, bytes] of Object.entries(assets)) {
    await mkdir(path.dirname(path.join(cache, key)), { recursive: true });
    await writeFile(path.join(cache, key), bytes);
  }
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ["--import", "tsx", "--import", "./test/fixtures/imageUnavailablePreload.mjs", "src/webServer.ts"], {
    cwd: directory, windowsHide: true, env: { ...process.env, GBF_CALCULATOR_PORT: String(port),
      GBF_IMAGE_DIR: cache, GBF_TEST_IMAGE_MODE: mode }, stdio: ["ignore", "ignore", "pipe"],
  });
  let diagnostics = "";
  child.stderr.on("data", data => { diagnostics += String(data); });
  t.after(() => assert.ok(!diagnostics.includes("TEST_UNEXPECTED_EXTERNAL_FETCH"), "Display and calculations must never fetch from upstream"));
  const exited = new Promise(resolve => child.once("exit", resolve));
  t.after(async () => { child.kill(); await exited; await rm(cache, { recursive: true, force: true }); });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Test server did not start")), 30000);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.stderr.on("data", data => { if (String(data).includes("GBF Calculator:")) { clearTimeout(timer); resolve(); } });
    child.once("exit", code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
  });
  return `http://127.0.0.1:${port}`;
}

async function post(base, endpoint, body) {
  const response = await fetch(base + endpoint, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return endpoint === "/api/calculate" ? result.result : result;
}

let expectedFangDistribution;
for (const mode of ["no-images", "failed", "offline", "pending"]) {
  test(`formation catalogs, Fang and battle simulation do not depend on images: ${mode}`, async t => {
    const base = await startServer(t, mode);
    const [jobs, characters, weapons, summons] = await Promise.all(["jobs", "characters", "weapons", "summons"]
      .map(async name => (await (await fetch(`${base}/api/catalog/${name}`)).json())[name]));
    assert.ok([jobs, characters, weapons, summons].every(entries => entries.length > 0));
    const job = jobs.find(j => j.jobId === "100501");
    const weapon = weapons.find(w => w.weaponId === "1040014300");
    assert.ok(job && weapon);
    const fangId = job.abilities.candidates.find(ability => ability.name === "ビーストファング")?.id;
    assert.ok(fangId);
    if (mode === "no-images") assert.ok([...jobs, ...characters, ...weapons, ...summons].every(entry => !entry.imageUrl));
    if (mode !== "no-images") assert.equal((await fetch(base + job.imageUrl, { signal: AbortSignal.timeout(5000) })).status, 404);
    const calculation = { schemaVersion: 1, deckConfig: { schemaVersion: 1, format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "6", jobId: job.jobId, jobLevel: 50, attackOverride: 50000, hpOverride: 1000,
        abilityIds: [fangId, null, null] },
      weapons: [{ slot: 1, position: "main", weaponId: weapon.weaponId, level: 150, uncapLevel: 4, skillLevel: 15 }],
      characters: [], summons: [] }, enemy: { elementCode: "5", defense: 10 }, modifiers: {} };
    const normal = await post(base, "/api/calculate", calculation);
    assert.ok(normal);
    const turn = { calculation, characters: [], mode: "downside", secondsPerTurn: 15,
      protagonistCharge: { enabled: true, gauge: 0 } };
    const fang = await post(base, "/api/simulate-turn", { ...turn, action: { kind: "fighter-ability", ability: "beast-fang" } });
    const event = fang.events.find(e => e.kind === "fighter-ability");
    assert.ok(event.damage.perHit.minimum > 0);
    expectedFangDistribution ??= event.damage.predictions;
    assert.deepEqual(event.damage.predictions, expectedFangDistribution, "image state must not affect damage");
    const attack = await post(base, "/api/simulate-turn", { ...turn, state: fang.endState });
    assert.ok(attack.events.some(e => e.kind === "normal"));
    assert.ok(attack.endState.turn > fang.endState.turn);
  });
}


test("HTTP serves local JPEG/PNG and distinct variants without contacting upstream", async t => {
  const normal = Buffer.from([255,216,1,2,255,217]);
  const low = Buffer.from([255,216,8,9,255,217]);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z8sAAAAASUVORK5CYII=", "base64");
  const assets = { "weapon/1040014300.jpg": normal, "weapon/1040014300_low.jpg": low, "ability/18_3.png": png };
  const base = await startServer(t, "offline", assets);
  for (const [key, bytes] of Object.entries(assets)) {
    const response = await fetch(base + "/images/" + key);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), key.endsWith("png") ? "image/png" : "image/jpeg");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    const head = await fetch(base + "/images/" + key, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), String(bytes.length));
    assert.equal((await head.arrayBuffer()).byteLength, 0);
  }
  for (const target of ["/images/job/100501_01.jpg", "/images/weapon/1040014300.jpg:private", "/thumbnails/weapon/1040014300.jpg"]) {
    assert.equal((await fetch(base + target)).status, 404);
  }
});
