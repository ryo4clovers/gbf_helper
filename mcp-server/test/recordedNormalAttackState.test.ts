import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRecordedBattleExports } from "../src/calculator/recordedBattleParser.ts";
import { reconstructRecordedNormalAttackStates } from "../src/calculator/recordedNormalAttackState.ts";
import { compareRecordedNormalAttackStates } from "../src/calculator/recordedNormalAttackComparison.ts";
import type { CalculatorDeckConfig } from "../src/calculator/types.ts";

const CIDALA = "3040512000";
const SARIEL = "3040611000";
const deck: CalculatorDeckConfig = {
  schemaVersion: 1, format: "gbf-helper-calculator-deck",
  protagonist: { jobId: "190501", jobLevel: 50, elementCode: "6", attackOverride: 80_000, hpOverride: 1_000 },
  weapons: [{ slot: 1, position: "main", weaponId: "1040315100", level: 250, skillLevel: 1 }],
  summons: [], characters: [
    { slot: 1, position: "front", characterId: CIDALA },
    { slot: 2, position: "front", characterId: SARIEL },
  ],
};
function capture(body: unknown, path: string, timestamp: number) {
  return { url: `https://offline.invalid/rest/raid/${path}.json?user_id=private`, timestamp, body };
}
function normal(value = 100, echo = 0) {
  return [
    { cmd: "normal_attack_start", from: "player", num: 0 },
    { cmd: "attack", from: "player", pos: 0, damage: [[{ pos: 0, value, concurrent_attack_count: 0, color: "6" },
      ...(echo > 0 ? [{ pos: 0, value: echo, concurrent_attack_count: 1, color: "6" }] : [])]] },
    { cmd: "normal_attack_end", from: "player", num: 0 },
  ];
}
function enemyCondition(debuff: unknown) {
  return { cmd: "condition", to: "boss", pos: 0, condition: { debuff } };
}
const cidalaStatuses = [{ status: "1427" }, { status: "7839" }];
function cidalaApplication() {
  return [{ cmd: "ability", pos: 1, name: "菓製猛虎" }, enemyCondition(cidalaStatuses), enemyCondition(cidalaStatuses)];
}
function result(turn: number, scenario: unknown[], timestamp: number) {
  return capture({ scenario: [...scenario, { cmd: "turn_change", turn: turn + 1 }] }, "normal_attack_result", timestamp);
}
function observation(results: ReturnType<typeof capture>[], initialEnemyConditions: unknown = {}) {
  const parsed = parseRecordedBattleExports([{ apiCalls: [capture({ turn: 1,
    user_id: "private", player: { param: [
      { pid: "private", name: "private", hp: 1000, hpmax: 1000, condition: { buff: [{ status: "6523_3" }] } },
      { pid: CIDALA }, { pid: SARIEL },
    ] }, boss: { param: [{ enemy_id: "9900011", attr: "5", hp: 10_000_000, hpmax: 10_000_000, condition: initialEnemyConditions }] },
  }, "start", 0), ...results] }]);
  parsed.deckConfig = structuredClone(deck);
  return parsed;
}

test("keeps only status identifiers and numeric expiry, preserving sparse snapshots and their ordering", () => {
  const parsed = observation([result(1, [
    enemyCondition({ "2": [{ status: "6058_24", personal_status: "6058_2", personal_debuff_end_turn: "6",
      user_id: "private", personal_debuff_user_id: "private", value: 999, comment: "private" },
    { status: "1427", personal_debuff_end_turn: false }, { status: "private" }] }),
    { cmd: "condition", to: "boss", pos: 0, condition: { buff: [] } }, ...normal(),
  ], 100)]);
  assert.deepEqual(parsed.turns[0].conditionEvents[0].effects, [
    { kind: "debuff", statusId: "6058_24", personalStatusId: "6058_2", expiresBeforeTurn: 6 },
    { kind: "debuff", statusId: "1427", personalStatusId: undefined, expiresBeforeTurn: undefined },
  ]);
  assert.deepEqual(parsed.turns[0].conditionEvents[1].kinds, ["buff"]);
  assert.equal(parsed.turns[0].normalActions[0].elapsedMilliseconds, 100);
  assert.equal(parsed.turns[0].packets[0].normalActionIndex, 0);
  assert.ok(!JSON.stringify(parsed).includes("private"));
});

