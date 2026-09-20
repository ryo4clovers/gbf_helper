import assert from "node:assert/strict";
import test from "node:test";
import {
  createRecorderState,
  findRecordedWeaponSkills,
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
    body: JSON.stringify({
      master: { id: "1040906400", name: "イクサバ" },
      skill1: { skill_id: "626", name: "紅蓮の攻刃III", comment: "火属性キャラの攻撃力上昇(特大)" },
      skill2: { skill_id: "914", name: "業火の渾身", level: { release_level: "150" } },
    }),
  },
  {
    id: 2,
    url: "https://game.granbluefantasy.jp/archive/weapon_detail?uid=private",
    status: 200,
    mimeType: "application/json",
    resourceType: "XHR",
    timestamp: 2_000,
    bodyEncoding: "text",
    body: JSON.stringify({
      pc: {
        weapons: {
          1: {
            master: { id: "1040906400", name: "イクサバ" },
            skill1: { id: "626", name: "紅蓮の攻刃III", description: "火属性キャラの攻撃力上昇(特大)" },
            skill2: { id: "914", name: "業火の渾身" },
          },
          2: {
            master: { id: "1040906400", name: "イクサバ" },
            skill1: { id: "626", name: "紅蓮の攻刃III", description: "火属性キャラの攻撃力上昇(特大)" },
            skill2: { id: "914", name: "業火の渾身" },
          },
        },
      },
    }),
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

test("registers four read-only recorder site tools", async () => {
  const tools = [];
  const state = { status: "ready" };
  const search = { records: [] };
  const record = { recordId: 1 };
  const weaponSkills = { weaponId: "1040906400" };
  const registered = registerRecorderWebMcpTools({
    modelContext: { registerTool: (tool) => tools.push(tool) },
    getRecorderState: () => state,
    searchApiCalls: () => search,
    getApiCall: () => record,
    findWeaponSkills: () => weaponSkills,
  });

  assert.equal(registered, true);
  assert.deepEqual(tools.map((tool) => tool.name), [
    "get_recorder_state",
    "search_recorded_api_calls",
    "get_recorded_api_call",
    "find_recorded_weapon_skills",
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
  assert.equal(await tools[3].execute({ weaponId: "1040906400" }), weaponSkills);
});

test("does not register recorder tools without WebMCP", () => {
  assert.equal(registerRecorderWebMcpTools({
    modelContext: undefined,
    getRecorderState: () => undefined,
    searchApiCalls: () => undefined,
    getApiCall: () => undefined,
    findWeaponSkills: () => undefined,
  }), false);
});

test("extracts only weapon skill fields from detail and party deck responses", () => {
  const result = findRecordedWeaponSkills(records, { weaponId: "1040906400" });
  assert.equal(result.totalMatches, 2);
  assert.equal(result.matches[0].recordId, 2);
  assert.deepEqual(result.matches[0].skills.map((skill) => skill.skillId), ["626", "914"]);
  assert.equal(result.matches[0].skills[0].description, "火属性キャラの攻撃力上昇(特大)");
  assert.equal(result.matches[0].occurrenceCount, 2);
  assert.equal(result.matches[1].recordId, 1);
  assert.equal(result.matches[1].occurrenceCount, 1);
  assert.equal(result.matches[1].skills[1].releaseLevel, "150");
  assert.equal("body" in result.matches[0], false);
  assert.throws(() => findRecordedWeaponSkills(records, { weaponId: "104" }), /10桁/u);
});

test("searches newest first without returning bodies or URL query data", () => {
  const result = searchRecordedApiCalls(records, { urlContains: "WEAPON_DETAIL", limit: 1 });
  assert.equal(result.totalMatches, 2);
  assert.equal(result.returned, 1);
  assert.equal(result.records[0].recordId, 2);
  assert.equal(result.records[0].url, "https://game.granbluefantasy.jp/archive/weapon_detail");
  assert.deepEqual(result.records[0].jsonTopLevelKeys, ["pc"]);
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
