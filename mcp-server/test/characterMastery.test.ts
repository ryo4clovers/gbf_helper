import { test } from "node:test";
import assert from "node:assert/strict";
import { masteryStaminaPercent, normalStaminaLimitBonusPercent, resolveCharacterMastery } from "../src/calculator/characterMastery.ts";
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

test("earring supplemental damage uses 1% of enemy max HP with a flat cap and preserves missing-HP uncertainty", () => {
  const character = { slot: 1, position: "front" as const, masterId: "3040611000", instanceId: "synthetic",
    mastery: { ring: [], earring: [{ bonusId: "160008", name: "与ダメージ上昇", value: 12_000, unit: "flat" as const }] } };
  assert.equal(resolveCharacterMastery(character, 100, 12_345).supplementalDamage, 124);
  assert.equal(resolveCharacterMastery(character, 100, 2_000_000).supplementalDamage, 12_000);
  assert.equal(resolveCharacterMastery(character).enemyHpCapUnresolved, true);
  assert.equal(resolveCharacterMastery(undefined).enemyHpCapUnresolved, false);
  assert.throws(() => resolveCharacterMastery(character, 100, Number.NaN));
});

test("earring damage reaches each split and pursuit hit alongside Support B, artifacts and the provisional normal-only buff", () => {
  const input = { schemaVersion: 1, deckConfig: {
    schemaVersion: 1, format: "gbf-helper-calculator-deck", protagonist: { attackOverride: 10_000, elementCode: "6" },
    weapons: [
      { slot: 1, position: "main", weaponId: "1040315100", level: 250, skillLevel: 1 },
      { slot: 2, position: "grid", weaponId: "1040916700", level: 150, skillLevel: 15 },
      { slot: 3, position: "grid", weaponId: "1040817900", level: 200, skillLevel: 1 },
    ], summons: [], characters: [{ slot: 1, position: "front", characterId: "3040456000", elementCode: "6", attackOverride: 10_000,
      mastery: { ring: [{ bonusId: "30003", name: "防御", value: 8, unit: "percent" }],
        earring: [{ bonusId: "160008", name: "与ダメージ上昇", value: 12_000, unit: "flat" }] },
      artifact: { skills: [{ skillId: "30161", name: "通常攻撃の与ダメージ上昇", effectValue: "+8800" },
        { skillId: "30081", name: "弱体耐性", effectValue: "+5%" }] },
    }],
  }, attacker: { characterSlot: 1 }, enemy: { elementCode: "5", defense: 10, maxHp: 2_000_000 },
    battleEffects: { supportSkillSupplementalDamage: 3_000 }, random: { minimum: 1, maximum: 1, step: 1 } };
  const before = structuredClone(input);
  before.deckConfig.characters[0].mastery.earring = [];
  const baseline = calculateNormalAttackFromRequest(before).result;
  const result = calculateNormalAttackFromRequest(input).result;
  assert.equal(result.bodyDamageDistribution.minimumDamage - baseline.bodyDamageDistribution.minimumDamage, 12_000);
  assert.equal(result.pursuitDamage!.damageDistribution.minimumDamage - baseline.pursuitDamage!.damageDistribution.minimumDamage, 12_000);
  assert.equal(result.destructionPursuitDamage!.damageDistribution.minimumDamage - baseline.destructionPursuitDamage!.damageDistribution.minimumDamage, 12_000);
  assert.deepEqual(result.attacker?.unresolvedInputs.filter(id => /mastery-bonus|artifact-skill/.test(id)), []);
  for (const buff of [5_000, 15_000]) {
    const withBuff = calculateNormalAttackFromRequest({ ...input, battleEffects: { ...input.battleEffects, normalAttackSupplementalDamage: buff } }).result;
    assert.equal(withBuff.bodyDamageAttenuation.supplementalDamagePerHit - baseline.bodyDamageAttenuation.supplementalDamagePerHit, 12_000 + buff);
  }
  const unknownHp = calculateNormalAttackFromRequest({ ...input, enemy: { ...input.enemy, maxHp: undefined } }).result;
  assert.ok(unknownHp.issues.includes("supplemental-damage-enemy-hp-cap-unresolved"));
  assert.equal(calculateNormalAttackFromRequest({ ...input, attacker: undefined }).result.bodyDamageDistribution.minimumDamage,
    calculateNormalAttackFromRequest({ ...before, attacker: undefined }).result.bodyDamageDistribution.minimumDamage);
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
