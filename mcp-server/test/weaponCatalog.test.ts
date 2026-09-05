import { test } from "node:test";
import assert from "node:assert/strict";
import { loadIncrementalWeaponCatalog } from "../src/calculator/weaponCatalog.ts";

test("loads the initial incremental weapon and skill catalog", () => {
  const catalog = loadIncrementalWeaponCatalog();

  assert.equal(catalog.weapons.size, 3);
  assert.equal(catalog.skills.size, 5);
  assert.deepEqual(catalog.weapons.get("1040201400")?.skillSlots, [
    { sourceKey: "skill1", skillId: "25" },
    { sourceKey: "skill2", skillId: "74" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040218900")?.skillSlots, [
    { sourceKey: "skill1", skillId: "2025" },
    { sourceKey: "skill2", skillId: "845" },
    { sourceKey: "skill3", skillId: "2174" },
  ]);
  assert.equal(catalog.skills.get("2025")?.verificationStatus, "検証済み");
  assert.equal(catalog.skills.get("845")?.verificationStatus, "検証済み");
  assert.equal(catalog.skills.get("2174")?.verificationStatus, "下書き");
});
