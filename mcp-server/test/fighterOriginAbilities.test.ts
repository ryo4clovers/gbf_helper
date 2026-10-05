import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";
import { consumeFighterOriginGauge, fighterAbilitiesSchema } from "../src/calculator/fighterOriginState.ts";
import { castFighterAbility } from "../src/calculator/fighterOriginAbilities.ts";
import { createInitialBattleState, applyGeneratedTurn, serializeBattleSession, restoreBattleSession } from "../web/battle-state.js";
import { buildBattleTurnRequest, automaticAbilityPackets } from "../web/battle-turn-client.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/fighter-origin-beast-observations.json", import.meta.url), "utf8"));
const loadout = ["beast-fang", "ulfhedinn", "unlimited-boost"];
function request(): any {
  return { calculation: { schemaVersion: 1, deckConfig: { schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "6", jobId: "100501", jobLevel: 50, attackOverride: 50000, hpOverride: 1000, completedJobIds: ["250201"] },
    weapons: [{ slot: 1, position: "main", weaponId: "1040014300", level: 150, uncapLevel: 4, skillLevel: 15 }], characters: [], summons: [] },
    enemy: { name: "敵", elementCode: "5", defense: 10 }, modifiers: {} },
    characters: [], mode: "upside", secondsPerTurn: 15, fighterLoadout: loadout, protagonistCharge: { enabled: true, gauge: 30 } };
}
const gaugeAfter = (out: any, fallback: number) => out.events.filter((e: any) => e.kind === "effect" && e.effect === "charge-ready" && e.actorPosition === 0).at(-1)?.value ?? fallback;

test("8th recording: 23 manual uses and all 41 party action/gauge/Spirit traces (observed incoming gauge supplied)", () => {
  let input = request(); const original = structuredClone(input); let manualFang = 0, automaticFang = 0;
  for (const turn of fixture.turns) {
    for (const use of fixture.manualActions.filter((m: any) => m.turn === turn.turn)) {
      assert.equal(input.protagonistCharge.gauge, use.gaugeBefore);
      const out = calculateBattleTurn({ ...input, action: { kind: "fighter-ability", ability: use.ability } });
      assert.equal(out.advancesTurn, false);
      assert.equal(gaugeAfter(out, use.gaugeBefore), use.gaugeAfter);
      assert.equal(out.endState.fighterOrigin!.level, use.levelAfter);
      input.state = out.endState; input.protagonistCharge.gauge = use.gaugeAfter;
      if (use.ability === "beast-fang") manualFang++;
    }
    assert.equal(input.protagonistCharge.gauge, turn.gaugeBefore);
    const out = calculateBattleTurn(input);
    const actions = out.events.filter(e => e.actorPosition === 0 && (e.kind === "normal" || e.kind === "charge-attack"))
      .map(e => e.kind === "normal" ? "normal" : "fighterReplacement" in e && e.fighterReplacement ? "replacement" : "charge");
    assert.deepEqual(actions, turn.ownActions, `T${turn.turn}`);
    const fang = out.events.filter(e => e.kind === "fighter-ability" && e.ability === "beast-fang");
    assert.equal(fang.length, turn.automaticFang, `T${turn.turn}`);
    automaticFang += fang.length;
    assert.equal(gaugeAfter(out, turn.gaugeBefore), turn.gaugeAfterParty, `T${turn.turn}`);
    assert.equal(out.endState.fighterOrigin!.level, turn.levelAfter);
    assert.equal(out.endState.fighterOrigin!.consumedGaugeRemainder, 0);
    input.state = out.endState;
    // Incoming deltas are independent observed inputs, not validation of an inferred damage/gauge formula.
    input.protagonistCharge.gauge = turn.gaugeAfterIncoming;
  }
  assert.equal(manualFang, 4); assert.equal(automaticFang, 94);
  assert.equal(original.protagonistCharge.gauge, 30);
});

