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
const otherSelfWindow = { cmd: "windoweffect", name: "他化自在", kind: "ab_all_2040448000_01_hit2" };

test("Other Self starts only after its recorded application, survives buff-only snapshots, and expires next turn", () => {
  const parsed = observation([
    result(1, [...normal(), { cmd: "ability", pos: 0, name: "" }, otherSelfWindow,
      enemyCondition([{ status: "7368_1" }]),
      { cmd: "condition", to: "boss", pos: 0, condition: { buff: [] } }, ...normal(), ...normal()], 100),
    // The last snapshot still has the icon, but it must not extend the duration.
    result(2, normal(), 200),
    result(3, [{ cmd: "ability", pos: 0 }, otherSelfWindow, enemyCondition([{ status: "7368_1" }]),
      ...normal(), enemyCondition([]), ...normal()], 300),
  ]);
  assert.equal(parsed.turns[0].abilityActivations[1].sourceSummonId, "2040448000");
  const states = reconstructRecordedNormalAttackStates(parsed, 3);
  assert.deepEqual(states.map(s => s.battleEffects.enemyDamageTakenAmplificationPercent), [0, 20, 20, 0, 20, 0]);
  // Damage observations are never consulted to choose the strength or timing.
  for (const turn of parsed.turns) for (const packet of turn.packets) packet.value *= 99;
  assert.deepEqual(reconstructRecordedNormalAttackStates(parsed, 3).map(s => s.battleEffects), states.map(s => s.battleEffects));
});

test("shared icons, unrelated window effects and unconfirmed Other Self applications do not imply amplification", () => {
  const parsed = observation([result(1, [
    ...normal(), { cmd: "ability", pos: 1 }, otherSelfWindow, enemyCondition([{ status: "7368_1" }]), ...normal(),
    { cmd: "ability", pos: 0 }, { ...otherSelfWindow, kind: "unrelated" }, enemyCondition([{ status: "7368_1" }]), ...normal(),
    { cmd: "ability", pos: 0 }, otherSelfWindow, enemyCondition([]), ...normal(),
    // A later icon must not resurrect a failed/cleared application after an attack.
    enemyCondition([{ status: "7368_1" }]), ...normal(),
  ], 100)], { debuff: [{ status: "7368_1" }] });
  const states = reconstructRecordedNormalAttackStates(parsed, 3);
  assert.ok(states.every(s => s.battleEffects.enemyDamageTakenAmplificationPercent === 0));
  assert.ok(states[0].warnings.some(w => w.includes("Unmapped DMG Taken Amplified")));
  assert.equal(parsed.turns[0].abilityActivations.filter(a => a.sourceSummonId).length, 1);
});

test("an unconfirmed Other Self marker cannot leak into a later turn or another enemy", () => {
  const parsed = observation([
    result(1, [{ cmd: "ability", pos: 0 }, otherSelfWindow,
      { ...enemyCondition([{ status: "7368_1" }]), pos: 1 }, ...normal(),
      { cmd: "ability", pos: 0 }, otherSelfWindow], 100),
    result(2, [enemyCondition([{ status: "7368_1" }]), ...normal()], 200),
  ]);
  assert.deepEqual(reconstructRecordedNormalAttackStates(parsed, 3).map(s => s.battleEffects.enemyDamageTakenAmplificationPercent), [0, 0]);
});

test("Ereshkigal charge buff applies only to subsequent allies in that turn and start buffs expire after turn one", () => {
  const allyNormal = [{ cmd: "normal_attack_start", from: "player", num: 1 },
    { cmd: "attack", from: "player", pos: 1, damage: [[{ pos: 0, value: 100, color: "6" }]] },
    { cmd: "normal_attack_end", from: "player", num: 1 }];
  const parsed = observation([result(1, [...allyNormal,
    { cmd: "special", target: "boss", pos: 0, list: [{ pos: 0, value: 100 }] }, ...allyNormal], 100),
    result(2, allyNormal, 200)]);
  parsed.initialConditions.push({ sequence: -1, resultIndex: -1, elapsedMilliseconds: 0,
    targetSide: "party", targetPosition: 1, kinds: ["buff"], effects: [
      { kind: "buff", statusId: "1001" }, { kind: "buff", statusId: "1469" },
    ] });
  const states = reconstructRecordedNormalAttackStates(parsed, 3, [1]);
  assert.deepEqual(states.map(s => s.battleEffects.normalAttackSupplementalDamage), [undefined, 50_000, undefined]);
  assert.deepEqual(states.map(s => s.artifactStartBuffs), [
    { attackUp: true, damageCapUp: true }, { attackUp: true, damageCapUp: true }, { attackUp: false, damageCapUp: false },
  ]);
  parsed.deckConfig!.weapons[0].level = 199;
  parsed.deckConfig!.weapons[0].uncapLevel = 5;
  assert.ok(reconstructRecordedNormalAttackStates(parsed, 3, [1]).every(s => s.battleEffects.normalAttackSupplementalDamage === undefined));
  parsed.deckConfig!.weapons[0].level = 200;
  assert.equal(reconstructRecordedNormalAttackStates(parsed, 3, [1])[1].battleEffects.normalAttackSupplementalDamage, 50_000);
  parsed.deckConfig!.weapons[0].weaponId = "1040000000";
  assert.ok(reconstructRecordedNormalAttackStates(parsed, 3, [1]).every(s => s.battleEffects.normalAttackSupplementalDamage === undefined));
});
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

