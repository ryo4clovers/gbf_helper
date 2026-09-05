import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inferRandomMultiplierCandidates,
  summarizeDamageDistribution,
} from "../src/calculator/randomMultiplierInference.ts";

test("summarizes 101 equally weighted damage patterns", () => {
  const result = summarizeDamageDistribution(160.3485, {
    nominalPreparation: "floor",
    finalRounding: "ceil",
  });

  assert.equal(result.model, "uniform-discrete");
  assert.equal(result.patternCount, 101);
  assert.equal(result.minimumDamage, 152);
  assert.equal(result.maximumDamage, 168);
  assert.equal(result.uniqueDamageCount, 17);
  assert.ok(Math.abs(result.expectedDamage - 160.47524752475246) < 1e-12);
});

test("enumerates 101 multiplier values at 0.001 increments", () => {
  const result = inferRandomMultiplierCandidates(160.3485, [152], {
    nominalPreparation: "floor",
    finalRounding: "ceil",
  });

  assert.equal(result.preparedNominalDamage, 160);
  assert.equal(result.multiplierCount, 101);
  assert.deepEqual(result.observations[0].candidates, [0.95]);
  assert.equal(result.resolvedObservationCount, 1);
  assert.deepEqual(result.unresolvedObservationIndexes, []);
});

test("returns every multiplier candidate when small damage values are ambiguous", () => {
  const result = inferRandomMultiplierCandidates(160.3485, [159], {
    nominalPreparation: "floor",
    finalRounding: "ceil",
  });

  assert.deepEqual(result.observations[0].candidates, [0.988, 0.989, 0.99, 0.991, 0.992, 0.993]);
  assert.equal(result.observations[0].candidateMin, 0.988);
  assert.equal(result.observations[0].candidateMax, 0.993);
});

test("reports observations that cannot be produced by the rounding hypothesis", () => {
  const result = inferRandomMultiplierCandidates(160.3485, [152], {
    nominalPreparation: "none",
    finalRounding: "ceil",
  });

  assert.equal(result.resolvedObservationCount, 0);
  assert.deepEqual(result.unresolvedObservationIndexes, [0]);
  assert.deepEqual(result.observations[0].candidates, []);
});

test("rejects invalid multiplier configuration", () => {
  assert.throws(
    () => inferRandomMultiplierCandidates(100, [100], { multiplierStep: 0 }),
    /multiplier range and step/,
  );
});
