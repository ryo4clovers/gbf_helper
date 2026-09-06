import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateArticleCrewAttackSteps } from "../src/calculator/articleBaseDamageCalculator.ts";

test("article crew steps preserve K+epsilon for ship but avoid it for furnace", () => {
  const shipBoundary = calculateArticleCrewAttackSteps(26000, 10, 0);
  assert.equal(shipBoundary.precisionStep, 2600);
  assert.equal(shipBoundary.shipStepRaw, 2860.0000000000005);
  assert.equal(shipBoundary.shipStep, 2861);

  const furnaceBoundary = calculateArticleCrewAttackSteps(123714, 10, 10);
  assert.equal(furnaceBoundary.precisionStep, 12372);
  assert.equal(furnaceBoundary.shipStep, 13610);
  assert.equal(furnaceBoundary.furnaceStepRaw, 14971);
  assert.equal(furnaceBoundary.furnaceStep, 14971);
});
