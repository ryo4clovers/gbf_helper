import { test } from "node:test";
import assert from "node:assert/strict";
import { createSelectableWeaponCatalog } from "../src/calculator/weaponCatalogView.ts";

test("creates a deterministic browser-safe weapon catalog", () => {
  const catalog = createSelectableWeaponCatalog();

  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.weapons.length, 4);
  assert.deepEqual(
    catalog.weapons.map((weapon) => weapon.name),
    ["イフリートハルベルト", "オーバーライド", "ソロモンアクセル", "ブロンズソード"],
  );
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040915300")?.skills.map((skill) => skill.name),
    ["紅蓮の三手", "業火の技巧", "火の攻刃"],
  );
  assert.deepEqual(
    catalog.weapons.find((weapon) => weapon.weaponId === "1040218900")?.skills.map((skill) => skill.name),
    ["オプティマスブースト・ファイア", "火の刹那", "紅蓮の襲刃"],
  );
  assert.equal(JSON.stringify(catalog).includes("instanceId"), false);
});
