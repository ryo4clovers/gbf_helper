import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMemorialItemModifiers,
  defaultMemorialItemSettings,
  describeMemorialItemEffect,
  MEMORIAL_ITEM_DEFINITIONS,
} from "../web/memorial-item-config.js";

test("applies the matching Four Saints item and fixed account items", () => {
  const settings = defaultMemorialItemSettings();
  const result = calculateMemorialItemModifiers(settings, "1", "4");

  assert.equal(result.elementAttackPercent, 10);
  assert.equal(result.targetElementDamagePercent, 5);
  assert.equal(result.normalAttackDamageCapPercent, 5);
  assert.equal(result.allElementAttackPercent, 3);
  assert.equal(result.damageCapPercent, 3);
  assert.equal(result.damageDealtPercent, 3.6);
  assert.equal(result.chainBurstPerformancePercent, 5);
  assert.equal(result.abilityDamagePercent, 5);
  assert.equal(result.abilityDamageCapPercent, 5);
  assert.equal(result.defensePercent, 22);
  assert.deepEqual(result.incomingElementalDamageReductionPercents, [5, 5]);
});

test("uses the requested game-like groups and Other ordering", () => {
  const father = MEMORIAL_ITEM_DEFINITIONS.find((item) => item.id === "29");
  assert.equal(father.group, "メインクエスト");
  assert.deepEqual(
    MEMORIAL_ITEM_DEFINITIONS.filter((item) => item.group === "その他").map((item) => item.id),
    ["9003", "9013", "9014", "9015", "9016", "9017"],
  );
  const fireCrest = MEMORIAL_ITEM_DEFINITIONS.find((item) => item.id === "9009");
  assert.match(describeMemorialItemEffect(fireCrest, { enabled: true, level: 20 }), /DA率\+6%/u);
  assert.match(describeMemorialItemEffect(fireCrest, { enabled: true, level: 20 }), /TA率\+7%/u);
});

test("uses crest level thresholds and supports local-result exclusion", () => {
  const settings = defaultMemorialItemSettings();
  let result = calculateMemorialItemModifiers(settings, "1", "4");
  assert.equal(result.extinctionCrestDoubleAttackRatePercent, 6);
  assert.equal(result.extinctionCrestTripleAttackRatePercent, 7);

  settings.items["9009"].level = 15;
  result = calculateMemorialItemModifiers(settings, "1", "4");
  assert.equal(result.extinctionCrestDoubleAttackRatePercent, 6);
  assert.equal(result.extinctionCrestTripleAttackRatePercent, 5);

  settings.includeExtinctionCrestInLocalResults = false;
  result = calculateMemorialItemModifiers(settings, "1", "4");
  assert.equal(result.extinctionCrestDoubleAttackRatePercent, 0);
  assert.equal(result.extinctionCrestTripleAttackRatePercent, 0);
  assert.equal(result.defensePercent, 10);
  assert.deepEqual(result.incomingElementalDamageReductionPercents, []);
});

test("disabling an item removes only that item's effect", () => {
  const settings = defaultMemorialItemSettings();
  settings.items["1001"].enabled = false;
  settings.items["9015"].enabled = false;
  const result = calculateMemorialItemModifiers(settings, "1", "4");

  assert.equal(result.elementAttackPercent, 0);
  assert.equal(result.targetElementDamagePercent, 0);
  assert.equal(result.abilityDamagePercent, 0);
  assert.equal(result.abilityDamageCapPercent, 0);
  assert.equal(result.damageDealtPercent, 0);
  assert.equal(result.allElementAttackPercent, 3);
});
