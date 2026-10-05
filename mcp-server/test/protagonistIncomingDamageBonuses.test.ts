import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.js";
import { resolveProtagonistIncomingDamageBonuses } from "../src/calculator/protagonistIncomingDamageBonuses.js";

function request(levels?: Record<string, number>, modifiers?: Record<string, unknown>, elementCode = "1") {
  return {
    schemaVersion: 1,
    deckConfig: {
      schemaVersion: 1, format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "6", attackOverride: 10000, hpOverride: 1000, otherLimitBonusLevels: levels },
      weapons: [], summons: [], characters: [],
    },
    enemy: { elementCode, defense: 10 }, modifiers,
  };
}

test("API-only resolves every defense LB and all six elemental LB tiers at each star", () => {
  for (let level = 0; level <= 3; level++) {
    const percent = [0, 1, 3, 5][level];
    for (const id of [2, 29, 81, 98]) {
      const result = calculateNormalAttackFromRequest(request({ [id]: level })).result.incomingDamage!;
      assert.equal(result.baseDefensePercent, percent);
      assert.equal(result.nominalDamage, Math.ceil(10000 / (1 + percent / 100)));
    }
    for (let element = 1; element <= 6; element++) {
      for (const start of [15, 75, 112]) {
        const levels = { [start + element - 1]: level };
        const result = calculateNormalAttackFromRequest(request(levels, undefined, String(element))).result.incomingDamage!;
        assert.deepEqual(result.elementalDamageReductionPercents, percent > 0 ? [percent] : []);
        assert.equal(result.nominalDamage, Math.ceil(10000 * (1 - percent / 100)));
        const otherElement = String(element % 6 + 1);
        assert.deepEqual(calculateNormalAttackFromRequest(request(levels, undefined, otherElement)).result.incomingDamage!.elementalDamageReductionPercents, []);
      }
    }
  }
});

test("API sums defense, multiplies independent reductions, preserves saved levels and default inputs", () => {
  const input = request({ "2": 3, "29": 2, "81": 1, "98": 3, "15": 3, "75": 2, "112": 1, "37": 3 });
  const original = structuredClone(input);
  const result = calculateNormalAttackFromRequest(input).result.incomingDamage!;
  assert.equal(result.baseDefensePercent, 14);
  assert.deepEqual(result.elementalDamageReductionPercents, [5, 3, 1]);
  const raw = 10000 / 1.14 * .95 * .97 * .99;
  assert.equal(result.nominalDamage, Math.ceil(raw));
  assert.equal(result.minimumDamage, Math.ceil(raw * .95));
  assert.equal(result.maximumDamage, Math.ceil(raw * 1.05));
  assert.deepEqual(input, original);
  const empty = calculateNormalAttackFromRequest(request()).result.incomingDamage!;
  assert.equal(empty.baseDefensePercent, 0);
  assert.deepEqual(empty.elementalDamageReductionPercents, []);
});

test("legacy totals replace LB independently, including explicit zero and empty array", () => {
  const levels = { "2": 3, "15": 3 };
  for (const mode of [undefined, "total"]) {
    const total = calculateNormalAttackFromRequest(request(levels, {
      incomingDamageModifierMode: mode, protagonistDefensePercent: 73,
      incomingElementalDamageReductionPercents: [5, 10],
    })).result.incomingDamage!;
    assert.equal(total.baseDefensePercent, 73);
    assert.deepEqual(total.elementalDamageReductionPercents, [5, 10]);
    const zero = calculateNormalAttackFromRequest(request(levels, {
      incomingDamageModifierMode: mode, protagonistDefensePercent: 0,
      incomingElementalDamageReductionPercents: [],
    })).result.incomingDamage!;
    assert.equal(zero.baseDefensePercent, 0);
    assert.deepEqual(zero.elementalDamageReductionPercents, []);
  }
  const partial = calculateNormalAttackFromRequest(request(levels, { protagonistDefensePercent: 10 })).result.incomingDamage!;
  assert.equal(partial.baseDefensePercent, 10);
  assert.deepEqual(partial.elementalDamageReductionPercents, [5]);
});

test("additional inputs compose LB with manual corrections once, equivalent to legacy Web totals", () => {
  const levels = { "2": 3, "29": 3, "15": 3, "75": 3, "112": 3 };
  const additional = request(levels, {
    incomingDamageModifierMode: "additional", protagonistDefensePercent: 63,
    incomingElementalDamageReductionPercents: [10],
  });
  const legacy = request(levels, { protagonistDefensePercent: 73, incomingElementalDamageReductionPercents: [5, 5, 5, 10] });
  assert.deepEqual(calculateNormalAttackFromRequest(additional).result.incomingDamage,
    calculateNormalAttackFromRequest(legacy).result.incomingDamage);
  additional.enemy.elementCode = "2";
  const switched = calculateNormalAttackFromRequest(additional).result.incomingDamage!;
  assert.equal(switched.baseDefensePercent, 73);
  assert.deepEqual(switched.elementalDamageReductionPercents, [10]);
  assert.deepEqual(resolveProtagonistIncomingDamageBonuses({}, "1", { incomingDamageModifierMode: "additional" }),
    { defensePercent: 0, elementalDamageReductionPercents: [] });
  assert.throws(() => calculateNormalAttackFromRequest(request(levels, { incomingDamageModifierMode: "guess" })));
});