function activeInput(turn: number, gauge: number, wool = true): any {
  const input = request();
  input.state = { turn, protagonistHitCount: 0, mythicalLancerLevel: 0, otherSelfReady: false,
    chocolateStacks: 0, chocolateExpiresAt: 0, deathSentenceExpiresOnTurn: 0,
    fighterOrigin: { level: 5, consumedGaugeRemainder: 0, abilities: fighterAbilitiesSchema.parse({ loadout,
      endless: true, unlimitedUsed: true, woolExpiresOnTurn: wool ? turn + 1 : 0 }) } };
  input.protagonistCharge.gauge = gauge;
  return input;
}

test("T1: direct gain leaves consumption remainder; ability consumption retains it and immediately enables Lv4 split", () => {
  const a = fighterAbilitiesSchema.parse({ loadout });
  const wb = castFighterAbility({ level: 2, consumedGaugeRemainder: 60, abilities: a }, 1, 30, "weapon-burst");
  assert.equal(wb.state.level, 3); assert.equal(wb.state.consumedGaugeRemainder, 60);
  const wool = castFighterAbility(wb.state, 1, wb.gauge, "ulfhedinn");
  assert.equal(wool.state.level, 4); assert.equal(wool.state.consumedGaugeRemainder, 60);
  assert.equal(wool.gauge, 0);
  assert.equal(consumeFighterOriginGauge(wool.state, 40, 50).level, 5); // Synthetic fractional boundary, not measured.
  const input = activeInput(1, 0); input.state.fighterOrigin = wool.state;
  const out = calculateBattleTurn(input);
  const normal = out.events.find(e => e.kind === "normal");
  assert.equal(normal?.kind === "normal" && normal.splitCount, 2);
});

test("T10: preparation at gauge zero fires with OFF, consumes no gauge, no weapon buffs, grants two actions only next turn", () => {
  const input = activeInput(10, 0, false);
  input.state.fighterOrigin.abilities.endless = false;
  input.state.fighterOrigin.abilities.unlimitedUsed = false;
  input.protagonistCharge.enabled = false;
  const prep = calculateBattleTurn({ ...input, action: { kind: "fighter-ability", ability: "unlimited-boost" } });
  input.state = prep.endState;
  const out = calculateBattleTurn(input);
  const own = out.events.filter(e => e.actorPosition === 0 && (e.kind === "normal" || e.kind === "charge-attack"));
  assert.equal(own.length, 1); assert.equal(own[0].name, "無窮の蒼剣");
  assert.equal("damage" in own[0] && own[0].damage, null);
  assert.equal(out.events.some(e => e.kind === "effect" && ["party-shield", "weapon-buff"].includes(e.effect)), false);
  assert.equal(gaugeAfter(out, -1), 0);
  assert.equal(out.endState.fighterOrigin!.abilities!.unlimitedPrepared, false);
  const setup = { request: input.calculation, enemyMaxHp: 1000000, protagonistMaxHp: 1000 };
  const battle = createInitialBattleState(setup); battle.party[0].hp = 600;
  battle.party[0].debuffs = [{ name: "弱体" }]; battle.enemy.buffs = [{ name: "解除可" }, { name: "解除不可", removable: false }];
  const applied = applyGeneratedTurn(battle, out, out.events.flatMap(e => e.kind === "charge-attack" ? automaticAbilityPackets(e, "upside") : [e]));
  assert.equal(applied.party[0].hp, 1000); assert.deepEqual(applied.party[0].debuffs, []);
  assert.deepEqual(applied.enemy.buffs, [{ name: "解除不可", removable: false }]);
  assert.equal(applied.events.find((e: any) => e.kind === "heal").amount, 400);
  const next = calculateBattleTurn({ ...input, state: out.endState });
  assert.equal(next.events.filter(e => e.kind === "normal").length, 2);
  // OFF comes from user statement/effect text; zero-gauge firing and next-turn two actions are measured.
});

