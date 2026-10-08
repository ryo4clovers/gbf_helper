import { test } from "node:test";
import assert from "node:assert/strict";
import { createSelectableJobCatalog } from "../src/calculator/jobCatalogView.ts";
import { parseCalculatorDeckConfig } from "../src/calculator/calculatorDeckConfig.ts";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";
import { generateBattleActions } from "../src/calculator/battleActionGenerator.ts";
import { fighterAbilitiesSchema } from "../src/calculator/fighterOriginState.ts";
import { reconcileAbilitySelection, validateAbilitySelection, fighterLoadoutFromDeck } from "../web/protagonist-abilities.js";
import { createCalculatorFormation, serializeCalculatorFormation, parseCalculatorFormation, mergeCalculatorFormation,
  serializeCalculatorProfiles, parseCalculatorProfiles, upsertCalculatorProfile } from "../web/calculator-state-storage.js";
import { createInitialBattleState, serializeBattleSession, restoreBattleSession } from "../web/battle-state.js";
import { buildBattleTurnRequest } from "../web/battle-turn-client.js";

const jobs = createSelectableJobCatalog().jobs;
const job = (id: string) => jobs.find(j => j.jobId === id)!;
const fighter = job("100501");
function deck(abilityIds: (string | null)[] = []) {
  return { schemaVersion: 1 as const, format: "gbf-helper-calculator-deck" as const,
    protagonist: { jobId: "100501", jobLevel: 50, abilityIds, elementCode: "6", attackOverride: 50000, hpOverride: 1000 },
    weapons: [{ slot: 1, position: "main" as const, weaponId: "1040014300", level: 150, uncapLevel: 4, skillLevel: 15 }], summons: [], characters: [] };
}
function request(abilityIds: (string | null)[] = []) {
  return { calculation: { schemaVersion: 1, deckConfig: deck(abilityIds), enemy: { name: "敵", elementCode: "5", defense: 10 }, modifiers: {} },
    characters: [], mode: "downside", secondsPerTurn: 15, protagonistCharge: { enabled: false, gauge: 100 } };
}

test("all 80 jobs expose class-correct fixed/free slots and only catalog candidates", () => {
  assert.equal(jobs.length, 80);
  const counts: Record<string, [number, number]> = { ClassI: [2, 1], ClassII: [3, 1], ClassIII: [3, 1], ClassIV: [1, 3], ClassV: [1, 3], エクストラ: [3, 1], エクストラII: [1, 3], オリジン: [1, 3] };
  for (const j of jobs) {
    const c = j.abilities!;
    assert.deepEqual([c.fixed.length, c.freeSlots], counts[j.classTier], j.name);
    assert.equal(c.verificationStatus, "下書き");
    assert.ok(c.fixed.every(a => a.name && a.minimumJobLevel >= 1));
    assert.equal(new Set(c.candidates.map(a => a.id)).size, c.candidates.length, j.name);
    for (const a of c.candidates) {
      validateAbilitySelection({ jobLevel: 50, perfectionProofLevel: 6, abilityIds: [a.id] }, c);
      assert.ok(a.battleStatus.includes("未実装") || (j === fighter && ["202071", "200721", "203961"].includes(a.id)));
    }
  }
  assert.equal(jobs.filter(j => j.abilities!.coverage.includes("導出")).length, 3);
});

test("API deck validation rejects duplicates, wrong job, fixed identifiers, category caps and malformed IDs", () => {
  assert.throws(() => parseCalculatorDeckConfig(deck(["202071", "202071"])), /重複/);
  const other = deck(["203961"]); other.protagonist.jobId = "110001";
  assert.throws(() => parseCalculatorDeckConfig(other), /装備できない/);
  assert.throws(() => parseCalculatorDeckConfig(deck([fighter.abilities!.fixed[0].id])));
  const threeEx = fighter.abilities!.candidates.filter(a => a.category === "ex").slice(0, 3).map(a => a.id);
  assert.throws(() => parseCalculatorDeckConfig(deck(threeEx)), /上限/);
  assert.throws(() => parseCalculatorDeckConfig(deck(["-1"])));
  assert.throws(() => parseCalculatorDeckConfig({ ...deck(), protagonist: { jobId: "unknown", abilityIds: ["10"] } }), /未登録/);
  assert.deepEqual(parseCalculatorDeckConfig(deck([null, "202071", "203961"])).protagonist.abilityIds, [null, "202071", "203961"]);
});

