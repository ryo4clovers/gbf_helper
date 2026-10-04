import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialBattleState, applyGeneratedTurn } from "../web/battle-state.js";
import { buildBattleTurnRequest, automaticAbilityPackets } from "../web/battle-turn-client.js";

const setup = { enemyMaxHp: 1000, request: { schemaVersion: 1, attacker: { characterSlot: 3 }, battleEffects: { enemyDefenseDownPercent: 50 },
  deckConfig: { protagonist: { elementCode: "6", hpOverride: 100 }, weapons: [], summons: [],
    characters: [{ characterId: "ilsa", nameHint: "イルザ", slot: 3, position: "front", hpOverride: 200 }] },
  enemy: { elementCode: "5", defense: 10 } } };

test("turn request uses actual HP, sparse formation slots and resumed effects, not the single-hit selection", () => {
  const state = createInitialBattleState(setup); state.party[1].hp = 100;
  const request = buildBattleTurnRequest(setup, state, "downside", { secondsPerTurn: 15, characters: {} });
  assert.equal(request.calculation.attacker, undefined);
  assert.equal(request.calculation.battleEffects, undefined);
  assert.equal(request.calculation.enemy.maxHp, 1000);
  assert.deepEqual(request.characters, [{ characterSlot: 3, currentHpPercent: 50 }]);
  state.party[0].hp = 0;
  assert.deepEqual(buildBattleTurnRequest(setup, state, "downside", { characters: {} }).defeatedPositions, [0]);
});

test("party packets stop at victory and do not apply later effects or retaliation", () => {
  const initial = createInitialBattleState(setup); initial.enemy.attacks = true;
  const generated = { warnings: ["下書き"], turn: 1, elapsedSeconds: 0, endState: { turn: 2 } };
  const next = applyGeneratedTurn(initial, generated, [
    { actorPosition: 0, kind: "damage", damage: 900 },
    { actorPosition: 3, kind: "automatic-ability", damage: 200 },
    { actorPosition: 0, kind: "effect", effect: "charge-ready", value: 100 },
    { actorPosition: 3, kind: "damage", damage: 200 },
  ], { enemyAttack: { damage: 100 } });
  assert.equal(initial.enemy.hp, 1000);
  assert.equal(next.enemy.hp, 0);
  assert.deepEqual(next.events.map((event) => event.actor), ["イルザ", "主人公"]);
  assert.equal(next.party[0].hp, 100);
  assert.equal(next.party[0].charge, initial.party[0].charge);
  assert.equal(next.actionState, undefined);
});

test("state snapshots restore reaction progress together with HP for undo and reset", () => {
  const initial = createInitialBattleState(setup), history = [structuredClone(initial)];
  const generated = { turn: 1, elapsedSeconds: 0, warnings: [], endState: { turn: 2, chocolateStacks: 1, chocolateExpiresAt: 180, deathSentenceExpiresOnTurn: 6 } };
  const next = applyGeneratedTurn(initial, generated, [{ actorPosition: 3, kind: "damage", damage: 100 }]);
  assert.deepEqual(next.actionState, generated.endState);
  assert.equal(next.enemy.debuffs.length, 2);
  assert.deepEqual(history.pop(), initial);
});

test("automatic-ability mode selection uses independent per-hit predictions", () => {
  const event = { hitCount: 2, name: "候補", actorPosition: 3, damage: { predictions: [{ damage: 10 }, { damage: 20 }] } };
  let calls = 0;
  assert.deepEqual(automaticAbilityPackets(event, "normal", () => calls++ ? .9 : 0).map((packet) => packet.damage), [10, 20]);
  assert.deepEqual(automaticAbilityPackets(event, "downside").map((packet) => packet.damage), [10, 10]);
  assert.throws(() => automaticAbilityPackets({ ...event, damage: null }, "normal"), /未計算/);
});

