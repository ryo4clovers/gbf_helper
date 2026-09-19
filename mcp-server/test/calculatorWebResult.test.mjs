import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.js";
import { DEFAULT_CALCULATOR_DECK } from "../web/calculator-default-deck.js";

test("local result area exposes HP, critical rate, DA/TA, and the crest toggle", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../web/app.js", import.meta.url), "utf8"),
  ]);

  for (const id of ["protagonist-hp", "critical-rate", "da-rate", "ta-rate", "limit-bonus-critical-toggle", "include-extinction-crest-local"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
    assert.match(app, new RegExp(`\\$\\(["']${id}["']\\)`));
  }
  for (const id of [
    "ability-damage-prediction",
    "ability-damage-note",
    "healing-cap-rate",
    "debuff-resistance-rate",
    "protagonist-defense-rate",
    "incoming-damage",
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
    assert.match(app, new RegExp(`\\$\\(["']${id}["']\\)`));
  }
  assert.match(html, /<h3 id="other-skill-results-title">その他スキル<\/h3>/u);
  assert.match(app, /incomingDebuffSuccessRateAt100Percent/u);
  assert.match(html, /<p>連撃率<\/p>/u);
  assert.match(html, /Rank基礎値から主人公の表示ATK・HPを自動計算します/u);
  assert.match(app, /武器スキル \+\$\{numberFormat\.format\(hp\.weaponSkillHpPercent\)\}%/u);
  assert.match(app, /otherSkills\.damageDealt\.effectivePercent/u);
  assert.match(app, /abilityDamage\.supplementalDamagePerHit/u);
  assert.match(app, /abilityDamage\.damageCapUpPercent/u);
  assert.match(html, /id="damage-dealt-rate"/u);
  assert.match(html, /id="enemy-preset"/u);
  assert.match(html, /ユーズド・木人/u);
  assert.match(app, /召喚石固定HP \+\$\{formatDamage\(hp\.summonAuraFlatHp\)\}/u);
  assert.match(app, /基礎HPの基準は要検証/u);
  const hpSliderPosition = html.indexOf('id="protagonist-hp-percent"');
  assert.ok(html.indexOf('class="surface result-group local-result-group"') < hpSliderPosition);
  assert.ok(hpSliderPosition < html.indexOf('id="weapon-critical-toggle"'));
  assert.match(html, /id="protagonist-hp-percent" type="range" value="100" min="1" max="100" step="1"/u);
  assert.match(html, /id="protagonist-hp-percent-value" for="protagonist-hp-percent">100%<\/output>/u);
  assert.match(app, /\$\("protagonist-hp-percent"\)\.addEventListener\("change", \(\) => void calculate\(\)\)/u);
  assert.ok(html.indexOf('id="weapon-critical-toggle"') < html.indexOf('id="limit-bonus-critical-toggle"'));
  assert.ok(html.indexOf('id="limit-bonus-critical-toggle"') < html.indexOf('id="include-extinction-crest-local"'));
  assert.ok(html.indexOf('id="include-extinction-crest-local"') < html.indexOf('class="metric-grid local-result-grid"'));
  assert.doesNotMatch(html, /<details class="advanced-settings memorial-settings" open>/u);
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

test("catalog initialization never overwrites persisted job completion state after a restart failure", async () => {
  const app = await readFile(new URL("../web/app.js", import.meta.url), "utf8");
  const loadPosition = app.indexOf("await loadCalculatorCatalogs();");
  const restorePosition = app.indexOf("restorePersistedState();", loadPosition);
  const persistencePosition = app.indexOf("persistenceReady = true;", loadPosition);
  assert.ok(loadPosition >= 0 && loadPosition < restorePosition && restorePosition < persistencePosition);
  assert.match(app, /const CATALOG_LOAD_RETRY_DELAYS_MS = \[0, 250, 750\];/u);
  assert.match(app, /catch \(error\) \{[\s\S]*setPersistenceStatus\("カタログ未取得のため自動保存を停止しています", true\);[\s\S]*return;[\s\S]*\}\s+renderJobCompletionEditor/u);
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

test("web server permits the known job thumbnail host without widening other CSP directives", async () => {
  const webServer = await readFile(new URL("../src/webServer.ts", import.meta.url), "utf8");
  assert.match(
    webServer,
    /img-src 'self' data: https:\/\/prd-game-a-granbluefantasy\.akamaized\.net;/u,
  );
  assert.match(webServer, /connect-src 'self';/u);
});

test("job thumbnails retain the source image aspect ratio at larger sizes", async () => {
  const styles = await readFile(new URL("../web/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.job-symbol \{[^}]*width: 140px;[^}]*height: 80px;[^}]*aspect-ratio: 7 \/ 4;/u);
  assert.match(styles, /\.job-catalog-art \{[^}]*width: 140px;[^}]*height: 80px;[^}]*aspect-ratio: 7 \/ 4;/u);
  assert.match(styles, /\.job-thumbnail \{[^}]*object-fit: contain;/u);
});

test("weapon and summon thumbnails retain the existing calculator art size", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../web/app.js", import.meta.url), "utf8"),
    readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /function createEquipmentArt\(/u);
  assert.match(app, /image\.className = "equipment-thumbnail";/u);
  assert.match(styles, /\.equipment-thumbnail \{[^}]*position: absolute;[^}]*width: 100%;[^}]*height: 100%;[^}]*object-fit: contain;/u);
  assert.match(styles, /\.image-loaded \.equipment-art-fallback \{[^}]*visibility: hidden;/u);
});

