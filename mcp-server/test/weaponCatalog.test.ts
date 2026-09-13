import { test } from "node:test";
import assert from "node:assert/strict";
import { loadIncrementalWeaponCatalog } from "../src/calculator/weaponCatalog.ts";

test("loads the initial incremental weapon and skill catalog", () => {
  const catalog = loadIncrementalWeaponCatalog();

  assert.equal(catalog.weapons.size, 2970);
  assert.equal(catalog.skills.size, 353);
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
    ["208", [[10, 16], [15, 20], [20, 22]]],
    ["764", [[10, 12], [15, 14.5], [20, 15.5]]],
    ["770", [[10, 15], [15, 18], [20, 20]]],
    ["771", [[10, 12], [15, 14.5], [20, 16]]],
    ["1422", [[10, 16], [15, 20], [20, 22]]],
    ["2", [[10, 10], [15, 12], [20, 13]]],
    ["14", [[10, 12], [15, 14.5], [20, 16]]],
    ["209", [[10, 16], [15, 20], [20, 22]]],
    ["336", [[10, 15], [15, 18], [20, 20]]],
    ["627", [[10, 17], [15, 22]]],
    ["846", [[10, 10], [15, 12], [20, 13]]],
    ["1417", [[10, 15], [15, 18], [20, 20]]],
    ["1507", [[10, 12], [15, 14.5], [20, 16]]],
    ["1651", [[10, 15], [15, 18], [20, 20]]],
    ["27", [[10, 15], [15, 18], [20, 20]]],
    ["210", [[10, 16], [15, 20], [20, 22]]],
    ["324", [[10, 12], [15, 14.5], [20, 16]]],
    ["337", [[10, 15], [15, 18], [20, 20]]],
    ["384", [[10, 12], [15, 14.5], [20, 16]]],
    ["628", [[10, 17], [15, 22]]],
    ["766", [[10, 12], [15, 14.5], [20, 15.5]]],
    ["869", [[10, 10], [15, 12], [20, 13]]],
    ["1031", [[10, 16], [15, 20], [20, 22]]],
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
  const normalHpTableCases = [
    ["375", [[1, 1], [10, 10], [15, 12], [20, 12.5]]],
    ["765", [[1, 3], [10, 12], [15, 14.5], [20, 15.5]]],
    ["1228", [[1, 6], [10, 15], [15, 18], [20, 20]]],
    ["7", [[10, 12], [15, 14], [20, 16]]],
    ["19", [[10, 15], [15, 17]]],
    ["764", [[1, 3], [10, 12], [15, 14.5], [20, 15.5]]],
    ["32", [[10, 18], [15, 21], [20, 24]]],
    ["766", [[1, 3], [10, 12], [15, 14.5], [20, 15.5]]],
    ["1037", [[10, 12], [15, 14], [20, 16]]],
  ] as const;
  for (const [skillId, expected] of normalHpTableCases) {
    const effects = catalog.skills.get(skillId)?.effects
      .filter((effect) => effect.kind === "normal-hp-up") ?? [];
    assert.deepEqual(
      effects.map((effect) => [effect.skillLevel, effect.amountPercent]),
      expected,
      `normal HP table for skill ${skillId}`,
    );
    assert.equal(effects.every((effect) => effect.verificationStatus === "下書き"), true);
  }
  assert.equal(catalog.skills.get("375")?.unsupportedEffects, undefined);
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
  const sharedWeaponSkillSlots = new Map([
    ["1040023700", [["skill1", "1913"], ["skill2", "375"]]],
    ["1040024600", [["skill1", "19"], ["skill2", "1296"], ["skill3", "1506"]]],
    ["1040314900", [["skill1", "1664"], ["skill2", "764"]]],
    ["1040410100", [["skill1", "770"], ["skill2", "771"]]],
    ["1040418900", [["skill1", "1228"], ["skill2", "7"]]],
    ["1040612700", [["skill1", "1422"], ["skill2", "632"]]],
    ["1040805100", [["skill1", "494"], ["skill2", "25"]]],
    ["1040906700", [["skill1", "208"], ["skill2", "601"]]],
  ]);
  for (const [weaponId, expected] of sharedWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for weapon ${weaponId}`,
    );
  }
  const sharedWaterWeaponSkillSlots = new Map([
    ["1040004600", [["skill1", "627"], ["skill2", "633"]]],
    ["1040011200", [["skill1", "209"], ["skill2", "783"]]],
    ["1040201200", [["skill1", "32"], ["skill2", "2"]]],
    ["1040217800", [["skill1", "1651"], ["skill2", "119"], ["skill3", "14"]]],
    ["1040420100", [["skill1", "268"], ["skill2", "765"], ["skill3", "415"]]],
    ["1040518100", [["skill1", "1507"], ["skill2", "2466"], ["skill3", "2558"]]],
    ["1040606000", [["skill1", "336"], ["skill2", "81"]]],
    ["1040703800", [["skill1", "370"], ["skill2", "1009"], ["skill3", "846"]]],
    ["1040708700", [["skill1", "1417"], ["skill2", "2"]]],
    ["1040918400", [["skill1", "2915"], ["skill2", "2481"], ["skill3", "2175"]]],
  ]);
  for (const [weaponId, expected] of sharedWaterWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for water weapon ${weaponId}`,
    );
  }
  const sharedEarthWeaponSkillSlots = new Map([
    ["1040020900", [["skill1", "1646"], ["skill2", "869"]]],
    ["1040028500", [["skill1", "2572"], ["skill2", "2578"], ["skill3", "2584"]]],
    ["1040110600", [["skill1", "1031"], ["skill2", "1037"]]],
    ["1040116400", [["skill1", "1947"], ["skill2", "376"]]],
    ["1040208100", [["skill1", "210"], ["skill2", "779"]]],
    ["1040305800", [["skill1", "27"], ["skill2", "120"]]],
    ["1040312900", [["skill1", "1201"], ["skill2", "766"]]],
    ["1040506100", [["skill1", "337"], ["skill2", "371"]]],
    ["1040615800", [["skill1", "324"], ["skill2", "1316"], ["skill3", "1658"]]],
    ["1040803600", [["skill1", "376"], ["skill2", "384"]]],
    ["1040910000", [["skill1", "628"], ["skill2", "916"]]],
  ]);
  for (const [weaponId, expected] of sharedEarthWeaponSkillSlots) {
    assert.deepEqual(
      catalog.weapons.get(weaponId)?.skillSlots.map(({ sourceKey, skillId }) => [sourceKey, skillId]),
      expected,
      `skill slots for earth weapon ${weaponId}`,
    );
  }
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
