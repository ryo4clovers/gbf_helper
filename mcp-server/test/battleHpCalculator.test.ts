import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateBattleHp } from "../src/calculator/battleHpCalculator.ts";
import { calculateCombatHp } from "../src/calculator/protagonistHpCalculator.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "../src/calculator/types.ts";

const hpEffect = (amount: number, elementCode = "6"): EffectiveWeaponSkillEffect => ({
  kind: "normal-hp-up", elementCode, baseAmountPercent: amount, effectiveAmountPercent: amount,
  sourceWeaponId: "synthetic", sourceWeaponSlot: 1, sourceSkillId: "hp", sourceSkillName: "HP",
  verificationStatus: "下書き", appliedModifiers: [],
});

test("combat HP adds ring and stamp book only to their character and preserves base stats", () => {
  const deck: DeckSnapshot = { schemaVersion: 1, protagonist: { hp: 2000, elementCode: "6" }, weapons: [], summons: [],
    characters: [
      { slot: 1, position: "front", masterId: "3040512000", elementCode: "6", hp: 1000, perpetuityRing: true },
      { slot: 3, position: "front", masterId: "3040456000", elementCode: "6", hp: 1501 },
      { slot: 4, position: "back", masterId: "unknown", elementCode: "1", hp: 3000 },
      { slot: 5, position: "back", masterId: "missing", elementCode: "6" },
    ], effectiveWeaponSkillEffects: [hpEffect(123.6), hpEffect(40, "1")] };
  const before = structuredClone(deck), result = calculateBattleHp(deck, undefined, true);
  assert.equal(result.protagonist?.hp, 4472);
  assert.equal(result.characters[0].result?.hp, 2436);
  assert.equal(result.characters[1].result?.hp, 3357);
  assert.equal(result.characters[2].result?.hp, 4200);
  assert.equal(result.characters[3].result, undefined);
  assert.equal(calculateBattleHp(deck).characters[0].result?.hp, 2336);
  assert.deepEqual(deck, before);
});

test("grid HP cap and overskill do not cap summon or character bonuses", () => {
  for (const [grid, hp] of [[400, 5000], [419.9, 5000], [420, 5040], [600, 5400], [900, 5800]]) {
    assert.equal(calculateCombatHp({ baseHp: 1000, elementCode: "6", effects: [hpEffect(grid)] })?.hp, hp);
  }
  assert.equal(calculateCombatHp({ baseHp: 1000, effects: [hpEffect(600)], elementCode: "6", otherHpPercent: 10 })?.hp, 5500);
  assert.equal(calculateCombatHp({ baseHp: 1000, otherHpPercent: -200 })?.hp, 1);
});

test("API separates display HP from combat HP and does not re-add flat enhancements", () => {
  const request = { schemaVersion: 1, deckConfig: { schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "6", attackOverride: 1000, hpOverride: 1000, partyHpLimitBonusLevel: 3 },
    weapons: [], summons: [], characters: [
      { slot: 1, position: "front", characterId: "dark-ssr-ilsa-yukata", level: 80, elementCode: "6",
        displayedStatMode: "auto", awakening: { formCode: "3", level: 10 }, perpetuityRing: true },
      { slot: 2, position: "front", characterId: "3040512000", elementCode: "6", hpOverride: 1000,
        attackOverride: 1000, mastery: { ring: [{ bonusId: "10001", name: "HP", value: 300, unit: "flat" }], earring: [] } },
    ] }, enemy: { elementCode: "5", defense: 10 }, modifiers: { divineStampBookEnabled: true } };
  const result = calculateNormalAttackFromRequest(request);
  assert.equal(result.characterStats[0].hp, 1266 + 4000 + 1000);
  assert.equal(result.battleHp.characters[0].result?.hp, 6892);
  assert.equal(result.battleHp.characters[1].result?.hp, 1100);
  assert.equal(result.battleHp.protagonist?.hp, 1000, "manual MC display already contains LB");
  assert.deepEqual(result.battleHp.protagonist, result.result.protagonistHp);
});
