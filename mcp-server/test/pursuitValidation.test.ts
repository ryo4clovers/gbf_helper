import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDisplayedPursuitDamage } from "../src/calculator/pursuitValidation.ts";
import type { BattleActionResult, DeckSnapshot, ObservedDamage } from "../src/calculator/types.ts";

const deck = {
  schemaVersion: 1,
  protagonist: {},
  characters: [],
  weapons: [],
  summons: [],
  displayedDamageInfo: {
    assumedNormalDamage: 2741,
    effectValues: [
      {
        index: 0,
        icon: "01_icon_fire_concurrent_attack.png",
        valueText: "5.85％",
        percentage: 5.85,
      },
    ],
  },
} satisfies DeckSnapshot;

function makeResult(values: number[]): BattleActionResult {
  const damage: ObservedDamage[] = values.map((value, hitIndex) => ({
    sequence: hitIndex,
    sourceCommand: "attack",
    value,
    hitIndex,
    concurrentIndex: 1,
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

test("validates observed pursuit damage against displayed damage and a provisional random range", () => {
  const result = validateDisplayedPursuitDamage(deck, [makeResult([152, 159, 160, 167])]);

  assert.equal(result.status, "provisional");
  assert.equal(result.displayedBaseDamage, 2741);
  assert.equal(result.displayedPursuitPercentage, 5.85);
  assert.equal(result.nominalPursuitDamage, 160.3485);
  assert.deepEqual(result.acceptedRange, {
    min: 152,
    max: 168,
    randomMultiplierMin: 0.95,
    randomMultiplierMax: 1.05,
  });
  assert.deepEqual(result.observed, {
    count: 4,
    min: 152,
    max: 167,
    average: 159.5,
    withinRangeCount: 4,
    outliers: [],
  });
  assert.equal(result.randomMultiplierInference.multiplierCount, 101);
  assert.equal(result.randomMultiplierInference.resolvedObservationCount, 4);
  assert.deepEqual(result.randomMultiplierInference.unresolvedObservationIndexes, []);
  assert.equal(result.damageDistribution.patternCount, 101);
  assert.equal(result.damageDistribution.minimumDamage, 152);
  assert.equal(result.damageDistribution.maximumDamage, 168);
});

test("reports outliers without rejecting the complete validation result", () => {
  const result = validateDisplayedPursuitDamage(deck, [makeResult([151, 170])]);
  assert.equal(result.observed.withinRangeCount, 0);
  assert.deepEqual(result.observed.outliers, [151, 170]);
});

test("requires one matching displayed pursuit percentage", () => {
  const withoutEffect = structuredClone(deck);
  withoutEffect.displayedDamageInfo.effectValues = [];
  assert.throws(
    () => validateDisplayedPursuitDamage(withoutEffect, [makeResult([160])]),
    /expected exactly one percentage effect/,
  );
});
