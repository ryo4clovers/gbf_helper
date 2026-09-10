import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.js";
import { DEFAULT_CALCULATOR_DECK } from "../web/calculator-default-deck.js";

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
  assert.equal(DEFAULT_CALCULATOR_DECK.protagonist.jobId, "110001");
  assert.equal(DEFAULT_CALCULATOR_DECK.protagonist.attackOverride, 10885);
  assert.equal(DEFAULT_CALCULATOR_DECK.protagonist.hpOverride, 2885);
  assert.equal(DEFAULT_CALCULATOR_DECK.weapons[0].isJobFallback, true);
  assert.equal(DEFAULT_CALCULATOR_DECK.summons[0].summonId, "2030051000");
  assert.equal(DEFAULT_CALCULATOR_DECK.summons[0].attackOverride, 865);
  assert.equal(DEFAULT_CALCULATOR_DECK.summons[0].hpOverride, 433);
  assert.match(app, /deckConfig: structuredClone\(DEFAULT_CALCULATOR_DECK\),\s+supportSummon: undefined/u);
  assert.match(storage, /supportSummon: saved\.supportSummon/u);

  const resolution = resolveCalculatorDeckConfig(DEFAULT_CALCULATOR_DECK);
  assert.equal(resolution.deck.protagonist.attack, 10885);
  assert.equal(resolution.deck.summons[0].attack, 865);
  assert.equal(resolution.deck.summons[0].hp, 433);
  assert.equal(resolution.issues.some((issue) => issue.code === "missing-stat-override"), false);
});

test("web server exposes every root-relative module imported by the calculator", async () => {
  const [app, webServer] = await Promise.all([
    readFile(new URL("../web/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/webServer.ts", import.meta.url), "utf8"),
  ]);
  const importedPaths = [...app.matchAll(/from\s+["'](\/[^"']+)["']/gu)]
    .map((match) => new URL(match[1], "http://localhost").pathname);

  assert.ok(importedPaths.length > 0);
  for (const importedPath of importedPaths) {
    assert.match(webServer, new RegExp(`^[ \\t]*["']${importedPath.replaceAll(".", "\\.")}["']:`, "mu"));
  }
});

test("separates personal environment inputs from enemy battle conditions", async () => {
  const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");
  const section = (id) => {
    const start = html.indexOf(`id="${id}"`);
    const end = html.indexOf("</section>", start);
    assert.ok(start >= 0 && end > start);
    return html.slice(start, end);
  };
  const environment = section("personal-environment-panel");
  const battle = section("battle-conditions-panel");

  assert.match(environment, /<h2>個別環境ステータス<\/h2>/u);
  for (const id of ["all-element", "element-attack", "ship", "furnace", "job-damage", "damage-dealt", "target-damage", "random-min", "random-max", "random-step"]) {
    assert.match(environment, new RegExp(`id=["']${id}["']`));
    assert.doesNotMatch(battle, new RegExp(`id=["']${id}["']`));
  }
  for (const id of ["enemy-name", "enemy-defense", "enemy-element"]) {
    assert.match(battle, new RegExp(`id=["']${id}["']`));
    assert.doesNotMatch(environment, new RegExp(`id=["']${id}["']`));
  }
  assert.ok(html.indexOf('id="personal-environment-panel"') < html.indexOf('id="battle-conditions-panel"'));
});
