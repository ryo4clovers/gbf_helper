import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialBattleState, applyGeneratedTurn, applyItem } from "../web/battle-state.js";
import { buildBattleTurnRequest } from "../web/battle-turn-client.js";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";

function setup(): any {
  return { protagonistMaxHp: 10000, enemyMaxHp: 1e9, request: {
    schemaVersion: 1, protagonistCurrentHpPercent: 100,
    enemy: { name: "ユーズド・木人", elementCode: "1", defense: 10 },
    deckConfig: { schemaVersion: 1, format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "1", jobId: "110001", jobLevel: 20, attackOverride: 10000, hpOverride: 1000 },
      weapons: [
        { slot: 1, position: "main", weaponId: "1040024600", level: 150, skillLevel: 15 },
        { slot: 2, position: "grid", weaponId: "1040218700", level: 1, skillLevel: 1 },
      ], summons: [], characters: [] },
  } };
}
const settings = { secondsPerTurn: 15, characters: {} };
const turn = (config: any, state: any, extra: any = {}) => calculateBattleTurn({ ...buildBattleTurnRequest(config, state, "downside", settings), ...extra });
function mcNormal(result: any) { return result.events.find((e: any) => e.kind === "normal" && e.actorPosition === 0).calculation; }

test("retaliation recalculates stamina/enmity using combat max HP; recovery and undo restore the original damage", () => {
  const config = setup(), initial = createInitialBattleState(config), first = turn(config, initial);
  const damaged = applyGeneratedTurn(initial, first, [], { enemyAttack: { damage: 5000 } });
  assert.equal(damaged.party[0].hp, 5000);
  assert.equal(buildBattleTurnRequest(config, damaged, "downside", settings).calculation.protagonistCurrentHpPercent, 50);
  const before = mcNormal(first), after = mcNormal(turn(config, damaged));
  assert.equal(before.hpDependentAttack.totalEffectiveNormalEnmityPercent, 0);
  assert.equal(after.hpDependentAttack.totalEffectiveNormalEnmityPercent, .5);
  assert.equal(before.hpDependentAttack.totalEffectiveNormalStaminaPercent, 2.1 + (100 / 65) ** 2.9);
  assert.equal(after.hpDependentAttack.totalEffectiveNormalStaminaPercent, 2.1 + (50 / 65) ** 2.9);
  assert.ok(after.bodyDamageDistribution.preparedNominalDamage < before.bodyDamageDistribution.preparedNominalDamage);
  const recovered = applyItem(damaged, { name: "合成回復", scope: "all", healPercent: 50 });
  assert.equal(recovered.party[0].hp, 10000);
  assert.deepEqual(mcNormal(turn(config, recovered)).bodyDamageDistribution, before.bodyDamageDistribution);
  assert.equal(initial.party[0].hp, 10000); // Undo snapshot was not mutated.
  assert.deepEqual(mcNormal(turn(config, initial)).hpDependentAttack, before.hpDependentAttack);
});

test("barrier absorption changes stamina only when real HP is lost", () => {
  const config = setup(), initial = createInitialBattleState(config), first = turn(config, initial);
  const shielded = applyGeneratedTurn(initial, first,
    [{ kind: "effect", actorPosition: 0, effect: "party-shield", value: 1500, expiresOnTurn: 5, name: "合成バリア" }],
    { enemyAttack: { damage: 1000 } });
  assert.equal(shielded.party[0].hp, 10000);
  assert.deepEqual(mcNormal(turn(config, shielded)).hpDependentAttack, mcNormal(first).hpDependentAttack);
  const second = turn(config, shielded);
  const damaged = applyGeneratedTurn(shielded, second, [], { enemyAttack: { damage: 1000 } });
  assert.equal(damaged.party[0].hp, 9500); // Only the unabsorbed 500 changes HP.
  assert.equal(mcNormal(turn(config, damaged)).hpDependentAttack.protagonistCurrentHpPercent, 95);
});

test("living HP below 1 percent is not clamped, while dead protagonists never attack", () => {
  const config = setup(), initial = createInitialBattleState(config), first = turn(config, initial);
  const critical = applyGeneratedTurn(initial, first, [], { enemyAttack: { damage: 9950 } });
  const next = turn(config, critical), result = mcNormal(next);
  assert.equal(result.hpDependentAttack.protagonistCurrentHpPercent, .5);
  assert.equal(result.hpDependentAttack.totalEffectiveNormalStaminaPercent, 0);
  assert.equal(result.hpDependentAttack.totalEffectiveNormalEnmityPercent, 1.487525);
  const onePercent = calculateNormalAttackFromRequest({ ...config.request, protagonistCurrentHpPercent: 1 }).result;
  assert.ok(result.hpDependentAttack.normalEnmityMultiplier > onePercent.hpDependentAttack.normalEnmityMultiplier);
  const dead = applyGeneratedTurn(critical, next, [], { enemyAttack: { damage: 50 } });
  assert.equal(turn(config, dead).events.length, 0);
  for (const hp of [0, -1, 100.01]) assert.throws(() => calculateNormalAttackFromRequest({ ...config.request, protagonistCurrentHpPercent: hp }));
});

test("character HP remains actor-specific below 1 percent for normals, skills and charge attacks", () => {
  const config = setup(); config.request.deckConfig.protagonist.elementCode = "6";
  config.request.deckConfig.weapons = [{ slot: 1, position: "main", weaponId: "1040014300", level: 150, uncapLevel: 4, skillLevel: 15 }];
  config.request.deckConfig.characters = [{ slot: 1, position: "front", characterId: "dark-ssr-ilsa-yukata", level: 80,
    attackOverride: 20000, hpOverride: 1000, mastery: { ring: [{ bonusId: "150004", name: "渾身", value: 8, unit: "rating" }], earring: [] } }];
  config.characterMaxHp = { 1: 20000 };
  const initial = createInitialBattleState(config); initial.party[1].hp = 100;
  const request = buildBattleTurnRequest(config, initial, "downside", { ...settings, characters: { 1: { currentHpPercent: 100 } } });
  assert.equal(request.characters[0].currentHpPercent, .5); // Stale saved settings cannot overwrite live HP.
  const result = calculateBattleTurn(request);
  assert.equal(mcNormal(result).hpDependentAttack.protagonistCurrentHpPercent, 100);
  const ally: any = result.events.find(e => e.kind === "normal" && e.actorPosition === 1);
  assert.equal(ally.calculation.hpDependentAttack.protagonistCurrentHpPercent, .5);
  const skill: any = calculateBattleTurn({ ...request, action: { kind: "ilsa-ability", characterSlot: 1, ability: 2 } }).events[0];
  const fullSkill: any = calculateBattleTurn({ ...request, characters: [{ characterSlot: 1, currentHpPercent: 100 }], action: { kind: "ilsa-ability", characterSlot: 1, ability: 2 } }).events[0];
  assert.ok(skill.damage.trace.commonPreAbilityDamage < fullSkill.damage.trace.commonPreAbilityDamage);
  const charge = calculateBattleTurn({ ...request, ilsaChargeEnabled: true, characters: [{ characterSlot: 1, currentHpPercent: .5, chargeGauge: 100 }] });
  assert.ok(charge.events.some(e => e.kind === "charge-attack" && e.actorPosition === 1));
});