test("applies only preceding reactions, caps six Cidala stacks, and expires effects before the next attack", () => {
  const parsed = observation([
    result(1, [...normal(), ...cidalaApplication(), ...cidalaApplication(),
      { cmd: "ability", pos: 2, name: "エクスキューショナーズ・サイズ" },
      enemyCondition([...cidalaStatuses, { status: "6058_24", personal_status: "6058_2", personal_debuff_end_turn: 6 }]),
    ], 10_000),
    result(2, [...normal(), ...cidalaApplication(), ...cidalaApplication()], 20_000),
    result(3, [...normal(), ...cidalaApplication(), ...cidalaApplication()], 30_000),
    result(4, [...normal()], 40_000), result(5, [...normal()], 209_999),
    result(6, [...normal()], 210_000),
    // Existing icons can remain in the last snapshot even though real-time expiry passed.
    result(7, [...cidalaApplication(), ...normal()], 210_001),
  ]);
  // Retain Death Sentence in subsequent full debuff snapshots until its turn expiry.
  for (const turn of parsed.turns.slice(1, 3)) for (const event of turn.conditionEvents) {
    event.effects.push({ kind: "debuff", statusId: "6058_23", personalStatusId: "6058_2", expiresBeforeTurn: 6 });
  }
  const states = reconstructRecordedNormalAttackStates(parsed, 3);
  assert.deepEqual(states.map(s => s.battleEffects.enemyDefenseDownPercent), [0, 20, 40, 40, 40, 0, 10]);
  assert.deepEqual(states.map(s => s.battleEffects.enemySupplementalDamage), [0, 6_000, 12_000, 18_000, 18_000, 0, 3_000]);
  assert.deepEqual(states.map(s => s.deathSentenceActive), [false, true, true, true, true, false, false]);
  assert.equal(states[1].battleEffects.supportSkillSupplementalDamage, 30_000);
  assert.equal(states[5].battleEffects.supportSkillSupplementalDamage, 0);
  assert.equal(states[3].cidala.supplementalExpiresAtMilliseconds, 210_000);
});

test("does not clear enemy debuffs on a buff-only snapshot and refreshes Sariel's turn expiry once per application", () => {
  const parsed = observation([
    result(1, [{ cmd: "ability", pos: 2, name: "エクスキューショナーズ・サイズ" },
      enemyCondition([{ status: "6058_24", personal_debuff_end_turn: 6 }]), ...normal()], 100),
    result(4, [{ cmd: "ability", pos: 2, name: "エクスキューショナーズ・サイズ" },
      enemyCondition([{ status: "6058_24" }]),
      { cmd: "condition", to: "boss", pos: 0, condition: { buff: [] } }, ...normal()], 200),
    result(6, [...normal()], 300), result(9, [...normal()], 400),
  ]);
  assert.deepEqual(reconstructRecordedNormalAttackStates(parsed, 3).map(s => s.deathSentenceActive), [true, true, true, false]);
});

test("never treats an icon suffix as supplemental damage or infers unrecorded cumulative stacks", () => {
  const parsed = observation([result(1, normal(), 100)], { debuff: [
    ...cidalaStatuses, { status: "6058_21", personal_status: "6058_2", personal_debuff_end_turn: 6 },
  ] });
  const [state] = reconstructRecordedNormalAttackStates(parsed, 3);
  assert.equal(state.battleEffects.enemySupplementalDamage, 0);
  assert.equal(state.battleEffects.enemyDefenseDownPercent, 0);
  assert.equal(state.battleEffects.supportSkillSupplementalDamage, 30_000);
  assert.ok(state.warnings.some(w => w.includes("Initial stack counts")));
});

