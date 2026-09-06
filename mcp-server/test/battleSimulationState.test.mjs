import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SIMULATION_MODES,
  applyAttack,
  applyItem,
  applySummon,
  createInitialBattleState,
  resolveAttackCount,
  resolveCritical,
  resolveDamageMultiplier,
  selectPartyMember,
} from "../web/battle-state.js";

function setup() {
  return {
    schemaVersion: 1,
    enemyMaxHp: 100_000,
    request: {
      deckConfig: {
        protagonist: { elementCode: "1", jobNameHint: "ナイト", hpOverride: 4_877 },
        characters: [
          { slot: 1, position: "front", characterId: "a", nameHint: "アニラ", hpOverride: 3_000 },
          { slot: 4, position: "back", characterId: "b", nameHint: "サブ", hpOverride: 2_000 },
        ],
        summons: [{ slot: 1, position: "main", summonId: "agni", nameHint: "アグニス" }],
      },
      supportSummon: { summonId: "agni", nameHint: "アグニス" },
      enemy: { name: "オールド・木人", elementCode: "4" },
    },
  };
}

test("battle starts at turn 1 with the front party and support summon", () => {
  const state = createInitialBattleState(setup());

  assert.equal(state.turn, 1);
  assert.equal(state.enemy.hp, 100_000);
  assert.deepEqual(state.party.map((member) => member.name), ["ナイト", "アニラ"]);
  assert.deepEqual(state.summons.map((summon) => summon.id), ["deck:main:1", "support"]);
});

test("normal attack advances a turn and records body and pursuit packets", () => {
  const initial = createInitialBattleState(setup());
  const state = applyAttack(initial, [
    { kind: "damage", damage: 10_000, note: "body" },
    { kind: "pursuit", damage: 2_000, note: "pursuit" },
  ]);

  assert.equal(initial.turn, 1);
  assert.equal(state.turn, 2);
  assert.equal(state.enemy.hp, 88_000);
  assert.equal(state.party[0].charge, 10);
  assert.deepEqual(state.events.map((event) => event.amount), [2_000, 10_000]);
});

test("items target the selected member and elixir restores the whole party", () => {
  const initial = createInitialBattleState(setup());
  initial.party[0].hp = 1_000;
  initial.party[1].hp = 500;
  const selected = selectPartyMember(initial, "a");
  const cured = applyItem(selected, { name: "キュア", scope: "single", healPercent: 50 });
  const restored = applyItem(cured, { name: "エリクシール", scope: "all", healPercent: 100, fullHeal: true, fullCharge: true });

  assert.equal(cured.party[0].hp, 1_000);
  assert.equal(cured.party[1].hp, 2_000);
  assert.deepEqual(restored.party.map((member) => member.hp), [4_877, 3_000]);
  assert.deepEqual(restored.party.map((member) => member.charge), [100, 100]);
});

test("a summon can only be committed once", () => {
  const initial = createInitialBattleState(setup());
  const used = applySummon(initial, "support");
  const repeated = applySummon(used, "support");

  assert.equal(used.summons.find((summon) => summon.id === "support").used, true);
  assert.equal(used.events.length, 1);
  assert.equal(repeated, used);
});

test("downside mode uses minimum damage and rejects non-guaranteed procs", () => {
  assert.equal(resolveDamageMultiplier(SIMULATION_MODES.downside, 0.95, 1.05, 0.001), 0.95);
  assert.equal(resolveCritical(SIMULATION_MODES.downside, 99.9), false);
  assert.equal(resolveCritical(SIMULATION_MODES.downside, 100), true);
  assert.equal(resolveAttackCount(SIMULATION_MODES.downside, 99.9, 99.9), 1);
  assert.equal(resolveAttackCount(SIMULATION_MODES.downside, 100, 0), 2);
  assert.equal(resolveAttackCount(SIMULATION_MODES.downside, 100, 100), 3);
});

test("upside mode uses maximum damage and forces every positive proc rate", () => {
  assert.equal(resolveDamageMultiplier(SIMULATION_MODES.upside, 0.95, 1.05, 0.001), 1.05);
  assert.equal(resolveCritical(SIMULATION_MODES.upside, 0), false);
  assert.equal(resolveCritical(SIMULATION_MODES.upside, 0.1), true);
  assert.equal(resolveAttackCount(SIMULATION_MODES.upside, 0, 0), 1);
  assert.equal(resolveAttackCount(SIMULATION_MODES.upside, 0.1, 0), 2);
  assert.equal(resolveAttackCount(SIMULATION_MODES.upside, 100, 0.1), 3);
});

test("normal mode follows its random source for damage, critical, TA and DA", () => {
  assert.equal(resolveDamageMultiplier(SIMULATION_MODES.normal, 0.95, 1.05, 0.001, () => 0), 0.95);
  assert.equal(resolveDamageMultiplier(SIMULATION_MODES.normal, 0.95, 1.05, 0.001, () => 0.999), 1.05);
  assert.equal(resolveCritical(SIMULATION_MODES.normal, 20, () => 0.19), true);
  assert.equal(resolveCritical(SIMULATION_MODES.normal, 20, () => 0.2), false);
  assert.equal(resolveAttackCount(SIMULATION_MODES.normal, 20, 10, () => 0.09), 3);
  const rolls = [0.5, 0.19];
  assert.equal(resolveAttackCount(SIMULATION_MODES.normal, 20, 10, () => rolls.shift()), 2);
  const singleRolls = [0.4, 0.46];
  assert.equal(resolveAttackCount(SIMULATION_MODES.normal, 46, 40, () => singleRolls.shift()), 1);
  const doubleRolls = [0.4, 0.459];
  assert.equal(resolveAttackCount(SIMULATION_MODES.normal, 46, 40, () => doubleRolls.shift()), 2);
  assert.equal(resolveAttackCount(SIMULATION_MODES.normal, 46, 40, () => 0.399), 3);
});
