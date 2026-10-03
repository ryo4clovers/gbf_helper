import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRecordedBattleExports } from "../src/calculator/recordedBattleParser.ts";

function capture(body: unknown, path: string, timestamp: number) {
  return { url: `https://game.granbluefantasy.jp${path}?user_id=private`, timestamp, body: JSON.stringify(body), id: "private-call" };
}
function start() {
  return {
    user_id: "private-account", raid_id: "private-raid", nickname: "private-name", turn: 1,
    player: { param: [{ name: "private-name", pid: "private-player", hpmax: 1000, hp: 1000 }] },
    boss: { param: [{ enemy_id: "9900011", name: { ja: "木人" }, hp: 5000, hpmax: 5000, attr: "5" }] },
  };
}
function attackResult() {
  return {
    duplicate_key: "private-key", status: { turn: 2 },
    scenario: [
      { cmd: "normal_attack_start", from: "player", num: 0 },
      { cmd: "attack", from: "player", pos: 0, damage: { "2": [
        { pos: 0, value: "100", hp: 4900, concurrent_attack_count: 0, color: "6" },
        { pos: 0, value: 20, hp: 4880, concurrent_attack_count: 1, color: "6" },
      ] } },
      { cmd: "normal_attack_end", from: "player", num: 0 },
      { cmd: "ability", pos: 0, name: "自動アビリティ" },
      { cmd: "loop_damage", to: "boss", list: [[{ pos: 0, value: 30, hp: 4850 }, { pos: 0, value: 40, hp: 4810 }]], total: [{ value: 70 }] },
      { cmd: "special", target: "boss", pos: 0, name: "奥義", list: [{ damage: [{ pos: 0, value: 50, hp: 4760 }] }], total: [{ value: 50 }] },
      { cmd: "attack", from: "boss", damage: [[{ value: 500, pos: 0, hp: 500 }]] },
      { cmd: "turn" },
      { cmd: "heal", to: "boss", list: [{ pos: 0, value: 240, hp: 5000 }] },
      { cmd: "damage", to: "boss", turn_end: true, list: [{ pos: 0, value: 10, hp: 4990 }] },
      { cmd: "turn_change", turn: 2 },
    ],
  };
}

test("counts nested hits once, reconciles woodman's healing, separates incoming damage, and redacts account fields", () => {
  const result = parseRecordedBattleExports([{ apiCalls: [
    capture(attackResult(), "/rest/raid/normal_attack_result.json", 20),
    capture(start(), "/rest/raid/start.json", 10),
  ] }]);
  assert.equal(result.summary.totalDamage, 250);
  assert.equal(result.summary.normalActionCount, 1);
  assert.equal(result.summary.hpMismatchCount, 0);
  assert.equal(result.turns[0].enemyHealing, 240);
  assert.deepEqual(result.turns[0].damageByKind, { normal: 120, charge: 50, ability: 70, "turn-end": 10 });
  assert.equal(result.turns[0].normalActions[0].hits, 1);
  assert.equal(result.turns[0].packets[1].concurrentAttackIndex, 1);
  assert.equal(result.actors[0].name, "主人公");
  assert.ok(!JSON.stringify(result).includes("private"));
});

test("deduplicates repeated results and reports a missing turn without inventing it", () => {
  const later = { ...attackResult(), scenario: [{ cmd: "turn_change", turn: 4 }] };
  const result = parseRecordedBattleExports([{ apiCalls: [
    capture(start(), "/rest/raid/start.json", 10),
    capture(attackResult(), "/rest/raid/normal_attack_result.json", 20),
    capture(attackResult(), "/rest/raid/normal_attack_result.json", 20),
    capture(later, "/rest/raid/normal_attack_result.json", 30),
  ] }]);
  assert.equal(result.summary.totalDamage, 250);
  assert.equal(result.summary.duplicateResultCount, 1);
  assert.deepEqual(result.turns.map((turn) => turn.turn), [1, 3]);
  assert.ok(result.warnings[0].includes("Turn gap"));
});