test("Origin own unlocks and EM cap increases honor Fighter/Lancer Lv30 and Wizard Lv40", () => {
  assert.throws(() => validateAbilitySelection({ jobLevel: 49, abilityIds: ["203961"] }, fighter.abilities), /Lv50/);
  assert.throws(() => validateAbilitySelection({ jobLevel: 29, abilityIds: ["203951"] }, fighter.abilities), /Lv30/);
  for (const [id, boundary] of [["100501", 30], ["190501", 30], ["130501", 40]] as const) {
    const config = job(id).abilities!;
    const inherited = config.candidates.filter(a => a.category === "limit" && !a.minimumJobLevel).slice(0, 3).map(a => a.id);
    assert.equal(inherited.length, 3);
    assert.throws(() => validateAbilitySelection({ jobLevel: boundary - 1, abilityIds: inherited }, config), /上限/);
    validateAbilitySelection({ jobLevel: boundary, abilityIds: inherited }, config);
  }
});

test("own Ultimate Mastery requires stage 6 while inherited acquisition remains explicitly unknown", () => {
  const berserker = job("100301").abilities!;
  assert.throws(() => validateAbilitySelection({ jobLevel: 20, perfectionProofLevel: 5, abilityIds: ["202071"] }, berserker), /極致/);
  validateAbilitySelection({ jobLevel: 20, perfectionProofLevel: 6, abilityIds: ["202071"] }, berserker);
  validateAbilitySelection({ jobLevel: 50, abilityIds: ["202071"] }, fighter.abilities);
  assert.ok(fighter.abilities!.evidence.includes("源ジョブ"));
});

test("job and level changes remove only invalid choices while retaining valid slot order", () => {
  const ex = fighter.abilities!.candidates.find(a => a.category === "ex")!.id;
  const changed = reconcileAbilitySelection({ jobLevel: 20, abilityIds: ["203961", ex, "202071"] }, job("110301").abilities);
  assert.deepEqual(changed.selected, [null, ex, null]);
  assert.deepEqual(changed.removed, ["203961", "202071"]);
  assert.deepEqual(reconcileAbilitySelection({ jobLevel: 49, abilityIds: ["203961", ex] }, fighter.abilities).selected, [null, ex, null]);
  assert.deepEqual(reconcileAbilitySelection({ abilityIds: [ex] }).selected, []);
});

test("JSON formations, named profiles and restore retain ordered empty slots; old data migrates empty", () => {
  const current = { schemaVersion: 1, deckConfig: deck(["203961", null, "202071"]), enemy: { elementCode: "5", defense: 10 }, modifiers: {}, random: {} };
  const saved = parseCalculatorFormation(serializeCalculatorFormation(createCalculatorFormation(current)));
  assert.deepEqual(mergeCalculatorFormation(current, saved).deckConfig.protagonist.abilityIds, current.deckConfig.protagonist.abilityIds);
  const profiles = upsertCalculatorProfile([], { id: "loadout-test", name: "アビ編成", updatedAt: "2026-10-05T00:00:00Z", formation: saved });
  assert.deepEqual(parseCalculatorProfiles(serializeCalculatorProfiles(profiles))[0].formation.deckConfig.protagonist.abilityIds, current.deckConfig.protagonist.abilityIds);
  const legacy = structuredClone(current); delete (legacy.deckConfig.protagonist as any).abilityIds;
  assert.deepEqual(createCalculatorFormation(legacy).deckConfig.protagonist.abilityIds, []);
  assert.deepEqual(mergeCalculatorFormation(current, createCalculatorFormation(legacy)).deckConfig.protagonist.abilityIds, []);
});

