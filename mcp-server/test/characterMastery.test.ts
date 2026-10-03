import { test } from "node:test";
import assert from "node:assert/strict";
import { masteryStaminaPercent, normalStaminaLimitBonusPercent } from "../src/calculator/characterMastery.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";

test("mastery stamina ratings use the published plateau and slope, rather than the displayed number as percent", () => {
  assert.equal(masteryStaminaPercent(2, 100), 4);
  assert.equal(masteryStaminaPercent(2, 50), 4);
  assert.equal(masteryStaminaPercent(2, 25), 3);
  assert.equal(masteryStaminaPercent(2, 0), 2);
  assert.equal(masteryStaminaPercent(10, 100), 12);
  assert.equal(masteryStaminaPercent(10, 50), 8);
  assert.equal(masteryStaminaPercent(10, 0), 4);
  assert.throws(() => masteryStaminaPercent(13, 100));
});

test("ordinary medium stamina LB has a plateau above five sixths HP", () => {
  assert.equal(normalStaminaLimitBonusPercent(2, 100), 4);
  assert.equal(normalStaminaLimitBonusPercent(2, 90), 4);
  assert.equal(normalStaminaLimitBonusPercent(2, 75), 3.75);
  assert.equal(normalStaminaLimitBonusPercent(2, 50), 3);
  assert.equal(normalStaminaLimitBonusPercent(2, 0), 1.5);
  assert.throws(() => normalStaminaLimitBonusPercent(2, -1));
  assert.throws(() => normalStaminaLimitBonusPercent(0, Number.NaN));
});

test("ring, earring and ordinary stamina are additive in one frame, without doubling displayed ATK or affecting MC", () => {
  const request = { schemaVersion: 1, deckConfig: {
    schemaVersion: 1, format: "gbf-helper-calculator-deck", protagonist: { attackOverride: 1_000, elementCode: "6" },
    weapons: [], summons: [], characters: [{ slot: 1, position: "front", characterId: "3040611000", elementCode: "6",
      attackOverride: 1_000, limitBonuses: { staminaLevel: 3 }, mastery: {
        ring: [{ bonusId: "10001", name: "攻撃力", value: 600, unit: "flat" },
          { bonusId: "20010", name: "渾身", value: 2, unit: "rating" }],
        earring: [{ bonusId: "160002", name: "渾身", value: 5, unit: "rating" }],
      } }],
  }, attacker: { characterSlot: 1 }, enemy: { elementCode: "5", defense: 10 } };
  const result = calculateNormalAttackFromRequest(request).result;
  assert.equal(result.attackPower.baseAttack, 1_000);
  assert.equal(result.baseDamage.stages.find(stage => stage.stage === "character-stamina")?.totalPercent, 17);
  assert.equal(result.baseDamage.articleTrace?.prePostCapDamage, 175.5);
  assert.equal(result.characterMastery?.staminaPercent, 11);
  assert.ok(!result.attacker?.unresolvedInputs.includes("overMastery-aetherialMastery-effects"));
  assert.equal(calculateNormalAttackFromRequest({ ...request, attacker: undefined }).result.bodyDamageDistribution.minimumDamage, 143);
  const changed = structuredClone(request);
  changed.deckConfig.characters[0].mastery.earring[0].name = "未対応効果";
  assert.ok(calculateNormalAttackFromRequest(changed).result.attacker?.unresolvedInputs.includes("mastery-bonus-earring:160002"));
});
