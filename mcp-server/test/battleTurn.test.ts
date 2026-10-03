import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";

function request() {
  const example = JSON.parse(readFileSync(new URL("../examples/battle-actions-request.v1.json", import.meta.url), "utf8"));
  return { calculation: { schemaVersion: 1, deckConfig: example.deckConfig, enemy: { elementCode: "5", defense: 10, maxHp: 1_000_000_000 } },
    mode: "downside", secondsPerTurn: 15, characters: [1, 2, 3].map((characterSlot) => ({ characterSlot, currentHpPercent: 100 })) };
}

test("composition turn calculates every actor and automatic ability in actual action order", () => {
  const input = request(), original = structuredClone(input);
  const first = calculateBattleTurn(input);
  assert.deepEqual(input, original);
  const normal = first.events.filter((event) => event.kind === "normal");
  assert.deepEqual(normal.map((event) => event.actorPosition), [0, 1, 2, 2, 2, 3]);
  assert.ok(normal.every((event) => event.calculation.bodyDamageDistribution));
  assert.ok(first.events.filter((event) => event.kind === "automatic-ability").every((event) => event.damage?.predictions.length === 101));
  const second = calculateBattleTurn({ ...input, state: first.endState });
  assert.equal(second.turn, 2);
  const protagonist = second.events.find((event) => event.kind === "normal")!;
  assert.equal(protagonist.kind === "normal" && protagonist.calculationPatch.battleEffects?.enemyDefenseDownPercent, 10);
  assert.ok(second.warnings.some((warning) => warning.includes("実測未一致")));
});

test("removing a character removes both its attacks and its debuff from subsequent actors", () => {
  const input = request();
  input.calculation.deckConfig.characters.splice(0, 1);
  input.characters = input.characters.filter((character) => character.characterSlot !== 1);
  const output = calculateBattleTurn(input);
  assert.equal(output.events.some((event) => event.actorPosition === 1), false);
  assert.equal(output.events.some((event) => event.kind === "automatic-ability" && event.abilityId === "mission-chocolate"), false);
  assert.equal(output.endState.chocolateStacks, 0);
});

test("missing sampling rates or artifact outcomes never silently become zero", () => {
  const input = request(); input.mode = "normal";
  assert.throws(() => calculateBattleTurn(input), /前衛1.*実効DA\/TA/);
  const withRates = { ...input, characters: input.characters.map((entry) => ({ ...entry, rates: { doubleAttackRatePercent: 100, tripleAttackRatePercent: 100 } })) };
  const output = calculateBattleTurn(withRates, () => 0.5);
  assert.equal(output.events.filter((event) => event.kind === "normal" && event.actorPosition > 0).every((event) => event.attackCount === 3), true);
  input.mode = "downside";
  input.calculation.deckConfig.characters[0].artifact = { skills: [{ skillId: "50211", name: "バトル開始時に自分に一定個数ランダムな強化効果", effectValue: "+3" }] };
  assert.throws(() => calculateBattleTurn(input), /explicit observed outcomes/);
});

test("ordinary protagonist-only composition uses the same endpoint", () => {
  const input = request(); input.calculation.deckConfig.characters = [];
  input.calculation.deckConfig.weapons = []; input.calculation.deckConfig.summons = [];
  input.calculation.deckConfig.protagonist.jobId = "110001";
  input.characters = [];
  const result = calculateBattleTurn(input);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].kind, "normal");
  assert.equal(result.endState.mythicalLancerLevel, 0);
});