test("API manual and automatic abilities use the deck; unequipped Fang cannot run even under Ulf", () => {
  assert.throws(() => calculateBattleTurn({ ...request(), action: { kind: "fighter-ability", ability: "beast-fang" } }), /装備していない/);
  const initial = request(["200721"]);
  const wool = calculateBattleTurn({ ...initial, action: { kind: "fighter-ability", ability: "ulfhedinn" } });
  const attack = calculateBattleTurn({ ...initial, state: wool.endState, protagonistCharge: { enabled: false, gauge: 0 } });
  assert.equal(attack.events.some(e => e.kind === "fighter-ability" && e.ability === "beast-fang"), false);
  const withFang = request(["202071", "200721"]);
  const equippedWool = calculateBattleTurn({ ...withFang, action: { kind: "fighter-ability", ability: "ulfhedinn" } });
  const equippedAttack = calculateBattleTurn({ ...withFang, state: equippedWool.endState, protagonistCharge: { enabled: false, gauge: 0 } });
  assert.equal(equippedAttack.events.filter(e => e.kind === "fighter-ability" && e.ability === "beast-fang").length, 1);
  assert.throws(() => calculateBattleTurn({ ...request(), fighterLoadout: ["beast-fang"] }), /一致/);
  assert.throws(() => calculateBattleTurn({ ...request(), state: equippedWool.endState }), /装備|変更/);
  const unsupported = request(["203951"]);
  assert.deepEqual(fighterLoadoutFromDeck(unsupported.calculation.deckConfig.protagonist), []);
  assert.equal(calculateBattleTurn(unsupported).events.some(e => e.kind === "fighter-ability" && e.name.includes("ドーン")), false);
});

test("batch generation and Web request generation use the same deck and reject stale state", () => {
  const input = request(["202071", "200721"]);
  const wool = calculateBattleTurn({ ...input, action: { kind: "fighter-ability", ability: "ulfhedinn" } });
  const setup = { request: input.calculation, protagonistMaxHp: 1000, enemyMaxHp: 1000000 };
  const state = createInitialBattleState(setup); state.actionState = wool.endState; state.party[0].charge = 0;
  const fromWeb = buildBattleTurnRequest(setup, state, "downside", { secondsPerTurn: 15, characters: {} });
  const api = calculateBattleTurn(fromWeb);
  assert.equal(api.events.filter(e => e.kind === "fighter-ability").length, 1);
  const plan = { schemaVersion: 1, deckConfig: input.calculation.deckConfig, turns: 1, secondsPerTurn: 15, chargeAttack: false, manualAbilities: false, multiattack: { mode: "minimum", seed: 1 } };
  const batch = generateBattleActions(plan, { state: wool.endState, protagonistCharge: { enabled: false, gauge: 0 } });
  assert.equal(batch.turns[0].events.filter(e => e.kind === "fighter-ability").length, 1);
  assert.throws(() => generateBattleActions({ ...plan, deckConfig: deck() }, { state: wool.endState }), /装備|変更/);
});

test("battle restore rejects forged settings and equipped action state outside the formation", () => {
  const setup = { request: request().calculation, protagonistMaxHp: 1000 };
  const state = createInitialBattleState(setup), settings = { secondsPerTurn: 15, characters: {}, fighterLoadout: [] };
  const saved = serializeBattleSession(setup, state, [], settings, "downside");
  assert.deepEqual(restoreBattleSession(saved, setup, state).settings.fighterLoadout, []);
  const forged = JSON.parse(saved); forged.settings.fighterLoadout = ["beast-fang"];
  assert.throws(() => restoreBattleSession(JSON.stringify(forged), setup, state), /一致/);
  const forgedState = JSON.parse(saved);
  forgedState.state.actionState = { fighterOrigin: { abilities: fighterAbilitiesSchema.parse({ loadout: ["beast-fang"] }) } };
  assert.throws(() => restoreBattleSession(JSON.stringify(forgedState), setup, state), /一致/);
});

test("legacy unequipped battle restores after both setup identities migrate missing abilityIds", () => {
  const legacySetup = { request: request().calculation, protagonistMaxHp: 1000 };
  delete (legacySetup.request.deckConfig.protagonist as any).abilityIds;
  const state = createInitialBattleState(legacySetup), settings = { secondsPerTurn: 15, characters: {}, fighterLoadout: [] };
  const saved = serializeBattleSession(legacySetup, state, [structuredClone(state)], settings, "downside");
  // Current battle.js performs this migration before constructing state/restoring.
  const currentSetup = structuredClone(legacySetup);
  currentSetup.request.deckConfig.protagonist.abilityIds = [];
  const currentInitial = createInitialBattleState(currentSetup);
  const restored = restoreBattleSession(saved, currentSetup, currentInitial);
  assert.deepEqual(restored.state, state);
  assert.deepEqual(restored.history, [state]);
  assert.deepEqual(restored.settings.fighterLoadout, []);
  assert.equal((legacySetup.request.deckConfig.protagonist as any).abilityIds, undefined);
  assert.deepEqual(currentSetup.request.deckConfig.protagonist.abilityIds, []);
  // Explicit null-filled slots also have equipment semantics: do not silently flatten them.
  const changedSlots = structuredClone(currentSetup); changedSlots.request.deckConfig.protagonist.abilityIds = [null];
  assert.throws(() => restoreBattleSession(saved, changedSlots, createInitialBattleState(changedSlots)), /一致/);
});

