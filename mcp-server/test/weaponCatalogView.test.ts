import { test } from "node:test";
import assert from "node:assert/strict";
import { createSelectableWeaponCatalog } from "../src/calculator/weaponCatalogView.ts";

test("creates a deterministic browser-safe weapon catalog", () => {
  const catalog = createSelectableWeaponCatalog();

  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.weapons.length, 7);
  assert.deepEqual(
    catalog.weapons.map((weapon) => weapon.name),
    ["イフリートハルベルト", "エリクトニオス", "オーバーライド", "ソロモンアクセル", "ブロンズソード", "ミムメモ人形", "禁栄の禍槍"],
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
