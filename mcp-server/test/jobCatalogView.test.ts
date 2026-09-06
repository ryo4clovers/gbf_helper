import { test } from "node:test";
import assert from "node:assert/strict";
import { createSelectableJobCatalog } from "../src/calculator/jobCatalogView.ts";

test("creates a deterministic browser-safe catalog from all job knowledge", () => {
  const catalog = createSelectableJobCatalog();

  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.jobs.length, 80);
  const fighterOrigin = catalog.jobs.find((job) => job.jobId === "100501");
  assert.equal(fighterOrigin?.name, "ファイター・オリジン");
  assert.equal(fighterOrigin?.classTier, "オリジン");
  assert.deepEqual(fighterOrigin?.weaponKinds, [
    { code: "1", name: "剣" },
    { code: "4", name: "斧" },
  ]);
  assert.equal(fighterOrigin?.verificationStatus, "下書き");
  assert.equal(JSON.stringify(catalog).includes("source"), false);

  const knight = catalog.jobs.find((job) => job.jobId === "110001");
  assert.equal(knight?.baseDoubleAttackRate, 7);
  assert.equal(knight?.baseTripleAttackRate, 3);
  assert.deepEqual(knight?.jobLevelMultiattackBonuses, []);

  const relicBuster = catalog.jobs.find((job) => job.jobId === "450301");
  assert.deepEqual(relicBuster?.jobLevelMultiattackBonuses, [
    { level: 5, doubleAttackRatePercent: 5, tripleAttackRatePercent: 0 },
    { level: 15, doubleAttackRatePercent: 0, tripleAttackRatePercent: 5 },
    { level: 20, doubleAttackRatePercent: 5, tripleAttackRatePercent: 5 },
  ]);
  assert.equal(
    relicBuster?.masterLevelMultiattackBonuses.reduce(
      (sum, bonus) => sum + bonus.doubleAttackRatePercent,
      0,
    ),
    20,
  );
  assert.deepEqual(relicBuster?.perfectionProofMultiattackBonuses, [
    { level: 4, doubleAttackRatePercent: 0, tripleAttackRatePercent: 7 },
  ]);
});
