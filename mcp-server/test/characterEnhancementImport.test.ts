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
