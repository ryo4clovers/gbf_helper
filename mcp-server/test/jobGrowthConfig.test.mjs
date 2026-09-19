import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateJobGrowthBonuses,
  normalizeJobGrowthLevels,
} from "../web/job-growth-config.js";

const growthRow = (level, attack = 0, hp = 0, da = 0, ta = 0) => ({
  level,
  attack,
  hp,
  doubleAttackRatePercent: da,
  tripleAttackRatePercent: ta,
  defensePercent: 0,
  description: "test",
});

test("defaults supported job growth levels to their maximums", () => {
  const protagonist = {};
  normalizeJobGrowthLevels(protagonist, {
    maximumJobLevel: 20,
    maximumMasterLevel: 30,
    maximumPerfectionProofLevel: 6,
  });
  assert.deepEqual(protagonist, { jobLevel: 20, masterLevel: 30, perfectionProofLevel: 6 });
});

test("enforces ML and perfection-proof prerequisites", () => {
  const job = { maximumJobLevel: 20, maximumMasterLevel: 30, maximumPerfectionProofLevel: 6 };
  const protagonist = { jobLevel: 19, masterLevel: 30, perfectionProofLevel: 6 };
  normalizeJobGrowthLevels(protagonist, job);
  assert.deepEqual(protagonist, { jobLevel: 19, masterLevel: 1, perfectionProofLevel: 0 });

  protagonist.jobLevel = 20;
  protagonist.masterLevel = 29;
  protagonist.perfectionProofLevel = 6;
  normalizeJobGrowthLevels(protagonist, job);
  assert.equal(protagonist.perfectionProofLevel, 0);
});

test("fixes unsupported growth systems to zero", () => {
  const protagonist = { jobLevel: 20, masterLevel: 30, perfectionProofLevel: 6 };
  normalizeJobGrowthLevels(protagonist, {
    maximumJobLevel: 20,
    maximumMasterLevel: 0,
    maximumPerfectionProofLevel: 0,
  });
  assert.deepEqual(protagonist, { jobLevel: 20, masterLevel: 0, perfectionProofLevel: 0 });
});

test("aggregates only bonuses reached at the current levels", () => {
  const result = calculateJobGrowthBonuses({
    jobLevelBonuses: [growthRow(1, 400, 0, 0, 2), growthRow(20, 400, 0, 0, 2)],
    masterLevelBonuses: [growthRow(2, 300), growthRow(3, 0, 300)],
    perfectionProofBonuses: [growthRow(1, 3_500), growthRow(2, 0, 1_500, 0, 7)],
  }, { jobLevel: 10, masterLevel: 2, perfectionProofLevel: 1 });
  assert.deepEqual(result.totals, {
    attack: 4_200,
    hp: 0,
    doubleAttackRatePercent: 0,
    tripleAttackRatePercent: 2,
    defensePercent: 0,
  });
});