test("counts one multi-hit charge, all positive normal/echo/ability packets, and owned turn-end reactions", () => {
  const damage = (count: number) => Array.from({ length: count }, () => ({ pos: 0, value: 1 }));
  const parsed = observation([
    result(1, [
      { cmd: "special", target: "boss", pos: 0, list: [{ damage: damage(12) }] },
      ...normal(100, 20), { cmd: "ability", pos: 0, name: "reaction" },
      { cmd: "loop_damage", to: "boss", list: damage(17) },
      { cmd: "damage", to: "boss", list: [{ pos: 0, value: 0 }] },
      { cmd: "attack", from: "boss", damage: [[{ pos: 0, value: 600, hp: 400 }]] },
      { cmd: "turn" }, { cmd: "ability", pos: 0, name: "turn-end reaction" },
      { cmd: "loop_damage", to: "boss", list: damage(20) },
      { cmd: "heal", to: "player", list: [{ pos: 0, value: 600, hp: 1000 }] },
    ], 100),
    result(2, [{ cmd: "condition", to: "player", pos: 0, condition: { buff: [{ status: "6523_4" }] } },
      ...normal(), ...normal()], 200),
  ]);
  const states = reconstructRecordedNormalAttackStates(parsed, 3);
  assert.deepEqual(states.map(s => s.countedProtagonistHits), [1, 40, 41]);
  assert.deepEqual(states.map(s => s.mythicalLancerLevel), [3, 4, 4]);
  assert.deepEqual(states.map(s => s.predictedMythicalLancerLevel), [3, 4, 4]);
  assert.deepEqual(states.map(s => s.protagonistCurrentHpPercent), [100, 100, 100]);
  assert.equal(parsed.turns[0].packets.find(p => p.kind === "turn-end")?.sourceActorPosition, 0);
  assert.equal(parsed.turns[0].packets.find(p => p.kind === "turn-end")?.actorPosition, undefined);
});

test("uses the last preceding HP update for each attack and never takes HP from a later reaction", () => {
  const parsed = observation([result(1, [
    { cmd: "attack", from: "boss", damage: [[{ pos: 0, value: 600, hp: 400 }]] },
    ...normal(), { cmd: "heal", to: "player", list: [{ pos: 0, value: 600, hp: 1000 }] }, ...normal(),
  ], 100)]);
  assert.deepEqual(reconstructRecordedNormalAttackStates(parsed, 3).map(s => s.protagonistCurrentHpPercent), [40, 100]);
});

test("prefers the recorded pre-attack level and exposes a disagreement with the provisional counter", () => {
  const parsed = observation([result(1, [
    { cmd: "condition", to: "player", pos: 0, condition: { buff: [{ status: "6523_5" }] } }, ...normal(),
  ], 100)]);
  const [state] = reconstructRecordedNormalAttackStates(parsed, 3);
  assert.equal(state.mythicalLancerLevel, 5);
  assert.equal(state.predictedMythicalLancerLevel, 3);
  assert.equal(state.levelSource, "recorded-status");
  assert.ok(state.warnings.some(w => w.includes("differs")));
});

test("compares repeated MC actions separately and keeps predictions independent of observed damage values", () => {
  const parsed = observation([result(1, [...normal(100), ...cidalaApplication(), ...normal(200)], 100)]);
  const states = reconstructRecordedNormalAttackStates(parsed, 3);
  const request = { schemaVersion: 1 as const, deckConfig: deck, enemy: { elementCode: "5" as const, defense: 10, maxHp: 10_000_000 } };
  const comparison = compareRecordedNormalAttackStates(request, parsed, states);
  assert.deepEqual(comparison.states.map(s => s.comparison.observations.length), [1, 1]);
  assert.deepEqual(comparison.states.map(s => s.comparison.observations[0].observedDamage), [100, 200]);
  assert.notEqual(comparison.states[0].effectiveEnemyDefense, comparison.states[1].effectiveEnemyDefense);
  const changed = structuredClone(parsed);
  for (const turn of changed.turns) for (const packet of turn.packets) if (packet.value > 0) packet.value += 123;
  const changedStates = reconstructRecordedNormalAttackStates(changed, 3);
  assert.deepEqual(changedStates, states);
  const changedComparison = compareRecordedNormalAttackStates(request, changed, changedStates);
  assert.deepEqual(changedComparison.states.map(s => s.predictions), comparison.states.map(s => s.predictions));
  assert.notDeepEqual(changedComparison.observations, comparison.observations);
  const forced = compareRecordedNormalAttackStates({ ...request, mythicalLancerLevel: 5 }, parsed, states);
  assert.ok(forced.states.every(s => s.appliedMythicalLancerLevel === 5));
});
