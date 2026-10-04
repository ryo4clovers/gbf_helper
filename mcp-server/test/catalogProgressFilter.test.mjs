import assert from "node:assert/strict";
import { test } from "node:test";
import { filterCatalogItems, facetOptions, categoryFacetKeys } from "../web/catalog-progress-filter.js";
const items = [
  { id: "one", name: "浴衣イルザ", nameEn: "Ilsa", elementCode: "6", rarity: "SSR", verificationStatus: "下書き", facets: { proficiency: ["銃", "弓"], gender: ["女性"], race: ["エルーン"], series: [], skills: ["奈落の攻刃"] }, coverage: { connection: "partial", missing: ["fixture"], unknown: ["fixture"], effects: [] } },
  { id: "two", name: "TEST", elementCode: "1", rarity: "SR", verificationStatus: "検証済み", facets: { proficiency: ["剣"], gender: ["不明"], race: ["ヒューマン", "エルーン"], series: ["なし"], skills: [] }, coverage: { connection: "unknown", missing: [], unknown: [], effects: [{ connection: "unknown" }] } },
];
test("six character axes combine with query and support/data filters", () => {
  const filters = { query: "ＩＬＳＡ", rarity: "SSR", element: "6", proficiency: "弓", series: "__missing__", race: "エルーン", gender: "女性", connection: "partial", verification: "下書き", missing: true, unknown: true };
  assert.deepEqual(filterCatalogItems(items, filters).map(item => item.id), ["one"]);
  assert.deepEqual(filterCatalogItems(items, { ...filters, gender: "男性" }), []);
  assert.equal(filterCatalogItems(items, {}).length, 2);
});
test("registered unknown or none classifications are distinct from missing", () => {
  assert.deepEqual(filterCatalogItems(items, { gender: "不明", series: "なし" }).map(item => item.id), ["two"]);
  assert.deepEqual(filterCatalogItems(items, { series: "__missing__" }).map(item => item.id), ["one"]);
  assert.deepEqual(facetOptions(items, "series"), [{ value: "なし", label: "なし" }, { value: "__missing__", label: "未登録" }]);
});
test("skill filter is independent of calculation support and covers description names", () => {
  assert.deepEqual(filterCatalogItems(items, { skills: "攻刃", connection: "partial" }).map(item => item.id), ["one"]);
  assert.deepEqual(filterCatalogItems(items, { skills: "攻刃", connection: "connected" }), []);
  assert.deepEqual(filterCatalogItems(items, { skills: "__missing__" }).map(item => item.id), ["two"]);
});
test("category-specific axes do not expose irrelevant fields", () => {
  assert.deepEqual(categoryFacetKeys("summons"), ["series"]);
  assert.deepEqual(categoryFacetKeys("weapons"), ["weaponKind", "series", "skills", "effectTypes"]);
  assert.deepEqual(categoryFacetKeys("characters"), ["proficiency", "series", "race", "gender"]);
});
test("free skill name search and numeric effect class are independent AND axes", () => {
  const classified = items.map(item => ({ ...item, facets: { ...item.facets, effectTypes: item.id === "one" ? ["渾身", "HP上昇（守護・神威など）"] : [] } }));
  assert.deepEqual(filterCatalogItems(classified, { skills: "攻刃", effectTypes: "渾身", connection: "partial" }).map(item => item.id), ["one"]);
  assert.deepEqual(filterCatalogItems(classified, { skills: "神威", effectTypes: "渾身" }), []);
  assert.deepEqual(filterCatalogItems(classified, { effectTypes: "__missing__" }).map(item => item.id), ["two"]);
  assert.ok(facetOptions(classified, "effectTypes").some(option => option.label.startsWith("未分類")));
});
