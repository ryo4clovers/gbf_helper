import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { PROTAGONIST_OTHER_LIMIT_BONUS_DEFINITIONS as definitions } from "../web/protagonist-limit-bonus-catalog.js";
import { calculateWeaponChargeDamage } from "../src/calculator/weaponChargeAttack.js";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.js";

const app = readFileSync(new URL("../web/app.js", import.meta.url), "utf8");
function functionSource(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return app.slice(start, app.indexOf("\nfunction ", start + 1));
}

function chargeRequest() {
  return {
    schemaVersion: 1,
    deckConfig: {
      schemaVersion: 1, format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "6", jobId: "110001", jobLevel: 20, attackOverride: 10000, hpOverride: 1000 },
      weapons: [{ slot: 1, position: "main", weaponId: "1040014300", level: 150, uncapLevel: 4, skillLevel: 15 }],
      summons: [], characters: [],
    },
    enemy: { elementCode: "5", defense: 10 },
  };
}

test("each charge LB change saves and immediately recalculates the new level, including removal", () => {
  for (const id of ["21", "35", "41", "91"]) {
    const definition = definitions.find(entry => entry.id === id);
    assert.equal(definition.connected, true);
    assert.match(definition.connectionScope, /メイン武器.*主人公奥義.*下書き/u);
    const request = chargeRequest();
    let config = request.deckConfig, calculationCount = 0, latestCharge;
    const elements = [];
    const document = { createElement(tag) {
      const element = { tag, children: [], attributes: {}, events: {},
        append(...children) { this.children.push(...children); },
        setAttribute(key, value) { this.attributes[key] = value; },
        addEventListener(type, handler) { this.events[type] = handler; },
      };
      elements.push(element); return element;
    } };
    const createField = runInNewContext(`${functionSource("createOtherLimitBonusField")}\ncreateOtherLimitBonusField`, {
      document, numberFormat: new Intl.NumberFormat("ja-JP"),
      readDeckConfig: () => structuredClone(config), writeDeckConfig: value => { config = value; },
      persistCurrentState() {}, renderJobEditor() {}, $: () => ({ querySelector: () => null }),
      calculate() { calculationCount++; latestCharge = calculateWeaponChargeDamage({ ...request, deckConfig: config }); },
    });
    createField(config, definition);
    const select = elements.find(element => element.tag === "select");
    assert.equal(select.attributes["aria-label"], `${definition.label}（計算接続済み）`);
    const base = calculateWeaponChargeDamage(request);
    const normal = calculateNormalAttackFromRequest(request).result.bodyDamageDistribution;
    for (let level = 1; level <= 3; level++) {
      select.value = String(level); select.events.change();
      assert.equal(calculationCount, level);
      assert.equal(config.protagonist.otherLimitBonusLevels[id], level);
      assert.equal(latestCharge.trace.damageContributions.limitBonus, definition.values[level]);
      assert.ok(latestCharge.perHit.mean > base.perHit.mean);
      assert.deepEqual(calculateNormalAttackFromRequest({ ...request, deckConfig: config }).result.bodyDamageDistribution, normal);
    }
    select.value = "0"; select.events.change();
    assert.equal(calculationCount, 4);
    assert.equal(config.protagonist.otherLimitBonusLevels, undefined);
    assert.equal(latestCharge.perHit.mean, base.perHit.mean);
  }
  for (const id of ["37", "74", "85", "105"]) assert.equal(definitions.find(entry => entry.id === id).connected, false);
});

test("Web sends only non-LB corrections in additional mode; API equals the former composed total", () => {
  assert.match(app, /\$\("enemy-element"\)\.addEventListener\("change", \(\) => void calculate\(\)\)/u);
  const request = chargeRequest();
  request.deckConfig.protagonist.otherLimitBonusLevels = { "2": 3, "29": 3, "20": 3, "80": 2, "117": 1 };
  const elements = {
    "enemy-element": { value: "6" }, "enemy-name": { value: "test" }, "enemy-preset": { value: "custom" },
  };
  const numberValues = { "player-rank": 425, "protagonist-hp-percent": 100, "enemy-defense": 10, "random-min": .95, "random-max": 1.05, "random-step": .001 };
  const buildRequest = runInNewContext(`${functionSource("buildRequest")}\nbuildRequest`, {
    readDeckConfig: () => structuredClone(request.deckConfig), numberValue: id => numberValues[id],
    rebaseProtagonistForRankChange() {}, applyEquipmentRules() {}, catalogJob() {}, normalizeJobGrowthLevels() {},
    calculateJobGrowthBonuses: () => ({ totals: { defensePercent: 20, attack: 0, hp: 0 } }),
    readMemorialItemSettings() {}, readCrewSupportSettings() {}, readCompletedJobIds: () => [],
    renderJobCompletionSummary: () => ({ selectedJobIds: [], totals: { defense: 30 } }),
    rebaseProtagonistForCompletionBonusChange() {}, mainWeaponCompletionAttackContribution: () => 0, writeDeckConfig() {},
    calculateMemorialItemModifiers: () => ({ defensePercent: 13, incomingElementalDamageReductionPercents: [10] }),
    calculateCrewSupportEffects: () => ({}), PROTAGONIST_OTHER_LIMIT_BONUS_DEFINITIONS: definitions,
    selectedSupportSummon: undefined, $: id => elements[id],
  });
  const webRequest = buildRequest();
  assert.equal(webRequest.modifiers.incomingDamageModifierMode, "additional");
  assert.equal(webRequest.modifiers.protagonistDefensePercent, 63);
  assert.deepEqual(Array.from(webRequest.modifiers.incomingElementalDamageReductionPercents), [10]);
  const result = calculateNormalAttackFromRequest(webRequest).result.incomingDamage;
  const legacy = calculateNormalAttackFromRequest({ ...webRequest, modifiers: {
    protagonistDefensePercent: 73, incomingElementalDamageReductionPercents: [5, 3, 1, 10],
  } }).result.incomingDamage;
  assert.deepEqual(result, legacy);
  elements["enemy-element"].value = "1";
  assert.deepEqual(calculateNormalAttackFromRequest(buildRequest()).result.incomingDamage.elementalDamageReductionPercents, [10]);
});
