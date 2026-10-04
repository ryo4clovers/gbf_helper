import test from "node:test";
import assert from "node:assert/strict";
import { URL_FILTER_PRESETS, collectUrlFilters, filterRecordsByUrl } from "./viewer-filters.js";
import { createRecorderState } from "./viewer-webmcp.js";

const record = (path) => ({ url: `https://example.test${path}` });

test("comma terms and selected presets form one case-insensitive OR condition", () => {
  const filters = collectUrlFilters("  CUSTOM , ,RESULT.JSON, custom,", ["/party/deck", "result.json"]);
  assert.deepEqual(filters, ["custom", "result.json", "/party/deck"]);
  const records = [record("/custom"), record("/rest/raid/ability_result.json"), record("/party/deck"), record("/other")];
  assert.deepEqual(filterRecordsByUrl(records, filters), records.slice(0, 3));
  assert.deepEqual(filterRecordsByUrl(records, collectUrlFilters("custom", [])), [records[0]]);
});

test("empty terms and unchecked presets include all records; no match includes none", () => {
  const records = [record("/one"), record("/two")];
  assert.deepEqual(filterRecordsByUrl(records, collectUrlFilters(" , , ")), records);
  assert.deepEqual(filterRecordsByUrl(records, collectUrlFilters("absent")), []);
});

test("all 16 presets match endpoints with trailing slash, arguments or query", () => {
  assert.equal(URL_FILTER_PRESETS.length, 16);
  assert.equal(new Set(URL_FILTER_PRESETS.map((p) => p.value)).size, 16);
  for (const preset of URL_FILTER_PRESETS) {
    const filters = collectUrlFilters("", [preset.value]);
    const path = preset.value.startsWith("/") ? preset.value : `/rest/raid/${preset.value}`;
    const records = [record(path), record(`${path}/`), record(`${path}/123?x=1`), record(path.toUpperCase())];
    assert.deepEqual(filterRecordsByUrl(records, filters), records, preset.label);
  }
});

test("protagonist LB preset does not match character LB; results cover all three battle actions", () => {
  const lbs = [record("/zenith/bonus_list/123"), record("/npczenith/bonus_list/456")];
  assert.deepEqual(filterRecordsByUrl(lbs, collectUrlFilters("", ["/zenith/bonus_list"])), [lbs[0]]);
  const results = ["normal_attack", "ability", "summon"].map((kind) => record(`/rest/raid/${kind}_result.json`));
  assert.deepEqual(filterRecordsByUrl([...results, record("/rest/raid/start.json")], ["result.json"]), results);
});

test("both export collections and WebMCP state share the effective filter terms", () => {
  const filters = collectUrlFilters("effect", ["start.json"]);
  const apiCalls = [record("/rest/raid/start.json"), record("/rest/raid/normal_attack_result.json")];
  const assets = [record("/assets/effect.js"), record("/assets/image.png")];
  const exported = { apiCalls: filterRecordsByUrl(apiCalls, filters), assets: filterRecordsByUrl(assets, filters) };
  assert.deepEqual(exported, { apiCalls: [apiCalls[0]], assets: [assets[0]] });
  assert.deepEqual(createRecorderState({ apiCalls, assets, filters }).currentUrlFilters, filters);
  assert.equal(apiCalls.length, 2);
  assert.equal(assets.length, 2);
});