test("T11/T12/T15: independent triggers, per-action CA selection, expiry, and unknown damage are explicit", () => {
  const four = calculateBattleTurn(activeInput(11, 0));
  const casts = four.events.filter(e => e.kind === "fighter-ability");
  assert.equal(casts.length, 4);
  assert.deepEqual(casts.map(e => e.kind === "fighter-ability" && e.trigger), ["ulfhedinn", "endless", "ulfhedinn", "endless"]);
  assert.ok(casts.every(e => e.kind === "fighter-ability" && !e.triggerOrderVerified && e.damage === null));
  assert.equal(four.damageCompleteness, "partial");
  const mixed = calculateBattleTurn(activeInput(12, 80));
  assert.deepEqual(mixed.events.filter(e => e.kind === "normal" || e.kind === "charge-attack").map(e => e.kind), ["normal", "charge-attack"]);
  assert.equal(mixed.events.filter(e => e.kind === "fighter-ability").length, 2);
  assert.ok(mixed.events.some(e => e.kind === "effect" && e.effect === "party-shield"));
  assert.ok(mixed.endState.fighterOrigin!.abilities!.endless);
  const expired = calculateBattleTurn(activeInput(15, 0, false));
  assert.equal(expired.events.filter(e => e.kind === "fighter-ability").length, 2);
  assert.ok(expired.events.filter(e => e.kind === "fighter-ability").every(e => e.kind === "fighter-ability" && e.trigger === "endless"));
});

test("endless alone guarantees TA in downside/normal and reaches a weapon CA during the second action", () => {
  for (const mode of ["downside", "normal"]) {
    const input = activeInput(15, 60, false);
    input.mode = mode;
    const before = structuredClone(input);
    const out = calculateBattleTurn(input);
    const own = out.events.filter(e => e.actorPosition === 0 && (e.kind === "normal" || e.kind === "charge-attack"));
    assert.deepEqual(own.map(e => e.kind), ["normal", "charge-attack"], mode);
    assert.equal(own[0].kind === "normal" && own[0].attackCount, 3, mode);
    assert.equal("fighterReplacement" in own[1] && own[1].fighterReplacement, false);
    const fang = out.events.filter(e => e.kind === "fighter-ability");
    assert.equal(fang.length, 1, mode);
    assert.equal(fang[0].kind === "fighter-ability" && fang[0].trigger, "endless");
    assert.equal(gaugeAfter(out, -1), 0, mode);
    assert.deepEqual(input, before);
  }
  const ordinary = activeInput(15, 60, false);
  ordinary.mode = "downside"; ordinary.state.fighterOrigin.abilities.endless = false;
  const control = calculateBattleTurn(ordinary);
  assert.equal(control.events.find(e => e.kind === "normal")?.attackCount, 2);
  assert.equal(gaugeAfter(control, -1), 84);
});

test("T21: counter is a reaction and adds +5, never another Fang trigger", () => {
  const input = activeInput(21, 0);
  input.protagonistIncoming = { hpBefore: 1000, hpAfter: 900, maxHp: 1000, incomingChargeGain: 2 };
  const out = calculateBattleTurn(input);
  assert.equal(out.incomingReaction!.counterActions, 1);
  assert.equal(out.incomingReaction!.chargeAfterCounter, 87);
  assert.equal(out.events.filter(e => e.kind === "fighter-ability").length, 4);
});

test("base ability needs no optional loadout; automatic casts preserve manual recast and replacement preserves a full gauge", () => {
  const base = request(); delete base.fighterLoadout;
  const wb = calculateBattleTurn({ ...base, action: { kind: "fighter-ability", ability: "weapon-burst" } });
  assert.equal(wb.endState.fighterOrigin!.level, 1);
  assert.deepEqual(wb.endState.fighterOrigin!.abilities!.loadout, []);
  const input = activeInput(11, 0); input.state.fighterOrigin.abilities.readyOnTurn[1] = 18;
  const out = calculateBattleTurn(input);
  assert.equal(out.events.filter(e => e.kind === "fighter-ability").length, 4);
  assert.equal(out.endState.fighterOrigin!.abilities!.readyOnTurn[1], 18);
  const full = activeInput(10, 100, false);
  Object.assign(full.state.fighterOrigin.abilities, { endless: false, unlimitedPrepared: true });
  full.protagonistCharge.enabled = false;
  const replacement = calculateBattleTurn(full);
  assert.equal(gaugeAfter(replacement, -1), 100);
  assert.equal(replacement.events.filter(e => e.kind === "charge-attack").length, 1);
});

