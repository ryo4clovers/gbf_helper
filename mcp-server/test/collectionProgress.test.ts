import assert from "node:assert/strict";
import { test } from "node:test";
import { createCollectionProgressView } from "../src/services/collectionProgress.ts";

test("summarizes committed equipment collection progress without exposing captures", () => {
  const progress = createCollectionProgressView();
  const weapons = progress.categories.find((category) => category.id === "weapons");
  const summons = progress.categories.find((category) => category.id === "summons");

  assert.equal(progress.schemaVersion, 1);
  assert.deepEqual(progress.summary, {
    archiveTotal: 402,
    knowledgeTotal: 437,
    calculatorTotal: 13,
  });
  assert.deepEqual(
    weapons && {
      archive: weapons.archive.total,
      knowledge: weapons.knowledge.total,
      calculator: weapons.calculator.total,
      statReady: weapons.calculator.statReady,
      coverage: weapons.calculatorToKnowledgePercent,
    },
    { archive: 289, knowledge: 169, calculator: 10, statReady: 4, coverage: 5.9 },
  );
  assert.equal(weapons?.knowledge.latestUpdated, "2026-09-08");
  assert.deepEqual(
    summons && {
      archive: summons.archive.total,
      knowledge: summons.knowledge.total,
      calculator: summons.calculator.total,
      statReady: summons.calculator.statReady,
      coverage: summons.calculatorToKnowledgePercent,
    },
    { archive: 113, knowledge: 268, calculator: 3, statReady: 1, coverage: 1.1 },
  );
  assert.equal(summons?.knowledge.latestUpdated, "2026-09-06");
  assert.deepEqual(weapons?.archive.byRarity, [
    { label: "N", count: 95 },
    { label: "R", count: 178 },
    { label: "SR", count: 16 },
    { label: "SSR", count: 0 },
  ]);
  assert.equal(JSON.stringify(progress).includes("captures"), false);
  assert.equal(JSON.stringify(progress).includes("user_id"), false);
});
