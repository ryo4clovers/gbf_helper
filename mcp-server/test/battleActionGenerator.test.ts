import { test } from "node:test";
import assert from "node:assert/strict";
import { generateBattleActions, type GeneratedBattleEvent } from "../src/calculator/battleActionGenerator.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";

function request() {
  return {
    schemaVersion: 1, turns: 7, secondsPerTurn: 15, chargeAttack: false, manualAbilities: false,
    multiattack: { mode: "maximum", seed: 0 },
    deckConfig: {
      schemaVersion: 1, format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "6", jobId: "190501", jobLevel: 50, attackOverride: 50000, hpOverride: 10000 },
      weapons: [{ slot: 1, position: "main", weaponId: "1040315100", level: 250, uncapLevel: 5, skillLevel: 20 }],
      characters: ["3040512000", "3040611000", "3040456000"].map((characterId, index) => ({
        slot: index + 1, position: "front", characterId, level: 80, attackOverride: 40000, hpOverride: 10000,
      })),
      summons: [{ slot: 1, position: "main", summonId: "2040448000", uncapLevel: 4, level: 150 }],
    },
  };
}
const normals = (events: GeneratedBattleEvent[]) => events.filter((event) => event.kind === "normal");
const abilities = (events: GeneratedBattleEvent[]) => events.filter((event) => event.kind === "automatic-ability");

test("opening actions and reactions are generated in order, without a recorded trace", () => {
  const result = generateBattleActions(request());
  const events = result.turns[0].events;
  assert.deepEqual(normals(events).map((e) => e.actorPosition), [0, 1, 2, 2, 2, 3]);
  assert.deepEqual(normals(events).map((e) => e.bodyHitCount), [6, 6, 3, 3, 3, 9]);
  assert.deepEqual(abilities(events).map((e) => e.name), ["ミソロジックアームズ", "菓製猛虎", ...Array(3).fill("エクスキューショナーズ・サイス＋")]);
  assert.equal(abilities(events)[0].hitCount, 1); // one axe at battle start
  assert.equal(result.turns[0].tripleAttackActions, 6); // split hits do not inflate TA count
  assert.equal(result.turns[0].endState.otherSelfReady, true);
  assert.equal(events.some((e) => e.name === "他化自在"), false);
  assert.equal(normals(events)[2].calculationPatch.battleEffects!.enemyDefenseDownPercent, 10);
  assert.equal(normals(events)[2].calculationPatch.battleEffects!.enemyDefenseDownBeyondCapPercent, 0);
  assert.equal(normals(events)[3].calculationPatch.battleEffects!.enemyDefenseDownBeyondCapPercent, 10);
  assert.equal(abilities(events).every((event) => event.damage === null), true);
});

test("Other Self triggers after protagonist's reaction, expires at turn end and is consumed once", () => {
  const result = generateBattleActions(request());
  const second = result.turns[1].events;
  assert.deepEqual(second.slice(0, 4).map((e) => e.name), ["主人公", "ミソロジックアームズ", "他化自在", "シンダラ"]);
  assert.equal(normals(second)[0].calculationPatch.battleEffects!.enemyDamageTakenAmplificationPercent, 0);
  assert.equal(normals(second)[1].calculationPatch.battleEffects!.enemyDamageTakenAmplificationPercent, 20);
  assert.equal(result.turns[1].endState.otherSelfReady, false); // later turns have at most four TAs
  assert.equal(abilities(result.turns[2].events).some((e) => e.name === "他化自在"), false);
  assert.equal(normals(result.turns[2].events)[1].calculationPatch.battleEffects!.enemyDamageTakenAmplificationPercent, 0);
});

test("turn-based expiry and second-based expiry are independent", () => {
  const input = request();
  input.secondsPerTurn = 60;
  const result = generateBattleActions(input);
  assert.equal(abilities(result.turns[2].events).some((e) => e.name === "菓製猛虎"), true);
  assert.equal(abilities(result.turns[3].events).some((e) => e.name === "菓製猛虎"), false);
  assert.equal(normals(result.turns[3].events)[1].splitCount, 1);
  assert.equal(normals(result.turns[4].events)[0].calculationPatch.battleEffects!.enemyDefenseDownBeyondCapPercent, 10);
  assert.equal(normals(result.turns[5].events)[0].calculationPatch.battleEffects!.enemyDefenseDownBeyondCapPercent, 0);
  assert.equal(normals(result.turns[4].events)[0].calculationPatch.battleEffects!.enemySupplementalDamage, 9000);
  assert.equal(normals(result.turns[5].events)[0].calculationPatch.battleEffects!.enemySupplementalDamage, 0);
  input.secondsPerTurn = 180;
  assert.equal(normals(generateBattleActions(input).turns[1].events)[0].calculationPatch.battleEffects!.enemyDefenseDownPercent, 0);
});

test("minimum uses only guarantees and does not assume Ereshkigal grants permanent TA", () => {
  const input = request(); input.multiattack.mode = "minimum";
  const result = generateBattleActions(input);
  assert.deepEqual(normals(result.turns[0].events).map((e) => e.attackCount), [1, 2, 3, 3, 3, 3]);
  assert.deepEqual(normals(result.turns[1].events).map((e) => e.attackCount), [1, 2, 1, 3]);
  assert.equal(result.turns[0].endState.otherSelfReady, false);
});