test("manual restrictions/cooldowns/equipment/death/unsupported level/loadout changes fail without partial input mutation", () => {
  const input = activeInput(11, 0), before = structuredClone(input);
  for (const ability of ["weapon-burst", "beast-fang", "ulfhedinn", "unlimited-boost"]) {
    assert.throws(() => calculateBattleTurn({ ...input, action: { kind: "fighter-ability", ability } }), /ウールヴ/);
  }
  assert.deepEqual(input, before);
  assert.throws(() => calculateBattleTurn({ ...input, fighterLoadout: [] }), /変更/);
  const fresh = request(); fresh.fighterLoadout = [];
  assert.throws(() => calculateBattleTurn({ ...fresh, action: { kind: "fighter-ability", ability: "beast-fang" } }), /装備/);
  assert.throws(() => calculateBattleTurn({ ...fresh, defeatedPositions: [0], action: { kind: "fighter-ability", ability: "weapon-burst" } }), /戦闘不能/);
  fresh.calculation.deckConfig.protagonist.jobLevel = 49;
  assert.throws(() => calculateBattleTurn(fresh), /Lv50/);
  const ready = request();
  const first = calculateBattleTurn({ ...ready, action: { kind: "fighter-ability", ability: "weapon-burst" } });
  assert.throws(() => calculateBattleTurn({ ...ready, state: first.endState, action: { kind: "fighter-ability", ability: "weapon-burst" } }), /再使用待ち/);
  assert.throws(() => castFighterAbility(first.endState.fighterOrigin!, 1, 99, "ulfhedinn"), /100%/);
});

test("API/client state persists across manual actions, save/restore, next turn, undo, and malformed packets stay atomic", () => {
  const input = request(), setup = { request: input.calculation, enemyMaxHp: 1000000, protagonistMaxHp: 1000 };
  const initial = createInitialBattleState(setup); initial.party[0].charge = 30;
  const settings = { secondsPerTurn: 15, characters: {}, fighterLoadout: loadout };
  const manual = calculateBattleTurn(buildBattleTurnRequest(setup, initial, "upside", settings, { kind: "fighter-ability", ability: "weapon-burst" }));
  const packets = manual.events.flatMap(e => e.kind === "fighter-ability" ? automaticAbilityPackets(e, "upside") : [e]);
  const after = applyGeneratedTurn(initial, manual, packets);
  assert.equal(after.turn, 1); assert.equal(after.party[0].charge, 100); assert.equal(after.party[0].hp, 1000);
  assert.equal(after.enemy.hp, initial.enemy.hp); assert.equal(after.events.find((e: any) => e.kind === "unresolved").amount, null);
  const saved = serializeBattleSession(setup, after, [initial], settings, "upside");
  const restored = restoreBattleSession(saved, setup, initial);
  assert.deepEqual(restored.state, after); assert.deepEqual(restored.history.pop(), initial);
  const wool = calculateBattleTurn(buildBattleTurnRequest(setup, restored.state, "upside", restored.settings, { kind: "fighter-ability", ability: "ulfhedinn" }));
  assert.equal(wool.endState.fighterOrigin!.level, 2);
  const afterWool = applyGeneratedTurn(after, wool, wool.events.flatMap(e => e.kind === "fighter-ability" ? automaticAbilityPackets(e, "upside") : [e]));
  const next = calculateBattleTurn(buildBattleTurnRequest(setup, afterWool, "upside", settings));
  assert.equal(next.events.filter(e => e.kind === "fighter-ability").length, 1);
  const before = structuredClone(afterWool);
  assert.throws(() => applyGeneratedTurn(afterWool, next, [{ kind: "damage", actorPosition: 0, damage: NaN }]), /不正/);
  assert.deepEqual(afterWool, before);
  assert.throws(() => restoreBattleSession(saved, { ...setup, enemyMaxHp: 3 }, initial), /一致/);
  const damaged = JSON.parse(saved); damaged.state.party[0].charge = -1;
  assert.throws(() => restoreBattleSession(JSON.stringify(damaged), setup, initial), /不正/);
  const badSettings = JSON.parse(saved); badSettings.settings.secondsPerTurn = -1;
  assert.throws(() => restoreBattleSession(JSON.stringify(badSettings), setup, initial), /不正/);
});