test("retains a legitimately repeated ability result at a later timestamp", () => {
  const ability = { scenario: [{ cmd: "damage", to: "boss", list: [{ value: 100, pos: 0 }] }] };
  const result = parseRecordedBattleExports([{ apiCalls: [
    capture(start(), "/rest/raid/start.json", 10),
    capture(ability, "/rest/raid/ability_result.json", 20),
    capture(ability, "/rest/raid/ability_result.json", 30),
  ] }]);
  assert.equal(result.summary.totalDamage, 200);
  assert.equal(result.summary.duplicateResultCount, 0);
});

test("rejects multiple battles and invalid amounts instead of silently combining them", () => {
  assert.throws(() => parseRecordedBattleExports([{ apiCalls: [] }]), /Exactly one/);
  const broken = { scenario: [{ cmd: "damage", to: "boss", list: [{ value: -1 }] }] };
  assert.throws(() => parseRecordedBattleExports([{ apiCalls: [
    capture(start(), "/rest/raid/start.json", 10), capture(broken, "/rest/raid/normal_attack_result.json", 20),
  ] }]), /non-negative safe integer/);
});

test("imports the latest matching job LB allocation before battle start, ignoring later and other-job lists", () => {
  const deck={deck:{npc:{},pc:{param:{attack:1000,hp:1000,attribute:6},weapons:{},summons:{},sub_summons:{},
    job:{master:{id:"190501",weapon1:3,weapon2:4},param:{level:50}},
  }}};
  const lb=(level:number)=>({user_id:"private",bonus_list:[{id:"118",current_level:level,name:"private"}]});
  const result=parseRecordedBattleExports([{apiCalls:[
    capture(deck,"/party/deck",1), capture(lb(0),"/zenith/bonus_list/190501",2),
    capture(lb(1),"/zenith/bonus_list/190501",8), capture(lb(3),"/zenith/bonus_list/100401",9),
    capture(start(),"/rest/raid/start.json",10), capture(lb(2),"/zenith/bonus_list/190501",12),
  ]}]);
  assert.equal(result.protagonistLimitBonusesImported,true);
  assert.equal(result.deckConfig?.protagonist.otherLimitBonusLevels?.["118"],1);
  assert.ok(!JSON.stringify(result).includes("private"));
});

test("imports only pre-battle character LB allocations by master ID and preserves type without inventing awakening Lv", () => {
  const deck = { deck: { npc: { "1": { master: { id: "3040512000", name: "シンダラ", attribute: "6" },
    param: { id: "private-instance", level: 80, attack: 1_000, hp: 1_000, npc_arousal_form: 4, has_npcaugment_constant: false } } },
    pc: { param: { attack: 1_000, hp: 1_000, attribute: 6 }, weapons: {}, summons: {}, sub_summons: {} } } };
  const lb = (level: number) => ({ user_id: "private", bonus_list: [{ name: "渾身", current_level: level }] });
  const parsed = parseRecordedBattleExports([{ apiCalls: [capture(deck, "/party/deck", 1),
    capture(lb(1), "/npczenith/bonus_list/3040512000", 2), capture(lb(3), "/npczenith/bonus_list/3040512000", 8),
    capture(start(), "/rest/raid/start.json", 10), capture(lb(0), "/npczenith/bonus_list/3040512000", 12) ] }]);
  assert.deepEqual(parsed.characterLimitBonusesImported, [1]);
  assert.equal(parsed.deckConfig?.characters[0].limitBonuses?.staminaLevel, 3);
  assert.deepEqual(parsed.deckConfig?.characters[0].awakening, { formCode: "4" });
  assert.equal(parsed.deckConfig?.characters[0].perpetuityRing, false);
  assert.ok(!JSON.stringify(parsed).includes("private"));
});
