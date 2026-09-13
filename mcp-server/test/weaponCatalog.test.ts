import { test } from "node:test";
import assert from "node:assert/strict";
import { loadIncrementalWeaponCatalog } from "../src/calculator/weaponCatalog.ts";

test("loads the initial incremental weapon and skill catalog", () => {
  const catalog = loadIncrementalWeaponCatalog();

  assert.equal(catalog.weapons.size, 2970);
  assert.equal(catalog.skills.size, 298);
  assert.deepEqual(catalog.weapons.get("1020500200")?.skillSlots, [
    { sourceKey: "skill1", skillId: "1" },
  ]);
  const fireMightEffects = catalog.skills.get("1")?.effects
    .filter((effect) => effect.kind === "normal-attack-up") ?? [];
  assert.deepEqual(
    [1, 2, 3, 4, 15, 20].map((skillLevel) => {
      const effect = fireMightEffects.find((candidate) => candidate.skillLevel === skillLevel);
      return [skillLevel, effect?.amountPercent, effect?.verificationStatus];
    }),
    [
      [1, 1, "検証済み"],
      [2, 2, "検証済み"],
      [3, 3, "検証済み"],
      [4, 4, "下書き"],
      [15, 12, "検証済み"],
      [20, 13, "下書き"],
    ],
  );
  assert.equal(fireMightEffects.some((effect) => effect.skillLevel === 16), false);
  const normalAttackTableCases = [
    ["375", [[10, 10], [15, 12], [20, 12.5]]],
    ["765", [[10, 12], [15, 14.5], [20, 15.5]]],
    ["1228", [[10, 15], [15, 18], [20, 20]]],
    ["626", [[10, 17], [15, 22]]],
    ["1551", [[10, 25], [15, 33]]],
  ] as const;
  for (const [skillId, expected] of normalAttackTableCases) {
    const effects = catalog.skills.get(skillId)?.effects
      .filter((effect) => effect.kind === "normal-attack-up") ?? [];
    assert.deepEqual(
      effects.map((effect) => [effect.skillLevel, effect.amountPercent]),
      expected,
      `normal attack table for skill ${skillId}`,
    );
    assert.equal(effects.every((effect) => effect.verificationStatus === "下書き"), true);
  }
  assert.deepEqual(catalog.skills.get("375")?.unsupportedEffects, ["最大HP上昇（守護部分）"]);
  assert.deepEqual(catalog.weapons.get("1040201400")?.skillSlots, [
    { sourceKey: "skill1", skillId: "25" },
    { sourceKey: "skill2", skillId: "74" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040218900")?.skillSlots, [
    { sourceKey: "skill1", skillId: "2025" },
    { sourceKey: "skill2", skillId: "845" },
    { sourceKey: "skill3", skillId: "2174" },
  ]);
  assert.deepEqual(catalog.weapons.get("1040007100")?.skillSlots, [
    { sourceKey: "skill1", skillId: "322" },
    { sourceKey: "skill2", skillId: "118" },
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
  assert.deepEqual(catalog.weapons.get("1040808200")?.levelStats, {
    maximumLevel: 150,
    points: [
      { level: 1, attack: 322, hp: 65 },
      { level: 100, attack: 2044, hp: 226 },
      { level: 150, attack: 2390, hp: 260 },
    ],
  });
  assert.deepEqual(catalog.weapons.get("1040808200")?.skillSlots, [
    { sourceKey: "skill1", skillId: "64" },
    { sourceKey: "skill2", skillId: "932" },
  ]);
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
  assert.deepEqual(
    catalog.skills.get("322")?.effects
      .filter((effect) => effect.skillLevel === 15)
      .map((effect) => [effect.kind, effect.amountPercent]),
    [
      ["normal-attack-up", 14.5],
      ["critical-rate-up", 6.5],
    ],
  );
  assert.equal(catalog.skills.get("1506")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("2801")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("94")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("66")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("64")?.verificationStatus, "下書き");
  assert.equal(catalog.skills.get("932")?.verificationStatus, "下書き");
  assert.deepEqual(
    catalog.skills.get("74")?.effects
      .filter((effect) => effect.kind === "critical-rate-up")
      .map((effect) => [effect.skillLevel, effect.amountPercent, effect.verificationStatus]),
    [
      [15, 3, "検証済み"],
      [10, 2, "下書き"],
      [20, 4, "下書き"],
    ],
  );
  assert.equal(
    catalog.skills.get("1547")?.effects[0]?.source,
    "ユーザー提供の攻略Wiki表画像（2026-09-09）",
  );
});
