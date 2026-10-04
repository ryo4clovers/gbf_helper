import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateBattleHp, calculateBattleStartHp } from "../src/calculator/battleHpCalculator.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { calculateCombatHp } from "../src/calculator/protagonistHpCalculator.ts";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";
import { createInitialBattleState, applyItem, applyGeneratedTurn } from "../web/battle-state.js";
import { buildBattleTurnRequest } from "../web/battle-turn-client.js";
import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "../src/calculator/types.ts";

const effect = (kind: EffectiveWeaponSkillEffect["kind"], amount = 20, elementCode = "6"): EffectiveWeaponSkillEffect => ({
  kind, elementCode, baseAmountPercent: amount, effectiveAmountPercent: amount,
  sourceWeaponId: "synthetic", sourceWeaponSlot: 1, sourceSkillId: "synthetic", sourceSkillName: "合成",
  verificationStatus: "下書き", appliedModifiers: [],
});
function request(): any {
  return { schemaVersion: 1, enemy: { elementCode: "5", defense: 10 }, deckConfig: {
    schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "6", attackOverride: 10000, hpOverride: 5007 },
    characters: [{ slot: 1, position: "front", characterId: "3040456000", elementCode: "6", level: 80, hpOverride: 4003, attackOverride: 10000 }],
    weapons: [{ slot: 1, position: "main", weaponId: "1040422300", level: 150, skillLevel: 15 }], summons: [],
  } };
}

test("Tyranny rounds remaining maximum HP up even without HP-up skills; summon-only rounding stays unchanged", () => {
  assert.equal(calculateCombatHp({ baseHp: 5007, elementCode: "6", effects: [effect("weapon-hp-down", 10)] })!.hp, 4507);
  assert.equal(calculateCombatHp({ baseHp: 5007, elementCode: "6", effects: [effect("weapon-hp-down", 10, "1")] })!.hp, 5007);
  assert.equal(calculateCombatHp({ baseHp: 5007, otherHpPercent: -10 })!.hp, 4506);
  const input = request(); input.deckConfig.weapons[0].weaponId = "1040106400";
  const result = calculateNormalAttackFromRequest(input).battleHp;
  assert.equal(result.protagonist!.hp, 4507);
  assert.equal(result.characters[0].result!.hp, 3603);
  assert.equal(result.protagonistStart!.hp, result.protagonist!.hp);
});

test("Bloodshed removes floored max-HP damage, combines to a provisional 40% cap and respects elements and backline", () => {
  for (const [count, damage] of [[0, 0], [1, 1001], [2, 2002], [3, 2002]]) {
    const result = calculateBattleStartHp(5007, "6", Array.from({ length: count }, () => effect("battle-start-hp-damage")))!;
    assert.equal(result.damage, damage);
    assert.equal(result.hp, 5007 - damage);
    assert.equal(result.maxHp, 5007);
  }
  assert.equal(calculateBattleStartHp(1, "6", [effect("battle-start-hp-damage")])!.hp, 1);
  assert.equal(calculateBattleStartHp(undefined, "6"), undefined);
  const deck: DeckSnapshot = { schemaVersion: 1, protagonist: { hp: 5007, elementCode: "6" }, weapons: [], summons: [],
    characters: [{ slot: 4, position: "back", masterId: "synthetic", hp: 4003, elementCode: "6" },
      { slot: 5, position: "back", masterId: "synthetic2", hp: 4003, elementCode: "1" }],
    effectiveWeaponSkillEffects: [effect("battle-start-hp-damage")] };
  const result = calculateBattleHp(deck);
  assert.equal(result.characters[0].start!.hp, 3203);
  assert.equal(result.characters[1].start!.hp, 4003);
});

test("Bloodshed stays independent of SLv and summon boosts and follows resolved Tyranny maximum HP", () => {
  for (const skillLevel of [1, 15]) {
    const input = request(); input.deckConfig.weapons[0].skillLevel = skillLevel;
    input.deckConfig.summons = [{ slot: 1, position: "main", summonId: "2040046000", level: 250, uncapLevel: 6 }];
    input.supportSummon = { summonId: "2040046000" };
    input.deckConfig.weapons.push({ slot: 2, position: "grid", weaponId: "1040106400", level: 150, skillLevel });
    const original = structuredClone(input), result = calculateNormalAttackFromRequest(input).battleHp;
    assert.deepEqual(input, original);
    assert.equal(result.protagonist!.hp, 4507);
    assert.equal(result.protagonistStart!.hp, 3606);
    assert.equal(result.protagonistStart!.appliedEffects[0].appliedModifiers.length, 0);
    assert.equal(result.characters[0].start!.hp, 2883);
  }
});

test("battle initialization uses reduced current HP once, keeps healing capacity and sends current ratios to attacks", () => {
  const input = request(), hp = calculateNormalAttackFromRequest(input).battleHp;
  const setup = { request: input, protagonistMaxHp: hp.protagonist!.hp, protagonistInitialHp: hp.protagonistStart!.hp,
    characterMaxHp: { 1: hp.characters[0].result!.hp }, characterInitialHp: { 1: hp.characters[0].start!.hp }, enemyMaxHp: 1e9 };
  const state = createInitialBattleState(setup), original = structuredClone(state);
  assert.deepEqual(state.party.map(p => [p.hp, p.maxHp]), [[4006, 5007], [3203, 4003]]);
  const turn = buildBattleTurnRequest(setup, state, "downside", { secondsPerTurn: 15, characters: { 1: { currentHpPercent: 100 } } });
  assert.equal(turn.calculation.protagonistCurrentHpPercent, 4006 / 5007 * 100);
  assert.equal(turn.characters[0].currentHpPercent, 3203 / 4003 * 100);
  const healed = applyItem(state, { name: "合成回復", scope: "all", healPercent: 100 });
  assert.deepEqual(healed.party.map(p => p.hp), [5007, 4003]);
  const generated = calculateBattleTurn(buildBattleTurnRequest(setup, healed, "downside", { secondsPerTurn: 15, characters: {} }));
  const next = applyGeneratedTurn(healed, generated, []);
  assert.deepEqual(next.party.map(p => p.hp), [5007, 4003]);
  assert.deepEqual(state, original);
  assert.deepEqual(createInitialBattleState(setup), original);
});
