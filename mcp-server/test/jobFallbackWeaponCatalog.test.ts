import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createJobFallbackWeaponCatalogView,
  loadJobFallbackWeaponCatalog,
  resolveJobFallbackWeapon,
} from "../src/calculator/jobFallbackWeaponCatalog.ts";

test("loads one verified level-1 fallback weapon for every weapon kind", () => {
  const catalog = loadJobFallbackWeaponCatalog();

  assert.equal(catalog.weapons.length, 10);
  assert.deepEqual(
    catalog.weapons.map((weapon) => Number(weapon.weaponKindCode)).sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(new Set(catalog.weapons.map((weapon) => weapon.weaponId)).size, 10);
  assert.ok(
    catalog.weapons.every(
      (weapon) =>
        weapon.level === 1 &&
        weapon.rarityCode === "1" &&
        weapon.hasSkills === false &&
        weapon.verificationStatus === "検証済み",
    ),
  );
});

test("resolves the observed fallback weapon by weapon kind", () => {
  assert.deepEqual(resolveJobFallbackWeapon("2"), {
    weaponKindCode: "2",
    weaponId: "1010100400",
    name: "ブロンズナイフ",
    elementCode: "2",
    rarityCode: "1",
    level: 1,
    attack: 65,
    hp: 7,
    maxLevel: 40,
    maxAttack: 455,
    maxHp: 49,
    hasSkills: false,
    verificationStatus: "検証済み",
    source: "ゲーム内図鑑とメイン武器未選択のdeckレスポンスで確認",
    confirmedAt: "2026-09-06",
  });
  assert.equal(resolveJobFallbackWeapon("11"), undefined);
});

test("creates a JSON-safe public view without the internal lookup map", () => {
  const view = createJobFallbackWeaponCatalogView();
  assert.equal(view.weapons.length, 10);
  assert.deepEqual(Object.keys(view).sort(), ["schemaVersion", "weapons"]);
  assert.equal(JSON.parse(JSON.stringify(view)).weapons.length, 10);
});
