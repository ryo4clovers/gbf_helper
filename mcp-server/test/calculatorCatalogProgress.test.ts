import assert from "node:assert/strict";
import { test } from "node:test";
import { createCalculatorCatalogProgressView } from "../src/services/calculatorCatalogProgress.ts";

test("summarizes calculator catalog targets and exposes browser-safe entry lists", () => {
  const progress = createCalculatorCatalogProgressView();
  const byId = new Map(progress.categories.map((category) => [category.id, category]));

  assert.equal(progress.schemaVersion, 2);
  assert.equal(progress.targetConfirmedAt, "2026-09-09");
  assert.deepEqual(
    progress.categories.map(({ id, registeredCount, targetCount, remainingCount, coveragePercent, exceedsTarget }) => ({
      id,
      registeredCount,
      targetCount,
      remainingCount,
      coveragePercent,
      exceedsTarget,
    })),
    [
      { id: "weapons", registeredCount: 2971, targetCount: 2967, remainingCount: 0, coveragePercent: 100.1, exceedsTarget: true },
      { id: "summons", registeredCount: 122, targetCount: 461, remainingCount: 339, coveragePercent: 26.5, exceedsTarget: false },
      { id: "characters", registeredCount: 1018, targetCount: 1017, remainingCount: 0, coveragePercent: 100.1, exceedsTarget: true },
    ],
  );
  assert.equal(byId.get("weapons")?.items.length, 2971);
  assert.equal(byId.get("summons")?.items.length, 122);
  assert.equal(byId.get("characters")?.items.length, 1018);
  assert.equal(JSON.stringify(progress).includes("captures"), false);
  assert.equal(JSON.stringify(progress).includes("user_id"), false);
});
