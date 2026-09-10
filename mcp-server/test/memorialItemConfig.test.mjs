import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMemorialItemModifiers,
  defaultMemorialItemSettings,
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
});

test("disabling an item removes only that item's effect", () => {
  const settings = defaultMemorialItemSettings();
  settings.items["1001"].enabled = false;
  settings.items["9015"].enabled = false;
  const result = calculateMemorialItemModifiers(settings, "1", "4");

  assert.equal(result.elementAttackPercent, 0);
  assert.equal(result.targetElementDamagePercent, 0);
  assert.equal(result.damageDealtPercent, 0);
  assert.equal(result.allElementAttackPercent, 3);
});
