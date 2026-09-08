import { test } from "node:test";
import assert from "node:assert/strict";
import { loadIncrementalWeaponCatalog } from "../src/calculator/weaponCatalog.ts";

test("loads the initial incremental weapon and skill catalog", () => {
  const catalog = loadIncrementalWeaponCatalog();

  assert.equal(catalog.weapons.size, 9);
  assert.equal(catalog.skills.size, 16);
  assert.deepEqual(catalog.weapons.get("1040201400")?.skillSlots, [
    { sourceKey: "skill1", skillId: "25" },
    { sourceKey: "skill2", skillId: "74" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040218900")?.skillSlots, [
    { sourceKey: "skill1", skillId: "2025" },
    { sourceKey: "skill2", skillId: "845" },
    { sourceKey: "skill3", skillId: "2174" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040915300")?.skillSlots, [
    { sourceKey: "skill1", skillId: "510" },
    { sourceKey: "skill2", skillId: "80" },
    { sourceKey: "skill3", skillId: "1" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040206800")?.skillSlots, [
    { sourceKey: "skill1", skillId: "335" },
    { sourceKey: "skill2", skillId: "396" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040812900")?.skillSlots, [
    { sourceKey: "skill1", skillId: "1506" },
    { sourceKey: "skill2", skillId: "639" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040220800")?.skillSlots, [
    { sourceKey: "skill1", skillId: "2801" },
    { sourceKey: "skill2", skillId: "2807" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040401500")?.levelStats, {
    maximumLevel: 200,
    points: [
      { level: 1, attack: 325, hp: 40 },
      { level: 100, attack: 1960, hp: 258 },
      { level: 150, attack: 2290, hp: 302 },
      { level: 200, attack: 2450, hp: 324 },
    ],
  });
  assert.deepEqual(catalog.weapons.get("1040101500")?.levelStats, {
    maximumLevel: 200,
    points: [
      { level: 1, attack: 340, hp: 37 },
      { level: 100, attack: 2155, hp: 219 },
      { level: 150, attack: 2520, hp: 255 },
      { level: 200, attack: 2700, hp: 273 },
    ],
  });
  assert.deepEqual(
    catalog.skills.get("510")?.effects
      .filter((effect) => effect.skillLevel === 15)
      .map((effect) => [effect.kind, effect.amountPercent]),
    [
      ["double-attack-rate-up", 7],
      ["triple-attack-rate-up", 7],
    ],
  );
  assert.equal(catalog.skills.get("2025")?.verificationStatus, "検証済み");
  assert.equal(catalog.skills.get("845")?.verificationStatus, "検証済み");
  assert.equal(catalog.skills.get("2174")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("396")?.verificationStatus, "検証済み");
  assert.equal(catalog.skills.get("1506")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("2801")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("94")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("66")?.verificationStatus, "下書き");
});
