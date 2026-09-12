import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATALOG_ELEMENT_ORDER,
  filterAndSortCatalogByElement,
} from "../web/catalog-element-filter.js";

const catalog = [
  { weaponId: "300", elementCode: "2" },
  { weaponId: "20", elementCode: "1" },
  { weaponId: "3", elementCode: "1" },
  { weaponId: "1", elementCode: "6" },
  { weaponId: "2", elementCode: "0" },
];

test("sorts catalogs by standard element order and numeric ID", () => {
  assert.deepEqual(
    filterAndSortCatalogByElement(catalog, "", "weaponId").map((entry) => entry.weaponId),
    ["3", "20", "300", "1", "2"],
  );
});

test("filters one element before sorting by numeric ID", () => {
  assert.deepEqual(
    filterAndSortCatalogByElement(catalog, "1", "weaponId").map((entry) => entry.weaponId),
    ["3", "20"],
  );
});

test("keeps element buttons in fire, water, earth, wind, light, dark order", () => {
  assert.deepEqual(CATALOG_ELEMENT_ORDER, ["1", "2", "3", "4", "5", "6", "0"]);
});
