import { test } from "node:test";
import assert from "node:assert/strict";
import { importCharacterEnhancementExports } from "../src/calculator/characterEnhancementImport.ts";
const call = (body: unknown, path = "/npc/npc/999", timestamp = 1) => ({ url: `https://offline.invalid${path}`, timestamp, body });
const detail = { master: { id: "3040512000" }, id: "owned-private", user: { id: "account-private" },
  param: { attack: 999, hp: 888 }, npc_arousal_level: 9, npc_arousal_form: 4, has_npcaugment_constant: false,
  artifact: { id: "artifact-private", skill3_info: { skill_id: 30231, name: "HPが100%の時、与ダメージUP", effect_value: "+2.2%" } } };

test("detail import keeps only master effects, without replacing displayed stats or copying owned identifiers", () => {
  const [setting] = importCharacterEnhancementExports([{ apiCalls: [call(JSON.stringify(detail))] }]);
  assert.deepEqual(setting, { characterId: "3040512000", awakening: { level: 9, formCode: "4" }, perpetuityRing: false,
    artifact: { skills: [{ skillId: "30231", name: "HPが100%の時、与ダメージUP", effectValue: "+2.2%" }] } });
  assert.ok(!JSON.stringify(setting).includes("private"));
});

test("latest chronological detail wins and LB uses the public master ID rather than the owned ID", () => {
  const settings = importCharacterEnhancementExports([{ apiCalls: [call({ ...detail, npc_arousal_level: 10 }, undefined, 3),
    call(detail, undefined, 1), call({ bonus_list: [{ name: "渾身", current_level: 2 }] }, "/npczenith/bonus_list/3040512000", 2)] }]);
  assert.equal(settings[0].awakening?.level, 10);
  assert.equal(settings[0].limitBonuses?.staminaLevel, 2);
});

test("known absence of an artifact is distinct from missing details; malformed skill metadata is rejected", () => {
  assert.deepEqual(importCharacterEnhancementExports([{ apiCalls: [call({ ...detail, artifact: [] })] }])[0].artifact, { skills: [] });
  const noArtifact = structuredClone(detail) as Partial<typeof detail>;
  delete noArtifact.artifact;
  assert.equal(importCharacterEnhancementExports([{ apiCalls: [call(noArtifact)] }])[0].artifact, undefined);
  assert.throws(() => importCharacterEnhancementExports([{ apiCalls: [call({ ...detail, artifact: { skill1_info: { name: "bad" } } })] }]));
});

const masteryContent = { data: encodeURIComponent('<input value="3040512000" type="hidden" id="id-of-npc-master">'),
  option: { npcaugment: { param_data: [
    { slot_number: 1, type: { id: "10001", name: "攻撃力" }, param: { total_param: "600", disp_total_param: "+600" } },
    { slot_number: 2, type: { id: "20005", name: "アビリティダメージ上限" }, param: { total_param: "6", disp_total_param: "+6%" } },
    { slot_number: 4, type: { id: "160002", name: "渾身" }, param: { total_param: "5", disp_total_param: "+5" } },
  ], hold_data: [{ user_id: "private", value: 99999 }], item: { private: { number: 99999 } } } } };

test("full exports ignore CSS and unrelated responses; current ring and earring effects merge with later details", () => {
  const [setting] = importCharacterEnhancementExports([{ apiCalls: [
    call("@charset not JSON", "/assets/123/zenith/index.css"),
    call("private not JSON", "/party/candidate_npc/1"),
    call(masteryContent, "/npczenith/content/index/123", 1), call(detail, undefined, 2),
  ] }]);
  assert.equal(setting.awakening?.level, 9);
  assert.equal(setting.mastery?.ring.length, 2);
  assert.deepEqual(setting.mastery?.earring, [{ bonusId: "160002", name: "渾身", value: 5, unit: "rating" }]);
  assert.equal(setting.mastery?.ring[1].unit, "percent");
  assert.ok(!JSON.stringify(setting).includes("private"));
});

test("empty applied effects are known absence and pending rolls never count as equipped bonuses", () => {
  const empty = structuredClone(masteryContent);
  empty.option.npcaugment.param_data = [];
  const [setting] = importCharacterEnhancementExports([{ apiCalls: [call(empty, "/npczenith/content/index/123")] }]);
  assert.deepEqual(setting.mastery, { ring: [], earring: [] });
});

test("mastery content requires a public master ID, valid slots and finite effect values", () => {
  const badId = { ...masteryContent, data: encodeURIComponent('<input id="id-of-npc-master" value="private">') };
  assert.throws(() => importCharacterEnhancementExports([{ apiCalls: [call(badId, "/npczenith/content/index/123")] }]), /master ID/);
  const badSlot = structuredClone(masteryContent);
  badSlot.option.npcaugment.param_data[0].slot_number = 5;
  assert.throws(() => importCharacterEnhancementExports([{ apiCalls: [call(badSlot, "/npczenith/content/index/123")] }]), /mastery slot/);
  const badValue = structuredClone(masteryContent);
  badValue.option.npcaugment.param_data[0].param.total_param = "Infinity";
  assert.throws(() => importCharacterEnhancementExports([{ apiCalls: [call(badValue, "/npczenith/content/index/123")] }]));
});
