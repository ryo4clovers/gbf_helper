import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATALOG_ELEMENT_ORDER,
  CATALOG_RARITY_ORDER,
  catalogRarity,
  catalogRarityFilterOptions,
  filterAndSortCatalog,
} from "../web/catalog-picker-filter.js";

const catalog = [
  { weaponId: "300", elementCode: "2", rarityCode: "4" },
  { weaponId: "20", elementCode: "1", rarityCode: "3" },
  { weaponId: "3", elementCode: "1", rarityCode: "4" },
  { weaponId: "1", elementCode: "6", rarityCode: "4" },
  { weaponId: "2", elementCode: "0", rarityCode: "2" },
];

test("sorts catalogs by standard element order and numeric ID", () => {
  assert.deepEqual(
    filterAndSortCatalog(catalog, "", "", "weaponId").map((entry) => entry.weaponId),
    ["3", "20", "300", "1", "2"],
  );
});

test("combines element and rarity filters before sorting by numeric ID", () => {
  assert.deepEqual(
    filterAndSortCatalog(catalog, "1", "SSR", "weaponId").map((entry) => entry.weaponId),
    ["3"],
  );
  assert.deepEqual(filterAndSortCatalog(catalog, "2", "SR", "weaponId"), []);
});

test("normalizes character labels and equipment rarity codes", () => {
  assert.equal(catalogRarity({ rarity: "SSR" }), "SSR");
  assert.equal(catalogRarity({ rarityCode: "3" }), "SR");
});

test("keeps filter buttons in standard element and rarity order", () => {
  assert.deepEqual(CATALOG_ELEMENT_ORDER, ["1", "2", "3", "4", "5", "6", "0"]);
  assert.deepEqual(CATALOG_RARITY_ORDER, ["N", "R", "SR", "SSR"]);
  assert.deepEqual(catalogRarityFilterOptions("character"), ["R", "SR", "SSR"]);
  assert.deepEqual(catalogRarityFilterOptions("summon"), ["N", "R", "SR", "SSR"]);
});
