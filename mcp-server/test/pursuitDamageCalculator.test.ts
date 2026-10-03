import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import { applyNormalAttackHitStages, calculateEffectivePursuitDamage } from "../src/calculator/pursuitDamageCalculator.ts";
import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "../src/calculator/types.ts";

test("damage taken amplification follows attenuation and splitting but never multiplies flat supplements", () => {
  const stages = {
    profile: { id: "synthetic", name: "synthetic", lines: [{ threshold: 1_000, passRate: 0.1 }] },
    damageCapUpPercent: 0, postAttenuationPercent: 50,
    enemyDamageTakenAmplificationPercent: 20,
    randomTargetHitCount: 2, supplementalDamagePerHit: 77, criticalDamageBonusPercent: 0,
  };
  // 2000 raw -> 1100 attenuated -> 550 per split -> 825 dealt -> 990 taken -> +77.
  assert.equal(applyNormalAttackHitStages(2_000, 100, stages), 1_067);
  assert.equal(applyNormalAttackHitStages(2_000, 20, stages), 275);
  assert.equal(applyNormalAttackHitStages(2_000, 20, { ...stages, beforePursuitRounding: "ceil" }), 275);
  assert.equal(applyNormalAttackHitStages(2_000, 100, { ...stages, enemyDamageTakenAmplificationPercent: undefined }), 902);
});

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

test("combines two copies of the dark pursuit skill and caps their shared effect while retaining every source", () => {
  const effect = (slot: number, percent: number): EffectiveWeaponSkillEffect => ({
    sourceWeaponSlot: slot, sourceWeaponId: "1040916700", sourceSkillId: "2179", sourceSkillName: "奈落の襲刃",
    kind: "elemental-pursuit", elementCode: "6", baseAmountPercent: 4.5, effectiveAmountPercent: percent,
    stackingCapPercent: 50, verificationStatus: slot === 1 ? "検証済み" : "下書き", appliedModifiers: [],
  });
  const deck = { ...makeDeck([effect(1, 17.55), effect(2, 17.55)]), protagonist: { elementCode: "6" } };
  const result = calculateEffectivePursuitDamage(deck, 1000);
  assert.equal(result.effectivePursuitPercentage, 35.1);
  assert.equal(result.nominalPursuitDamage, 351);
  assert.equal(result.pursuitEffects.length, 2);
  assert.equal(result.issues[0].code, "unverified-effective-pursuit");
  deck.effectiveWeaponSkillEffects = [effect(1, 27), effect(2, 27)];
  const capped = calculateEffectivePursuitDamage(deck, 1000);
  assert.equal(capped.rawPursuitPercentage, 54);
  assert.equal(capped.effectivePursuitPercentage, 50);
});
