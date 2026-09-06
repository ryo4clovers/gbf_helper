import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import { calculateEffectivePursuitDamage } from "../src/calculator/pursuitDamageCalculator.ts";
import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "../src/calculator/types.ts";

function makeDeck(effects: EffectiveWeaponSkillEffect[]): DeckSnapshot {
  return {
    schemaVersion: 1,
    protagonist: { elementCode: "1" },
    characters: [],
    weapons: [],
    summons: [],
    effectiveWeaponSkillEffects: effects,
  };
}

test("connects the resolved 5.85% pursuit to the default 101 damage patterns", () => {
  const resolution = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 16255, hpOverride: 3504 },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1040218900",
        skillLevel: 15,
        attackOverride: 3609,
        hpOverride: 430,
      },
    ],
  });

  const result = calculateEffectivePursuitDamage(resolution.deck, 2741);

  assert.equal(result.status, "provisional");
  assert.equal(result.pursuitEffect.sourceSkillId, "2174");
  assert.equal(result.pursuitEffect.baseAmountPercent, 4.5);
  assert.equal(result.effectivePursuitPercentage, 5.85);
  assert.equal(result.nominalPursuitDamage, 160.3485);
  assert.equal(result.damageDistribution.patternCount, 101);
  assert.equal(result.damageDistribution.minimumDamage, 152);
  assert.equal(result.damageDistribution.maximumDamage, 168);
  assert.equal(result.damageDistribution.nominalPreparation, "none");
  assert.equal(result.damageDistribution.finalRounding, "floor");
  assert.ok(Math.abs(result.damageDistribution.expectedDamage - 159.84158415841586) < 1e-12);
  assert.deepEqual(result.issues.map((issue) => issue.code), ["unverified-effective-pursuit"]);
});

test("selects pursuit by protagonist element and can disambiguate by skill ID", () => {
  const effect = (sourceSkillId: string, elementCode: string): EffectiveWeaponSkillEffect => ({
    sourceWeaponSlot: 1,
    sourceWeaponId: "weapon",
    sourceSkillId,
    sourceSkillName: sourceSkillId,
    kind: "elemental-pursuit",
    elementCode,
    baseAmountPercent: 10,
    effectiveAmountPercent: 10,
    verificationStatus: "検証済み",
    appliedModifiers: [],
  });
  const deck = makeDeck([effect("fire-a", "1"), effect("fire-b", "1"), effect("water", "2")]);

  assert.throws(
    () => calculateEffectivePursuitDamage(deck, 1000),
    /expected exactly one effective pursuit effect, found 2/,
  );
  const result = calculateEffectivePursuitDamage(deck, 1000, { sourceSkillId: "fire-b" });
  assert.equal(result.pursuitEffect.sourceSkillId, "fire-b");
  assert.equal(result.nominalPursuitDamage, 100);
  assert.deepEqual(result.issues, []);
});

test("rejects unresolved pursuit effects and invalid base damage", () => {
  const deck = makeDeck([]);
  assert.throws(
    () => calculateEffectivePursuitDamage(deck, 1000),
    /expected exactly one effective pursuit effect, found 0/,
  );
  assert.throws(() => calculateEffectivePursuitDamage(deck, Number.NaN), /baseDamage/);
});
