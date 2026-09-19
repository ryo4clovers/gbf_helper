import assert from "node:assert/strict";
import test from "node:test";
import { calculateIncomingDamagePrediction } from "../src/calculator/incomingDamageCalculator.ts";

test("adds defense and multiplies matching elemental reductions before the final ceiling", () => {
  const result = calculateIncomingDamagePrediction(10_000, 73, [5, 5, 5]);
  const raw = 10_000 / 1.73 * 0.95 ** 3;
  assert.equal(result.nominalDamage, Math.ceil(raw));
  assert.equal(result.minimumDamage, Math.ceil(raw * 0.95));
  assert.equal(result.maximumDamage, Math.ceil(raw * 1.05));
  assert.ok(Math.abs(result.effectiveElementalDamageReductionPercent - 14.2625) < 1e-9);
});
