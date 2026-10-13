import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("..", import.meta.url));
async function startServer(t, mode) {
  const cache = await mkdtemp(path.join(tmpdir(), "gbf-image-unavailable-"));
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ["--import", "tsx", "--import", "./test/fixtures/imageUnavailablePreload.mjs", "src/webServer.ts"], {
    cwd: directory, windowsHide: true, env: { ...process.env, GBF_CALCULATOR_PORT: String(port),
      GBF_THUMBNAIL_CACHE_DIR: cache, GBF_TEST_IMAGE_MODE: mode }, stdio: ["ignore", "ignore", "pipe"],
  });
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
    const image = mode === "no-images" ? undefined : fetch(base + job.imageUrl).catch(error => error);
    let imageSettled = false;
    image?.then(() => { imageSettled = true; });
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
    if (image && mode !== "pending") assert.equal((await image).status, 503);
    if (mode === "pending") {
      // The upstream image is still waiting when all calculation APIs have completed.
      assert.equal(imageSettled, false);
    }
  });
}
