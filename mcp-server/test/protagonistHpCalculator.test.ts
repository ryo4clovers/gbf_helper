import assert from "node:assert/strict";
import test from "node:test";
import { calculateProtagonistHp } from "../src/calculator/protagonistHpCalculator.ts";
import type { DeckSnapshot } from "../src/calculator/types.ts";

function deck(amountPercent?: number): DeckSnapshot {
  return {
    schemaVersion: 1,
    protagonist: { elementCode: "1", hp: 4630 },
    weapons: [],
    summons: [],
    characters: [],
    effectiveCharacterHpAuras: amountPercent === undefined ? [] : [{
      kind: "character-hp-up",
      elementCode: "1",
      amountPercent,
      stackingGroup: "fire-character-hp",
      sourceSummonSlot: 1,
      sourcePosition: "sub",
      sourceSummonId: "test",
      sourceSummonName: "テスト召喚石",
      sourceAuraName: "テスト加護",
      verificationStatus: "検証済み",
    }],
  };
}

test("reproduces the observed 20% and 30% summon-aura HP displays", () => {
  assert.equal(calculateProtagonistHp(deck(20))?.hp, 5556);
  assert.equal(calculateProtagonistHp(deck(30))?.hp, 6019);
});

test("retains base HP when no character HP aura applies", () => {
  assert.deepEqual(calculateProtagonistHp(deck()), {
    schemaVersion: 1,
    status: "provisional",
    baseHp: 4630,
    weaponSkillHpPercent: 0,
    summonAuraPercent: 0,
    hp: 4630,
    appliedWeaponSkillEffects: [],
    appliedAuras: [],
    issues: [],
  });
});

test("marks fractional HP rounding as unresolved", () => {
  const input = deck(20);
  input.protagonist.hp = 4631;
  const result = calculateProtagonistHp(input);

  assert.equal(result?.hp, 5557);
  assert.deepEqual(result?.issues, ["fractional-rounding-unresolved"]);
});

test("applies boosted normal HP weapon skills before character HP summon auras", () => {
  const input = deck(20);
  input.protagonist.hp = 1000;
  input.effectiveWeaponSkillEffects = [{
    sourceWeaponSlot: 2,
    sourceWeaponId: "godmight",
    sourceSkillId: "375",
    sourceSkillName: "火の神威",
    kind: "normal-hp-up",
    elementCode: "1",
    baseAmountPercent: 12.5,
    effectiveAmountPercent: 33.75,
    skillLevel: 20,
    verificationStatus: "下書き",
    appliedModifiers: [],
  }];

  const result = calculateProtagonistHp(input);

  assert.equal(result?.weaponSkillHpPercent, 33.75);
  assert.equal(result?.summonAuraPercent, 20);
  assert.equal(result?.hp, 1605);
  assert.equal(result?.appliedWeaponSkillEffects.length, 1);
  assert.deepEqual(result?.issues, ["weapon-skill-hp-baseline-unresolved"]);
});

test("rounds the observed Froga HP result to the nearest integer", () => {
  const input = deck();
  input.protagonist.hp = 4434;
  input.effectiveWeaponSkillEffects = [{
    sourceWeaponSlot: 2,
    sourceWeaponId: "1040024600",
    sourceSkillId: "19",
    sourceSkillName: "業火の守護",
    kind: "normal-hp-up",
    elementCode: "1",
    baseAmountPercent: 17,
    effectiveAmountPercent: 74.8,
    skillLevel: 15,
    verificationStatus: "下書き",
    appliedModifiers: [],
  }];

  assert.equal(calculateProtagonistHp(input)?.hp, 7751);
});
