import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";
import { applyIlsaBattleEffects, castIlsaAbility, initialIlsaState, ilsaOnAllyDefeat } from "../src/calculator/ilsaBattleState.ts";
import { calculateIlsaDamage, ilsaSinProfile } from "../src/calculator/ilsaDamage.ts";
import { calculateDamageAttenuation } from "../src/calculator/damageAttenuationCalculator.ts";
import { createSelectableCharacterCatalog } from "../src/calculator/characterCatalogView.ts";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";

function input(): any {
  const example = JSON.parse(readFileSync(new URL("../examples/battle-actions-request.v1.json", import.meta.url), "utf8"));
  return { calculation: { schemaVersion: 1, deckConfig: example.deckConfig,
    enemy: { elementCode: "5", defense: 10, maxHp: 1_000_000_000 } },
    mode: "downside", secondsPerTurn: 15,
    characters: [1, 2, 3].map((characterSlot) => ({ characterSlot, currentHpPercent: 100, chargeGauge: 0 })) };
}
const cast = (ability: number) => ({ kind: "ilsa-ability", characterSlot: 3, ability });

test("catalog-selected character IDs run the same attacks, abilities and charge reset as numeric IDs", () => {
  const numeric = input(), selected = structuredClone(numeric);
  const catalog = createSelectableCharacterCatalog().characters;
  for (const character of selected.calculation.deckConfig.characters) {
    const entry = catalog.find((entry) => entry.masterId === character.characterId && !entry.styleId)!;
    assert.ok(entry);
    character.characterId = entry.characterId;
  }
  const original = structuredClone(selected);
  assert.deepEqual(resolveCalculatorDeckConfig(selected.calculation.deckConfig).deck,
    resolveCalculatorDeckConfig(numeric.calculation.deckConfig).deck);
  // Ordinary picker selection reaches both manual and automatic action paths.
  for (const ability of [1, 2, 3]) {
    const actual = calculateBattleTurn({ ...selected, action: cast(ability) });
    const expected = calculateBattleTurn({ ...numeric, action: cast(ability) });
    assert.deepEqual(actual, expected);
    selected.state = actual.endState; numeric.state = expected.endState;
  }
  assert.deepEqual(calculateBattleTurn(selected), calculateBattleTurn(numeric));
  selected.characters[2].chargeGauge = numeric.characters[2].chargeGauge = 100;
  const ougi = calculateBattleTurn({ ...selected, ilsaChargeEnabled: true });
  assert.deepEqual(ougi, calculateBattleTurn({ ...numeric, ilsaChargeEnabled: true }));
  assert.ok(ougi.events.some((event) => event.kind === "charge-attack"));
  assert.ok(calculateBattleTurn({ ...selected, state: ougi.endState, action: cast(2) })
    .events.some((event) => event.kind === "manual-ability"));
  assert.deepEqual(selected.calculation, original.calculation, "persisted knowledge IDs are preserved");
});

test("catalog-selected Ilsa reports the missing displayed ATK with an actionable message", () => {
  const request = input();
  request.calculation.deckConfig.characters[2].characterId = "dark-ssr-ilsa-yukata";
  delete request.calculation.deckConfig.characters[2].attackOverride;
  assert.throws(() => calculateBattleTurn(request), /前衛3の表示ATKが未入力.*編成画面/);
  assert.throws(() => calculateBattleTurn({ ...request, action: cast(2) }), /前衛3の表示ATKが未入力/);
});

test("manual abilities do not advance turns; buffs coexist with weapon echoes and expire after five attacks", () => {
  const request = input();
  request.calculation.deckConfig.weapons.push({ slot: 2, position: "grid", weaponId: "1040916700", level: 150, uncapLevel: 4, skillLevel: 15 });
  const original = structuredClone(request);
  const buff = calculateBattleTurn({ ...request, action: cast(1) });
  assert.deepEqual(request, original);
  assert.equal(buff.advancesTurn, false);
  assert.equal(buff.endState.turn, 1);
  assert.deepEqual(buff.endState.ilsa?.readyOnTurn, [13, 1, 1]);
  assert.throws(() => calculateBattleTurn({ ...request, state: buff.endState, action: cast(1) }), /再使用待ち/);
  const turn = calculateBattleTurn({ ...request, state: buff.endState });
  const normals = turn.events.filter((event) => event.kind === "normal");
  for (const event of normals) {
    assert.equal(event.calculation.abilityPursuitDamage?.frame, "skill-side-a");
    assert.equal(event.calculation.protagonistNormalAttackSupport.criticalTriggerRatePercent, 100);
    assert.equal(event.calculationPatch.battleEffects?.damageCapPercent, 15);
  }
  const ilsa = normals.find((event) => event.actorPosition === 3)!;
  assert.equal(ilsa.attackCount, 3);
  assert.equal(ilsa.splitCount, 3);
  assert.ok(ilsa.calculation.pursuitDamage); // Causality Driver's weapon echo stays separate.
  assert.equal(ilsa.calculation.destructionPursuitDamage, undefined);
  assert.equal(ilsa.pursuitHitCount, 18);
  const expired = calculateBattleTurn({ ...request, state: { ...turn.endState, turn: 6 } });
  assert.ok(expired.events.filter((event) => event.kind === "normal").every((event) => !event.calculation.abilityPursuitDamage));
});