test("legacy equipped saves remain rejected against a migrated empty formation", () => {
  const legacySetup = { request: request().calculation, protagonistMaxHp: 1000 };
  delete (legacySetup.request.deckConfig.protagonist as any).abilityIds;
  const state = createInitialBattleState(legacySetup);
  state.actionState = { fighterOrigin: { level: 0, consumedGaugeRemainder: 0,
    abilities: fighterAbilitiesSchema.parse({ loadout: ["beast-fang"] }) } };
  const saved = serializeBattleSession(legacySetup, state, [], { secondsPerTurn: 15, characters: {}, fighterLoadout: ["beast-fang"] }, "downside");
  const currentSetup = structuredClone(legacySetup); currentSetup.request.deckConfig.protagonist.abilityIds = [];
  assert.throws(() => restoreBattleSession(saved, currentSetup, createInitialBattleState(currentSetup)), /装備.*一致/);
  const forged = JSON.parse(saved); forged.settings.fighterLoadout = [];
  assert.throws(() => restoreBattleSession(JSON.stringify(forged), currentSetup, createInitialBattleState(currentSetup)), /状態.*装備.*一致/);
});

test("current ordered equipment saves restore while changed job/configuration is still rejected", () => {
  const setup = { request: request(["203961", "202071", null]).calculation, protagonistMaxHp: 1000 };
  const state = createInitialBattleState(setup);
  const settings = { secondsPerTurn: 15, characters: {}, fighterLoadout: ["beast-fang", "unlimited-boost"] };
  const saved = serializeBattleSession(setup, state, [], settings, "downside");
  assert.deepEqual(restoreBattleSession(saved, setup, state).settings, settings);
  const reorderedKey = structuredClone(setup);
  const p = reorderedKey.request.deckConfig.protagonist;
  reorderedKey.request.deckConfig.protagonist = { abilityIds: p.abilityIds, jobId: p.jobId, jobLevel: p.jobLevel,
    elementCode: p.elementCode, attackOverride: p.attackOverride, hpOverride: p.hpOverride };
  assert.deepEqual(restoreBattleSession(saved, reorderedKey, state).state, state);
  const changedJob = structuredClone(setup); changedJob.request.deckConfig.protagonist.jobId = "190501";
  assert.throws(() => restoreBattleSession(saved, changedJob, state), /一致/);
  const changedLevel = structuredClone(setup); changedLevel.request.deckConfig.protagonist.jobLevel = 49;
  assert.throws(() => restoreBattleSession(saved, changedLevel, state), /一致/);
  const changedEquipment = structuredClone(setup); changedEquipment.request.deckConfig.protagonist.abilityIds = ["202071", "203961", null];
  assert.throws(() => restoreBattleSession(saved, changedEquipment, state), /一致/);
});

test("corrupt save/setup/settings/state fail rather than being repaired by migration", () => {
  const setup = { request: request().calculation, protagonistMaxHp: 1000 }, state = createInitialBattleState(setup);
  const saved = serializeBattleSession(setup, state, [], { secondsPerTurn: 15, characters: {}, fighterLoadout: [] }, "downside");
  for (const corrupt of ["not-json", "null", "[]", "{}", JSON.stringify({ ...JSON.parse(saved), setupKey: "not-json" }),
    JSON.stringify({ ...JSON.parse(saved), setupKey: "null" }), JSON.stringify({ ...JSON.parse(saved), setupKey: "{}" }),
    JSON.stringify({ ...JSON.parse(saved), state: null }), JSON.stringify({ ...JSON.parse(saved), history: [null] }),
    JSON.stringify({ ...JSON.parse(saved), settings: { secondsPerTurn: 15, characters: {}, fighterLoadout: "beast-fang" } })]) {
    assert.throws(() => restoreBattleSession(corrupt, setup, state));
  }
  const nullField = JSON.parse(saved), badSetup = structuredClone(setup);
  (badSetup.request.deckConfig.protagonist as any).abilityIds = null;
  nullField.setupKey = JSON.stringify(badSetup);
  assert.throws(() => restoreBattleSession(JSON.stringify(nullField), setup, state), /一致/);
});