test("only weapon and summon picker thumbnails use the source image aspect ratio", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../web/app.js", import.meta.url), "utf8"),
    readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /button\.className = "catalog-weapon-card catalog-equipment-card";/u);
  assert.match(app, /button\.className = "catalog-weapon-card catalog-equipment-card catalog-summon-card";/u);
  assert.match(styles, /\.catalog-equipment-card \.catalog-art \{[^}]*width: 119px;[^}]*height: 68px;[^}]*aspect-ratio: 7 \/ 4;/u);
  assert.doesNotMatch(styles, /\.weapon-art \{[^}]*aspect-ratio: 7 \/ 4;/u);
});

test("weapon and summon pickers expose remove actions while protecting the main summon", async () => {
  const [html, app, styles] = await Promise.all([
    readFile(new URL("../web/index.html", import.meta.url), "utf8"),
    readFile(new URL("../web/app.js", import.meta.url), "utf8"),
    readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="remove-weapon"[^>]*>外す<\/button>/u);
  assert.match(html, /id="remove-summon"[^>]*>外す<\/button>/u);
  assert.match(app, /removeButton\.disabled = position === "main" \|\| !summonForSlot/u);
  assert.match(app, /if \(position === "main"\) return;/u);
  assert.match(styles, /\.weapon-picker\[open\] \{[^}]*display: flex;[^}]*flex-direction: column;/u);
  assert.match(styles, /\.weapon-results \{[^}]*min-height: 0;[^}]*flex: 1 1 430px;[^}]*overflow-y: auto;/u);
  assert.match(styles, /\.picker-footer \{[^}]*flex: 0 0 auto;/u);
});

test("job picker exposes class filter controls below search", async () => {
  const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");
  const searchPosition = html.indexOf('id="job-search"');
  const filterPosition = html.indexOf('id="job-class-filters"');
  const resultPosition = html.indexOf('id="job-results"');
  assert.ok(searchPosition >= 0 && searchPosition < filterPosition && filterPosition < resultPosition);
  assert.match(html, /id="job-class-filter-status"/u);
});

test("protagonist LB editor groups inputs with icons and connection status", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../web/app.js", import.meta.url), "utf8"),
    readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  ]);
  for (const label of ["基礎ステータス", "クリティカル", "得意武器攻撃", "連続攻撃", "属性攻撃"]) {
    assert.match(app, new RegExp(`label: ["']${label}["']`, "u"));
  }
  assert.match(app, /PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS\s*\.map/u);
  assert.match(app, /\["hp2LimitBonusLevel", "hp", "HP II", ""\]/u);
  assert.match(app, /createText\("limit-bonus-group-icon", icon\)/u);
  assert.match(styles, /\.limit-bonus-group > summary/u);
  assert.match(styles, /\.limit-bonus-status\.connected/u);
  assert.match(styles, /\.limit-bonus-status\.unconnected/u);
  const orderStart = app.indexOf("const PROTAGONIST_LIMIT_BONUS_GROUP_ORDER");
  const orderSource = app.slice(orderStart, app.indexOf("]);", orderStart) + 3);
  assert.deepEqual(
    [...orderSource.matchAll(/"([^"]+)"/gu)].map((match) => match[1]),
    [
      "base-stats", "proficiency", "element-attack", "multiattack",
      "damage-multiplier", "damage-cap", "critical", "defense-evasion",
      "healing", "element-reduction", "debuff", "special",
    ],
  );
});

test("catalog pickers expose element and rarity filters below search", async () => {
  const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");
  for (const catalog of ["weapon", "summon", "character"]) {
    const searchPosition = html.indexOf(`id="${catalog}-search"`);
    const elementPosition = html.indexOf(`id="${catalog}-element-filters"`);
    const rarityPosition = html.indexOf(`id="${catalog}-rarity-filters"`);
    const resultPosition = html.indexOf(`id="${catalog}-results"`);
    assert.ok(
      searchPosition >= 0
      && searchPosition < elementPosition
      && elementPosition < rarityPosition
      && rarityPosition < resultPosition,
    );
    assert.match(html, new RegExp(`id="${catalog}-filter-status"`, "u"));
  }
});

test("weapon picker exposes weapon kind filters after rarity", async () => {
  const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");
  const rarityPosition = html.indexOf('id="weapon-rarity-filters"');
  const weaponKindPosition = html.indexOf('id="weapon-kind-filters"');
  const resultPosition = html.indexOf('id="weapon-results"');
  assert.ok(rarityPosition >= 0 && rarityPosition < weaponKindPosition && weaponKindPosition < resultPosition);
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
  for (const id of [
    "player-rank",
    "job-completion-editor",
    "job-completion-summary",
    "complete-all-jobs",
    "clear-completed-jobs",
    "crew-support-editor",
    "memorial-item-editor",
    "random-min",
    "random-max",
    "random-step",
  ]) {
    assert.match(environment, new RegExp(`id=["']${id}["']`));
    assert.doesNotMatch(battle, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(environment, /id=["']job-damage["']/u);
  assert.doesNotMatch(environment, /id=["'](?:ship|furnace)["']/u);
  assert.match(environment, /<details class="advanced-settings crew-support-settings">/u);
  assert.doesNotMatch(environment, /<details class="advanced-settings crew-support-settings" open>/u);
  for (const id of ["enemy-name", "enemy-defense", "enemy-element"]) {
    assert.match(battle, new RegExp(`id=["']${id}["']`));
    assert.doesNotMatch(environment, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(battle, /id=["']protagonist-hp-percent["']/u);
  assert.doesNotMatch(environment, /id=["']protagonist-hp-percent["']/u);
  assert.ok(html.indexOf('id="personal-environment-panel"') < html.indexOf('id="battle-conditions-panel"'));
});
