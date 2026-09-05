import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDisplayedNormalAttackDamage } from "../src/calculator/normalAttackValidation.ts";
import type { BattleActionResult, DeckSnapshot, ObservedDamage } from "../src/calculator/types.ts";

const bodyValues = [3824, 3931, 3982, 4073, 3867, 4006, 3757, 4057, 3777, 3820, 4014, 3856];

function resultWithBodyDamage(values: number[]): BattleActionResult {
  const damage: ObservedDamage[] = values.map((value, hitIndex) => ({
    sequence: hitIndex,
    sourceCommand: "attack",
    value,
    hitIndex,
    concurrentIndex: 0,
    critical: false,
  }));
  return {
    schemaVersion: 1,
    actionKind: "normal-attack",
    commands: ["attack"],
    damage,
    totalDamage: values.reduce((sum, value) => sum + value, 0),
    enemyGaugeEvents: [],
    conditionEvents: [],
    resourceEvents: [],
    recoveryEvents: [],
    healing: [],
    chainBursts: [],
    enemyPassiveEffectCount: 0,
  };
}

test("validates the reacquired 39% grid body damage against the UI estimate", () => {
  const deck = {
    schemaVersion: 1,
    protagonist: { attack: 19484, elementCode: "1" },
    characters: [],
    weapons: [],
    summons: [],
    effectiveWeaponSkillEffects: [
      {
        sourceWeaponSlot: 2,
        sourceWeaponId: "1040201400",
        sourceSkillId: "25",
        sourceSkillName: "紅蓮の攻刃",
        kind: "normal-attack-up",
        elementCode: "1",
        baseAmountPercent: 18,
        effectiveAmountPercent: 23.4,
        skillLevel: 15,
        verificationStatus: "検証済み",
        appliedModifiers: [],
      },
      {
        sourceWeaponSlot: 3,
        sourceWeaponId: "1040218900",
        sourceSkillId: "845",
        sourceSkillName: "火の刹那",
        kind: "normal-attack-up",
        elementCode: "1",
        baseAmountPercent: 12,
        effectiveAmountPercent: 15.6,
        skillLevel: 15,
        verificationStatus: "検証済み",
        appliedModifiers: [],
      },
    ],
    displayedDamageInfo: {
      assumedNormalDamage: 3950,
      effectValues: [],
    },
  } satisfies DeckSnapshot;

  const result = validateDisplayedNormalAttackDamage(deck, [resultWithBodyDamage(bodyValues)]);

  assert.equal(result.attackPower.totalEffectiveNormalAttackPercent, 39);
  assert.equal(result.attackPower.normalAttackSkillMultiplier, 1.39);
  assert.equal(result.attackPower.normalSkillAdjustedAttack, 27082.76);
  assert.deepEqual(result.acceptedRange, {
    min: 3753,
    max: 4148,
    randomMultiplierMin: 0.95,
    randomMultiplierMax: 1.05,
  });
  assert.equal(result.observed.count, 12);
  assert.equal(result.observed.withinRangeCount, 12);
  assert.deepEqual(result.observed.outliers, []);
  assert.equal(result.randomMultiplierInference.resolvedObservationCount, 11);
  assert.deepEqual(result.randomMultiplierInference.unresolvedObservationIndexes, [4]);
});

test("rejects validation without displayed or observed normal damage", () => {
  const deck = {
    schemaVersion: 1,
    protagonist: { attack: 1000 },
    characters: [],
    weapons: [],
    summons: [],
  } satisfies DeckSnapshot;
  assert.throws(
    () => validateDisplayedNormalAttackDamage(deck, [resultWithBodyDamage([100])]),
    /displayedDamageInfo/,
  );
});
