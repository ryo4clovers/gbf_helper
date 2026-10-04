import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateCharacterDisplayedStats, characterAwakeningBonuses } from "../src/calculator/characterDisplayedStats.ts";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import type { CalculatorDeckCharacterConfig } from "../src/calculator/types.ts";

const character = (): CalculatorDeckCharacterConfig => ({ slot: 1, position: "front", characterId: "dark-ssr-ilsa-yukata", level: 80,
  displayedStatMode: "auto", plusMark: 10, awakening: { level: 10, formCode: "4" },
  limitBonuses: { attackFlatBonus: 500, hpFlatBonus: 250 },
  mastery: { earring: [], ring: [{ bonusId: "10001", name: "攻撃力", value: 600, unit: "flat" }, { bonusId: "10002", name: "HP", value: 150, unit: "flat" }] } });

test("automatic stats compose base, strengthening and equipment without reusing cached totals", () => {
  const c = { ...character(), attackOverride: 1, hpOverride: 1 };
  const weapons = [{ weaponKindCode: "6", stats: { attack: 1003, hp: 23 } }];
  const actual = calculateCharacterDisplayedStats(c, weapons, [{ attack: 300, hp: 50 }]);
  assert.equal(actual.attack, 11200 + 30 + 3000 + 500 + 600 + 1003 + 201 + 300);
  assert.equal(actual.hp, 1266 + 10 + 250 + 150 + 23 + 5 + 50);
  assert.deepEqual(actual.issues, []);
  assert.equal(c.attackOverride, 1, "input is immutable");
  weapons[0].stats.attack += 5;
  assert.equal(calculateCharacterDisplayedStats(c, weapons, [{ attack: 300, hp: 50 }]).attack, actual.attack! + 6);
  assert.equal(calculateCharacterDisplayedStats({ ...c, displayedStatMode: "manual" }, weapons, []).attack, 1);
});

test("unknown levels, styles and unresolved equipment do not return stale cached values", () => {
  for (const c of [{ ...character(), level: 79 }, { ...character(), characterId: "unknown-style" }]) {
    const actual = calculateCharacterDisplayedStats({ ...c, attackOverride: 999 }, [], []);
    assert.equal(actual.attack, undefined); assert.ok(actual.issues.length);
  }
  assert.equal(calculateCharacterDisplayedStats(character(), [{}], []).attack, undefined);
  assert.equal(calculateCharacterDisplayedStats(character(), [], [undefined]).hp, undefined);
});

test("awakening types use their own flat and charge bonuses", () => {
  assert.deepEqual(characterAwakeningBonuses(10, "1"), { attack: 4000, hp: 2000, chargeDamagePercent: 20, chargeCapPercent: 0 });
  assert.deepEqual(characterAwakeningBonuses(10, "2"), { attack: 8000, hp: 0, chargeDamagePercent: 25, chargeCapPercent: 15 });
  assert.deepEqual(characterAwakeningBonuses(10, "3"), { attack: 1000, hp: 4000, chargeDamagePercent: 0, chargeCapPercent: 0 });
  assert.deepEqual(characterAwakeningBonuses(10, "4"), { attack: 3000, hp: 0, chargeDamagePercent: 5, chargeCapPercent: 0 });
  assert.deepEqual(characterAwakeningBonuses(), { attack: 0, hp: 0, chargeDamagePercent: 0, chargeCapPercent: 0 });
});

test("resolver excludes support and sub summons from character display stats", () => {
  const result = resolveCalculatorDeckConfig({ schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "6", attackOverride: 1000, hpOverride: 1000 }, characters: [character()], weapons: [],
    summons: [
      { slot: 1, position: "main", summonId: "unknown-main", attackOverride: 100, hpOverride: 20 },
      { slot: 2, position: "grid", summonId: "unknown-grid", attackOverride: 200, hpOverride: 40 },
      { slot: 3, position: "sub", summonId: "unknown-sub", attackOverride: 5000, hpOverride: 5000 },
    ] });
  const expected = calculateCharacterDisplayedStats(character(), [], [{ attack: 300, hp: 60 }]);
  assert.equal(result.deck.characters[0].attack, expected.attack);
  assert.equal(result.deck.characters[0].hp, expected.hp);
});