test("enemy specials update actual HP before later attacks, including sub-one-percent HP and recovery", () => {
  const parsed = observation([
    result(1, [...normal(), { cmd: "super", target: "player", name: "合成特殊技", total: 995,
      list: [{ damage: [{ pos: 0, value: 995, hp: 5 }] }] }], 100),
    result(2, [...normal(), { cmd: "heal", to: "player", list: [{ pos: 0, value: 500, hp: 505 }] },
      ...normal(), { cmd: "super", target: "player", name: "合成バリア併用", total: 1000,
        list: [{ damage: [{ pos: 0, value: 1000, hp: 500 }] }] }, ...normal()], 200),
  ]);
  const states = reconstructRecordedNormalAttackStates(parsed, 3);
  assert.deepEqual(states.map(s => s.protagonistCurrentHpPercent), [100, .5, 50.5, 50]);
  // Authoritative HP, rather than subtraction of displayed damage, also handles barriers.
  assert.deepEqual(states.map(s => s.countedProtagonistHits), [0, 1, 2, 3]);
  assert.equal(parsed.summary.totalDamage, 400);
  const special = parsed.turns[0].packets.find(p => p.targetSide === "party")!;
  assert.equal(special.hpAfter, 5);
  assert.equal(special.actionName, "合成特殊技");
  assert.equal(special.actorPosition, undefined);
});

test("character states follow reaction order, HP updates and Cidala buff removal without future state leakage", () => {
  const normalBy = (actor: number) => normal().map(command => ({ ...command,
    ...(command.cmd === "attack" ? { pos: actor } : { num: actor }) }));
  const parsed = observation([result(1, [
    { cmd: "condition", to: "player", pos: 1, condition: { buff: [{ status: "3267" }] } },
    ...normalBy(1), ...cidalaApplication(),
    ...normalBy(2),
    { cmd: "attack", from: "boss", damage: [[{ pos: 1, value: 500, hp: 500 }]] },
    { cmd: "condition", to: "player", pos: 1, condition: { buff: [] } },
    ...normalBy(1),
  ], 100)]);
  parsed.actors[1].initialHp = 1_000;
  parsed.actors[1].maxHp = 1_000;
  const states = reconstructRecordedNormalAttackStates(parsed, 3, [1, 2]);
  assert.deepEqual(states.map(state => state.actorPosition), [1, 2, 1]);
  assert.deepEqual(states.map(state => state.battleEffects.enemyDefenseDownPercent), [0, 10, 10]);
  assert.deepEqual(states.filter(state => state.actorPosition === 1).map(state => state.coupledConfectionActive), [true, false]);
  assert.deepEqual(states.filter(state => state.actorPosition === 1).map(state => state.characterCurrentHpPercent), [100, 50]);
  assert.equal(reconstructRecordedNormalAttackStates(parsed, 3).length, 0);
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

test("aggregates rounding diagnostics by attack state without replacing the existing comparison", () => {
  const parsed = observation([result(1, [...normal(), ...cidalaApplication(), ...normal()], 100), result(2, normal(), 200)]);
  // Include Doombringer Lyre's destruction echo and enough normal boost for the supported grid effects.
  const requestDeck = structuredClone(deck);
  requestDeck.summons = [{ slot: 1, position: "main", summonId: "2040090000", uncapLevel: 6 }];
  requestDeck.weapons.push({ slot: 2, position: "grid", weaponId: "1040916700", level: 150, skillLevel: 15 },
    { slot: 3, position: "grid", weaponId: "1040916700", level: 150, skillLevel: 15 },
    { slot: 4, position: "grid", weaponId: "1040817900", level: 200, skillLevel: 1 });
  const states = reconstructRecordedNormalAttackStates(parsed, 3);
  const request = { schemaVersion: 1 as const, deckConfig: requestDeck, supportSummon: { summonId: "2040090000" },
    enemy: { elementCode: "5" as const, defense: 10 } };
  const original = compareRecordedNormalAttackStates(request, parsed, states);
  const diagnosed = compareRecordedNormalAttackStates(request, parsed, states, { compareDestructionPursuitRounding: true });
  assert.deepEqual(diagnosed.components, original.components);
  assert.deepEqual(diagnosed.observations, original.observations);
  assert.equal(diagnosed.destructionRoundingComparison!.candidates.length, 4);
  assert.ok(diagnosed.destructionRoundingComparison!.pairwise.every(pair => pair.stateCount === 3
    && pair.comparedMultiplierCount === 303));
  // This recording has no destruction packets; zero observations must not be described as successful validation.
  assert.ok(diagnosed.destructionRoundingComparison!.candidates.every(candidate => candidate.components.length === 0));
});