test("skill 2 damages before applying its own DEF Down, and subsequent casts use the prior debuff", () => {
  const request = input();
  const first = calculateBattleTurn({ ...request, action: cast(2) });
  const damage = first.events[0];
  assert.equal(damage.kind, "manual-ability");
  if (damage.kind !== "manual-ability") throw Error();
  assert.equal(damage.hitCount, 1);
  assert.equal(first.endState.ilsa?.sinExpiresOnTurn, 6);
  const next = calculateBattleTurn({ ...request, state: { ...first.endState,
    ilsa: { ...first.endState.ilsa!, readyOnTurn: [1, 1, 1] } }, action: cast(2) });
  if (next.events[0].kind !== "manual-ability") throw Error();
  assert.ok(Math.abs(next.events[0].damage.trace.commonPreAbilityDamage / damage.damage.trace.commonPreAbilityDamage - 1 / .75) < 1e-8);
});

test("3-ability snapshots 2/3/4 attack actions; CA consumes an action, uses standard table, resets only skill 2", () => {
  for (const flowers of [1, 2, 3]) {
    const request = input();
    const first = calculateBattleTurn({ ...request, action: cast(1) });
    const sin = calculateBattleTurn({ ...request, state: first.endState, action: cast(2) });
    const multi = calculateBattleTurn({ ...request, state: { ...sin.endState,
      ilsa: { ...sin.endState.ilsa!, flowers } }, action: cast(3) });
    request.characters[2].chargeGauge = 100;
    const output = calculateBattleTurn({ ...request, state: multi.endState, ilsaChargeEnabled: true });
    const attacks = output.events.filter((event) => event.actorPosition === 3 && ["normal", "charge-attack"].includes(event.kind));
    assert.equal(attacks.length, flowers + 1);
    assert.equal(attacks[0].kind, "charge-attack");
    assert.ok(attacks.slice(1).every((event) => event.kind === "normal" && event.attackCount === 3));
    assert.deepEqual(output.endState.ilsa?.readyOnTurn, [13, 1, 10]);
    if (attacks[0].kind !== "charge-attack") throw Error();
    assert.deepEqual(attacks[0].damage.trace.attenuation.lines.map((line) => [line.threshold, line.passRate]),
      [[1500000, .6], [1700000, .3], [1800000, .05], [2500000, .01]]);
    assert.doesNotThrow(() => calculateBattleTurn({ ...request, state: output.endState, action: cast(2) }));
    const following = calculateBattleTurn({ ...request, state: output.endState });
    assert.equal(following.events.filter((event) => event.actorPosition === 3 && event.kind === "normal").length, 1);
  }
});

test("CA OFF preserves normal TA with full gauge; lack of gauge does not manufacture a CA", () => {
  const request = input(); request.characters[2].chargeGauge = 100;
  assert.ok(calculateBattleTurn(request).events.some((event) => event.kind === "normal" && event.actorPosition === 3));
  request.characters[2].chargeGauge = 99;
  assert.ok(!calculateBattleTurn({ ...request, ilsaChargeEnabled: true }).events.some((event) => event.kind === "charge-attack"));
  assert.throws(() => calculateBattleTurn({ ...request, action: { ...cast(1), characterSlot: 2 } }), /イルザ/);
});

test("ally defeat resets all cooldowns even at flower cap and only once per KO", () => {
  const full = { ...initialIlsaState(), flowers: 3, readyOnTurn: [30, 30, 30] as [number, number, number] };
  assert.deepEqual(ilsaOnAllyDefeat(full, 5, 1).readyOnTurn, [5, 5, 5]);
  const request = input(), first = calculateBattleTurn({ ...request, action: cast(1) });
  const next = calculateBattleTurn({ ...request, state: first.endState, defeatedPositions: [1], action: cast(1) });
  assert.equal(next.endState.ilsa?.flowers, 2);
  assert.throws(() => calculateBattleTurn({ ...request, state: next.endState, defeatedPositions: [1], action: cast(1) }), /再使用待ち/);
  const turn = calculateBattleTurn({ ...request, state: next.endState, defeatedPositions: [1] });
  assert.equal(turn.events.some((event) => event.actorPosition === 1), false);
});