test("sampled plans are deterministic, honor rate extremes and support a four-turn override", () => {
  const input = { ...request(), multiattack: { mode: "sample", seed: 0, rates: {
    protagonist: { doubleAttackRatePercent: 0, tripleAttackRatePercent: 0, openingFourTurns: { doubleAttackRatePercent: 0, tripleAttackRatePercent: 100 } },
    cidala: { doubleAttackRatePercent: 0, tripleAttackRatePercent: 40 },
    sariel: { doubleAttackRatePercent: 60, tripleAttackRatePercent: 25 },
  } } };
  const copy = structuredClone(input);
  const a = generateBattleActions(input);
  assert.deepEqual(a, generateBattleActions(input));
  assert.deepEqual(input, copy);
  assert.notDeepEqual(a.turns, generateBattleActions({ ...input, multiattack: { ...input.multiattack, seed: 999 } }).turns);
  assert.equal(normals(a.turns[3].events)[0].attackCount, 3);
  assert.equal(normals(a.turns[4].events)[0].attackCount, 1);
});

test("party order changes effect availability without assigning passives to a fixed slot", () => {
  const input = request();
  const chars = input.deckConfig.characters;
  [chars[0].characterId, chars[1].characterId] = [chars[1].characterId, chars[0].characterId];
  const first = normals(generateBattleActions(input).turns[0].events);
  assert.deepEqual(first.map((event) => event.actorPosition), [0, 1, 1, 1, 2, 3]);
  assert.equal(first[4].calculationPatch.attacker!.coupledConfectionActive, true);
  assert.equal(first[4].calculationPatch.battleEffects!.supportSkillSupplementalDamage, 30000);
});

test("level counts generated own damage hits only and changes after the reaction", () => {
  const result = generateBattleActions(request());
  let total = 0;
  for (const turn of result.turns) {
    for (const event of turn.events) {
      if (event.actorPosition !== 0) continue;
      if (event.kind === "normal") total += event.bodyHitCount + event.pursuitHitCount;
      if (event.kind === "automatic-ability") total += event.hitCount;
    }
    assert.equal(turn.endState.protagonistHitCount, total);
    assert.equal(turn.endState.mythicalLancerLevel, Math.min(5, 1 + Math.floor(total / 40)));
  }
});

test("a 40-hit boundary retains the old reaction level until the next normal action", () => {
  const input = request();
  input.deckConfig.summons = []; // no Other Self extra hits
  const result = generateBattleActions(input);
  // One axe, no echoes: six normal hits plus one reaction hit per turn.
  // Turn 6 crosses 40; it still has one reaction hit, then turn 7 uses level 2.
  assert.equal(result.turns[4].endState.protagonistHitCount, 35);
  assert.equal(abilities(result.turns[5].events)[0].hitCount, 1);
  assert.equal(result.turns[5].endState.mythicalLancerLevel, 2);
  assert.equal(abilities(result.turns[6].events)[0].hitCount, 2);
});

test("generated state patches feed the single-hit calculator without recorded conditions", () => {
  const input = request();
  const events = normals(generateBattleActions(input).turns[1].events);
  for (const event of events) {
    const calculation = calculateNormalAttackFromRequest({
      schemaVersion: 1, deckConfig: input.deckConfig, enemy: { elementCode: "5", defense: 10 },
      ...event.calculationPatch,
    });
    assert.equal(calculation.result.bodyDamageAttenuation.enemyDamageTakenAmplificationPercent, event.actorPosition === 0 ? 0 : 20);
  }
});

test("unsupported scopes, missing sampling rates and oversized inputs fail explicitly", () => {
  for (const update of [{ turns: 101 }, { turns: 0 }, { secondsPerTurn: 0 }, { chargeAttack: true }, { manualAbilities: true },
    { recordedActions: [] }, { multiattack: { mode: "sample", seed: 1 } }, { multiattack: { mode: "minimum", seed: -1 } }]) {
    assert.throws(() => generateBattleActions({ ...request(), ...update }));
  }
  const input = request(); input.deckConfig.protagonist.jobLevel = 20;
  assert.throws(() => generateBattleActions(input), /ランサー/);
  const unknown = request(); unknown.deckConfig.characters[0].characterId = "unknown";
  assert.throws(() => generateBattleActions(unknown));
  const duplicate = request(); duplicate.deckConfig.characters[1].characterId = duplicate.deckConfig.characters[0].characterId;
  assert.throws(() => generateBattleActions(duplicate), /各1人/);
  const summon = request(); summon.deckConfig.summons[0].position = "sub";
  assert.equal(generateBattleActions(summon).turns[0].endState.otherSelfReady, false);
});

test("each composition component enables only its own actions", () => {
  const input = request();
  input.deckConfig.characters = [input.deckConfig.characters[2]]; // sparse slot 3, Ilsa only
  input.deckConfig.protagonist.jobId = "110001";
  input.deckConfig.weapons = [];
  input.deckConfig.summons = [];
  const result = generateBattleActions(input);
  assert.deepEqual(normals(result.turns[0].events).map((event) => [event.actorPosition, event.splitCount]), [[0, 1], [3, 3]]);
  assert.deepEqual(abilities(result.turns[0].events), []);
  assert.equal(result.turns[0].events.some((event) => event.kind === "effect"), false);
  assert.equal(result.turns[6].endState.mythicalLancerLevel, 0);
});

test("resuming a turn carries timed effects and reaction progress", () => {
  const input = request();
  const batch = generateBattleActions(input);
  const resumed = generateBattleActions({ ...input, turns: 2 }, { state: batch.turns[0].endState });
  const withoutSequence = (events: GeneratedBattleEvent[]) => events.map(({ sequence, ...event }) => event);
  assert.deepEqual(withoutSequence(resumed.turns[0].events), withoutSequence(batch.turns[1].events));
  assert.deepEqual(resumed.turns[0].endState, batch.turns[1].endState);
});
