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
  assert.throws(() => buildBattleTurnRequest(setup, state, "downside", { characters: {} }), /戦闘不能/);
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