test("weapon critical rolls independently per skill hit, and comparison modes choose both damage and critical", () => {
  const event = { hitCount: 2, name: "武器奥義", actorPosition: 0, criticalBuff: { ratePercent: 30, damagePercent: 50 },
    damage: { predictions: [{ damage: 10 }, { damage: 20 }] }, criticalDamage: { predictions: [{ damage: 15 }, { damage: 30 }] } };
  const rolls = [0, 0, .9, .9];
  assert.deepEqual(automaticAbilityPackets(event, "normal", () => rolls.shift()).map(p => p.damage), [15, 20]);
  assert.deepEqual(automaticAbilityPackets(event, "upside").map(p => p.damage), [30, 30]);
  assert.deepEqual(automaticAbilityPackets(event, "downside").map(p => p.damage), [10, 10]);
});

test("party barrier absorbs retaliation, persists partially, expires and restores with undo", () => {
  const initial = createInitialBattleState(setup); initial.enemy.attacks = true;
  const turn = (n) => ({ turn: n, elapsedSeconds: 0, warnings: [], endState: { turn: n + 1 } });
  const shield = { actorPosition: 0, kind: "effect", effect: "party-shield", name: "バリア", value: 1500, expiresOnTurn: 5 };
  const next = applyGeneratedTurn(initial, turn(1), [shield], { enemyAttack: { damage: 600 } });
  assert.equal(next.party[0].hp, 100);
  assert.equal(next.party[0].shield.amount, 900);
  assert.equal(next.party[1].shield.amount, 1500);
  assert.equal(initial.party[0].shield, undefined);
  const hit = applyGeneratedTurn(next, turn(2), [], { enemyAttack: { damage: 950 } });
  assert.equal(hit.party[0].hp, 50); assert.equal(hit.party[0].shield.amount, 0);
  const expired = applyGeneratedTurn({ ...next, turn: 5 }, turn(5), [], { enemyAttack: { damage: 60 } });
  assert.equal(expired.party[0].hp, 40);
});

test("weapon dispel removes only one removable enemy buff", () => {
  const initial = createInitialBattleState(setup);
  initial.enemy.buffs = [{ name: "消去不可", removable: false }, { name: "防御UP" }, { name: "攻撃UP" }];
  const next = applyGeneratedTurn(initial, { turn: 1, endState: {}, warnings: [] },
    [{ actorPosition: 0, kind: "effect", effect: "dispel", name: "強化消去", value: 1 }]);
  assert.deepEqual(next.enemy.buffs.map(b => b.name), ["消去不可", "攻撃UP"]);
  assert.equal(initial.enemy.buffs.length, 3);
});

test("manual skill packets keep the turn, avoid retaliation, and preserve state for undo", () => {
  const initial = createInitialBattleState(setup); initial.enemy.attacks = true;
  const generated = { turn: 1, elapsedSeconds: 0, advancesTurn: false, warnings: [],
    endState: { turn: 1, ilsa: { flowers: 1, readyOnTurn: [1, 9, 1], sinExpiresOnTurn: 6 } } };
  const result = applyGeneratedTurn(initial, generated, [{ actorPosition: 3, kind: "manual-ability", damage: 100 }],
    { enemyAttack: { damage: 50 } });
  assert.equal(result.turn, 1);
  assert.equal(result.party[0].hp, 100);
  assert.equal(result.enemy.hp, 900);
  assert.equal(result.actionState.ilsa.readyOnTurn[1], 9);
  assert.equal(initial.actionState, undefined);
});

test("ally defeat on retaliation immediately updates flowers and buttons, without recounting on the next action", () => {
  const initial = createInitialBattleState(setup); initial.enemy.attacks = true;
  initial.party[1].id = "3040456000";
  const generated = { turn: 1, elapsedSeconds: 0, advancesTurn: true, warnings: [],
    endState: { turn: 2, ilsa: { flowers: 1, readyOnTurn: [13, 9, 10] } } };
  const result = applyGeneratedTurn(initial, generated, [], { enemyAttack: { damage: 100 } });
  assert.equal(result.actionState.ilsa.flowers, 2);
  assert.deepEqual(result.actionState.ilsa.readyOnTurn, [2, 2, 2]);
  assert.deepEqual(result.actionState.defeatedPositions, [0]);
  const request = buildBattleTurnRequest(setup, result, "downside", { characters: {} });
  assert.equal(request.characters[0].chargeGauge, initial.party[1].charge);
  assert.deepEqual(request.defeatedPositions, [0]);
});
