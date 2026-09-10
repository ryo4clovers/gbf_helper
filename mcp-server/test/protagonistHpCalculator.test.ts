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
    summonAuraPercent: 0,
    hp: 4630,
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
