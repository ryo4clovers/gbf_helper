import assert from "node:assert/strict";
import test from "node:test";
import {
  createRecorderState,
  registerRecorderWebMcpTools,
  searchRecordedApiCalls,
  serializeRecordedApiCall,
} from "../../tools/network-recorder/viewer-webmcp.js";

const records = [
  {
    id: 1,
    url: "https://game.granbluefantasy.jp/archive/weapon_detail?uid=private#fragment",
    status: 200,
    mimeType: "application/json",
    resourceType: "XHR",
    timestamp: 1_000,
    bodyEncoding: "text",
    body: JSON.stringify({ id: "1040906400", skill1: { name: "紅蓮の攻刃II" } }),
  },
  {
    id: 2,
    url: "https://game.granbluefantasy.jp/archive/weapon_detail?uid=private",
    status: 200,
    mimeType: "application/json",
    resourceType: "XHR",
    timestamp: 2_000,
    bodyEncoding: "text",
    body: JSON.stringify({ id: "1040709000", skill1: { name: "紅蓮の必殺" } }),
  },
  {
    id: 3,
    url: "https://game.granbluefantasy.jp/party/deck",
    status: 200,
    mimeType: "application/json",
    resourceType: "Fetch",
    timestamp: 3_000,
    bodyEncoding: "base64",
    body: "AAAA",
  },
];

test("registers three read-only recorder site tools", async () => {
  const tools = [];
  const state = { status: "ready" };
  const search = { records: [] };
  const record = { recordId: 1 };
  const registered = registerRecorderWebMcpTools({
    modelContext: { registerTool: (tool) => tools.push(tool) },
    getRecorderState: () => state,
    searchApiCalls: () => search,
    getApiCall: () => record,
  });

  assert.equal(registered, true);
  assert.deepEqual(tools.map((tool) => tool.name), [
    "get_recorder_state",
    "search_recorded_api_calls",
    "get_recorded_api_call",
  ]);
  for (const tool of tools) {
    assert.deepEqual(tool.annotations, {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    });
  }
  assert.equal(await tools[0].execute({}), state);
  assert.equal(await tools[1].execute({ urlContains: "weapon" }), search);
  assert.equal(await tools[2].execute({ recordId: 1 }), record);
});

test("does not register recorder tools without WebMCP", () => {
  assert.equal(registerRecorderWebMcpTools({
    modelContext: undefined,
    getRecorderState: () => undefined,
    searchApiCalls: () => undefined,
    getApiCall: () => undefined,
  }), false);
});

test("searches newest first without returning bodies or URL query data", () => {
  const result = searchRecordedApiCalls(records, { urlContains: "WEAPON_DETAIL", limit: 1 });
  assert.equal(result.totalMatches, 2);
  assert.equal(result.returned, 1);
  assert.equal(result.records[0].recordId, 2);
  assert.equal(result.records[0].url, "https://game.granbluefantasy.jp/archive/weapon_detail");
  assert.deepEqual(result.records[0].jsonTopLevelKeys, ["id", "skill1"]);
  assert.equal("body" in result.records[0], false);
  assert.throws(() => searchRecordedApiCalls(records, { urlContains: "" }), /urlContains/u);
  assert.throws(() => searchRecordedApiCalls(records, { urlContains: "deck", limit: 51 }), /limit/u);
});

test("returns one bounded text body and omits binary data", () => {
  const text = serializeRecordedApiCall(records[0], 20);
  assert.equal(text.body.length, 20);
  assert.equal(text.truncated, true);
  assert.equal(text.url, "https://game.granbluefantasy.jp/archive/weapon_detail");

  const binary = serializeRecordedApiCall(records[2]);
  assert.equal(binary.body, null);
  assert.match(binary.note, /バイナリ/u);
  assert.throws(() => serializeRecordedApiCall(undefined), /見つかりません/u);
});

test("recorder state exposes counts, filters, and read-only scope", () => {
  assert.deepEqual(createRecorderState({
    apiCalls: records,
    assets: [{}, {}],
    filters: ["weapon", "deck"],
  }), {
    status: "ready",
    counts: { apiCalls: 3, assets: 2 },
    currentUrlFilters: ["weapon", "deck"],
    webMcpScope: "recorded-api-calls-read-only",
  });
});