test("buff targets, same-frame priority and multistrike strength are stable across later flower gains", () => {
  const buff = castIlsaAbility(initialIlsaState(), 1, 1);
  assert.equal(applyIlsaBattleEffects({}, buff, 1, false).abilityNormalPursuitPercent, undefined);
  assert.equal(applyIlsaBattleEffects({ abilityNormalPursuitPercent: 30 }, buff, 5, true).abilityNormalPursuitPercent, 30);
  assert.equal(applyIlsaBattleEffects({}, buff, 6, true).abilityNormalPursuitPercent, undefined);
  const multi = castIlsaAbility(buff, 1, 3);
  assert.equal(ilsaOnAllyDefeat(multi, 1, 1).multistrikeActions, 2);
});

test("Ilsa candidate curves and CA modifier isolation", () => {
  for (const [flowers, boundary] of [[1, 900000], [2, 1200000], [3, 1500000]]) {
    const profile = ilsaSinProfile(flowers);
    assert.equal(calculateDamageAttenuation(boundary + 10000, profile.attenuation).damage, boundary + 8000);
  }
  const request = input().calculation;
  request.attacker = { characterSlot: 3 };
  const base = calculateIlsaDamage(request, "charge", 1);
  const boosted = calculateIlsaDamage({ ...request, modifiers: { abilityDamagePercent: 100, abilityDamageCapPercent: 100 } }, "charge", 3);
  assert.deepEqual(base.predictions, boosted.predictions);
  assert.equal(base.hitCount, 1); // Neither TA nor three-way split applies to skills/CA.
});

test("Ilsa charge includes awakening and fixed CA damage before critical, without changing abilities", () => {
  const request = input().calculation;
  request.attacker = { characterSlot: 3 };
  request.deckConfig.characters[2].awakening = { level: 1, formCode: "4" };
  const abilityBefore = calculateIlsaDamage(request, "ability", 1);
  request.deckConfig.characters[2].awakening.level = 10;
  assert.deepEqual(calculateIlsaDamage(request, "ability", 1).predictions, abilityBefore.predictions);
  request.battleEffects = { criticalDamageBonusPercent: 20 };
  const charge = calculateIlsaDamage(request, "charge", 1);
  assert.equal(charge.trace.damageContributions.awakening, 5);
  assert.equal(charge.trace.fixedChargeDamage, 2000);
  const raw = (charge.trace.commonPreAbilityDamage * 4.5 * 1.05 * .95 + 2000) * 1.2;
  const attenuated = calculateDamageAttenuation(raw, charge.trace.attenuation, {
    damageCapUpPercent: charge.trace.capPercent, thresholdRounding: "ceil-increase",
  }).damage;
  assert.equal(charge.predictions[0].damage, Math.ceil((attenuated + charge.trace.supplementalDamage) * (1 + charge.trace.amplificationPercent / 100)));
  request.deckConfig.characters[2].awakening.formCode = "2";
  assert.equal(calculateIlsaDamage(request, "charge", 1).trace.capContributions.awakeningChargeCap, 15);
});

test("ability and charge round each cap increase before attenuation, without intermediate damage rounding", () => {
  const request = input().calculation;
  request.enemy.defense = 1;
  request.attacker = { characterSlot: 3 };
  request.deckConfig.weapons = [];
  request.deckConfig.summons = [];
  request.deckConfig.characters[2] = {
    slot: 3, position: "front", characterId: "3040456000", level: 80, attackOverride: 1000000, hpOverride: 2000,
  };
  for (const cap of [0, 28, 43]) for (const kind of ["ability", "charge"] as const) {
    request.modifiers = { damageCapPercent: cap, damageDealtPercent: 3.6 };
    request.battleEffects = { enemySupplementalDamage: 1234 };
    const result = calculateIlsaDamage(request, kind, 1);
    const trace = result.trace;
    assert.equal(trace.capPercent, cap);
    assert.equal(trace.thresholdRounding, "ceil-increase");
    // Literal boundaries pin the percent/100 multiplication order, including the
    // floating-point increment at 28%. Do not replace this with decimal rounding.
    const thresholds = kind === "ability"
      ? cap === 28 ? [1152001, 1536001, 1920001, 2304001]
        : cap === 43 ? [1287000, 1716000, 2145000, 2574000] : [900000, 1200000, 1500000, 1800000]
      : cap === 28 ? [1920001, 2176001, 2304001, 3200001]
        : cap === 43 ? [2145000, 2431000, 2574000, 3575000] : [1500000, 1700000, 1800000, 2500000];
    const rates = kind === "ability" ? [.8, .6, .4, .01] : [.6, .3, .05, .01];
    for (const prediction of result.predictions) {
      const raw = trace.commonPreAbilityDamage * trace.effectiveMultiplier * prediction.randomMultiplier + trace.fixedChargeDamage;
      assert.ok(raw > thresholds[3], "synthetic attack traverses all four boundaries");
      const attenuated = thresholds[0] + (thresholds[1] - thresholds[0]) * rates[0]
        + (thresholds[2] - thresholds[1]) * rates[1] + (thresholds[3] - thresholds[2]) * rates[2]
        + (raw - thresholds[3]) * rates[3];
      assert.equal(prediction.damage, Math.ceil((attenuated + 1234) * 1.036));
    }
  }
});
