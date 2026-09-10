import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local result area exposes HP, critical rate, and DA/TA rate metrics", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../web/app.js", import.meta.url), "utf8"),
  ]);

  for (const id of ["protagonist-hp", "critical-rate", "da-rate", "ta-rate"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
    assert.match(app, new RegExp(`\\$\\(["']${id}["']\\)`));
  }
  assert.match(html, /<p>連撃率<\/p>/u);
});

test("formation area contains support summon and reset control with the requested default", async () => {
  const [html, app, storage] = await Promise.all([
    readFile(new URL("../web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../web/app.js", import.meta.url), "utf8"),
    readFile(new URL("../web/calculator-state-storage.js", import.meta.url), "utf8"),
  ]);

  const supportSummon = html.indexOf('id="support-summon-slot"');
  const battleConditions = html.indexOf("<h2>戦闘条件</h2>");
  assert.ok(supportSummon >= 0 && supportSummon < battleConditions);
  assert.match(html, /id="reset-formation"/u);
  assert.match(app, /\$\("reset-formation"\)\.addEventListener\("click", resetFormation\)/u);
  assert.match(app, /jobId: "110001",\s+jobNameHint: "ナイト"/u);
  assert.match(app, /weapons: \[\]/u);
  assert.match(app, /summonId: "2030051000", nameHint: "シルフィードベル"/u);
  assert.match(storage, /supportSummon: saved\.supportSummon/u);
});
