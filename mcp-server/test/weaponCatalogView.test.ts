import { test } from "node:test";
import assert from "node:assert/strict";
import { createSelectableWeaponCatalog } from "../src/calculator/weaponCatalogView.ts";

test("creates a deterministic browser-safe weapon catalog", () => {
  const catalog = createSelectableWeaponCatalog();

  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.weapons.length, 172);
  assert.deepEqual(
    catalog.weapons.map((weapon) => weapon.name),
    [...catalog.weapons].map((weapon) => weapon.name).sort((left, right) => left.localeCompare(right, "ja")),
  );
  assert.ok(catalog.weapons.some((weapon) => weapon.weaponId === "1040613800" && weapon.name === "ウィルナス・フィンガー"));
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040902700")?.selectionDefaults,
    { level: 200, hp: 210, attack: 3030, uncapLevel: 5, skillLevel: 20 },
  );
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040808200")?.levelStats,
    {
      maximumLevel: 150,
      points: [
        { level: 1, attack: 322, hp: 65 },
        { level: 100, attack: 2044, hp: 226 },
        { level: 150, attack: 2390, hp: 260 },
      ],
    },
  );
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040101500")?.levelStats,
    {
      maximumLevel: 200,
      points: [
        { level: 1, attack: 340, hp: 37 },
        { level: 100, attack: 2155, hp: 219 },
        { level: 150, attack: 2520, hp: 255 },
        { level: 200, attack: 2700, hp: 273 },
      ],
    },
  );
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040401500"),
    {
      weaponId: "1040401500",
      name: "コロッサスケーン・マグナ",
      elementCode: "1",
      weaponKindCode: "5",
      rarityCode: "4",
      seriesId: "8",
      selectionDefaults: { uncapLevel: 5, skillLevel: 20 },
      levelStats: {
        maximumLevel: 200,
        points: [
          { level: 1, attack: 325, hp: 40 },
          { level: 100, attack: 1960, hp: 258 },
          { level: 150, attack: 2290, hp: 302 },
          { level: 200, attack: 2450, hp: 324 },
        ],
      },
      verificationStatus: "検証済み",
      skills: [{
        skillId: "94",
        name: "機炎方陣・攻刃III",
        description: "火属性キャラの攻撃力上昇(大)",
        verificationStatus: "下書き",
      }],
    },
  );
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040915300")?.skills.map((skill) => skill.name),
    ["紅蓮の三手", "業火の技巧", "火の攻刃"],
  );
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040220800")?.levelStats,
    {
      maximumLevel: 150,
      points: [
        { level: 1, attack: 420, hp: 24 },
        { level: 100, attack: 2207, hp: 225 },
        { level: 150, attack: 2654, hp: 275 },
      ],
    },
  );
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040206800")?.skills.map((skill) => skill.name),
    ["紅蓮の暴君", "紅蓮の三手"],
  );
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040218900")?.skills.map((skill) => skill.name),
    ["オプティマスブースト・ファイア", "火の刹那", "紅蓮の襲刃"],
  );
  assert.equal(JSON.stringify(catalog).includes("instanceId"), false);
});
