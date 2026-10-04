import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";
import { calculateWeaponChargeDamage, resolveWeaponChargeAttack } from "../src/calculator/weaponChargeAttack.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";

function request(eresh = false): any {
  const { deckConfig } = JSON.parse(readFileSync(new URL("../examples/battle-actions-request.v1.json", import.meta.url), "utf8"));
  if (!eresh) {
    deckConfig.weapons = [{ slot: 1, position: "main", weaponId: "1040014300", level: 150, uncapLevel: 4, skillLevel: 15 }];
    deckConfig.protagonist.jobId = "110001"; deckConfig.protagonist.jobLevel = 20;
    deckConfig.summons = []; deckConfig.characters = [];
  }
  return { calculation: { schemaVersion: 1, deckConfig, enemy: { elementCode: "5", defense: 10, maxHp: 1e9 } },
    protagonistCharge: { enabled: true, gauge: 100 }, mode: "downside", secondsPerTurn: 15,
    characters: deckConfig.characters.map((c: any) => ({ characterSlot: c.slot, currentHpPercent: 100, chargeGauge: 0 })) };
}

test("main weapon and researched upgrade stage select the CA, never a grid weapon", () => {
  assert.equal(resolveWeaponChargeAttack({ masterId: "1040014300", level: 100, uncapLevel: 3 }), undefined);
  const input = request(); input.calculation.deckConfig.weapons[0].position = "grid";
  assert.throws(() => calculateBattleTurn(input), /メイン武器の奥義は未対応/);
  input.protagonistCharge.enabled = false;
  assert.ok(calculateBattleTurn(input).events.some(e => e.kind === "normal"));
});

test("Fallen CA consumes gauge, buffs only after damage, caps stacks and retains retaliation calculation", () => {
  const input = request(), original = structuredClone(input);
  let result = calculateBattleTurn(input);
  assert.deepEqual(input, original);
  const ca = result.events.find(e => e.kind === "charge-attack")!;
  assert.equal(ca.actorPosition, 0);
  assert.equal(ca.kind === "charge-attack" && ca.damage.trace.intrinsicMultiplier, 5);
  assert.equal(ca.kind === "charge-attack" && ca.calculationPatch.battleEffects?.elementAttackPercent, 0);
  assert.equal(result.events.some(e => e.kind === "normal" && e.actorPosition === 0), false);
  assert.ok("protagonistCalculation" in result && result.protagonistCalculation?.incomingDamage);
  assert.equal(result.endState.weaponCharge?.darkAttackStacks, 1);
  assert.equal(ca.kind === "charge-attack" && ca.damage.trace.fixedChargeDamage, 4000);
  assert.ok(result.events.some(e => e.kind === "effect" && e.effect === "charge-ready" && e.value === 0));
  assert.ok(result.events.some(e => e.kind === "effect" && e.effect === "party-shield" && e.expiresOnTurn === 5));
  for (let i = 0; i < 4; i++) result = calculateBattleTurn({ ...input, state: result.endState });
  assert.equal(result.endState.weaponCharge?.darkAttackStacks, 3);
  assert.equal(result.endState.protagonistHitCount, 5); // One logical hit per CA.
});

test("Fallen elemental buff persists; critical expires independently and never strengthens allies", () => {
  const input = request(true); input.calculation.deckConfig.weapons = request().calculation.deckConfig.weapons;
  input.calculation.deckConfig.protagonist.jobId = "110001"; input.calculation.deckConfig.protagonist.jobLevel = 20;
  input.calculation.deckConfig.summons = [];
  const first = calculateBattleTurn(input);
  input.protagonistCharge = { enabled: false, gauge: 0 };
  const second = calculateBattleTurn({ ...input, state: first.endState });
  const mc = second.events.find(e => e.kind === "normal" && e.actorPosition === 0)!;
  assert.equal(mc.kind === "normal" && mc.calculationPatch.battleEffects?.elementAttackPercent, 10);
  assert.deepEqual(mc.criticalBuff, { ratePercent: 30, damagePercent: 50 });
  assert.ok(second.events.filter(e => e.kind === "normal" && e.actorPosition > 0).every(e => !e.criticalBuff && e.calculationPatch.battleEffects?.elementAttackPercent === 0));
  const expired = calculateBattleTurn({ ...input, state: { ...second.endState, turn: 5 } });
  assert.equal(expired.events.find(e => e.kind === "normal" && e.actorPosition === 0)?.criticalBuff, undefined);
  assert.equal(expired.endState.weaponCharge?.darkAttackStacks, 1);
});

test("Eresh opens with CA, grants max multistrike, normal-only supplements and next-turn TA", () => {
  const input = request(true); input.protagonistCharge.gauge = 0;
  const first = calculateBattleTurn(input);
  assert.equal(first.events.filter(e => e.kind === "charge-attack" && e.actorPosition === 0).length, 1);
  assert.equal(first.events.filter(e => e.kind === "normal" && e.actorPosition === 1).length, 2);
  assert.equal(first.events.filter(e => e.kind === "normal" && e.actorPosition === 2).length, 3);
  assert.equal(first.events.filter(e => e.kind === "normal" && e.actorPosition === 3).length, 2);
  assert.ok(first.events.filter(e => e.kind === "normal").every(e => e.calculationPatch.battleEffects?.normalAttackSupplementalDamage === 50000));
  assert.equal(first.endState.otherSelfReady, true); // Four TAs + one CA qualify.
  assert.equal(first.endState.protagonistHitCount, 1); // No automatic normal-attack reaction on CA.
  const gauges = first.events.filter(e => e.kind === "effect" && e.effect === "charge-ready" && e.actorPosition === 3);
  assert.ok(gauges.every(e => e.kind === "effect" && e.value === 0));
  const off = { ...input, protagonistCharge: { enabled: false, gauge: 100 } };
  const second = calculateBattleTurn({ ...off, state: first.endState });
  assert.ok(second.events.some(e => e.kind === "normal" && e.actorPosition === 0 && e.attackCount === 3));
  assert.equal(second.events.filter(e => e.kind === "normal" && e.actorPosition === 3).length, 1);
  assert.ok(second.events.filter(e => e.kind === "normal").every(e => !e.calculationPatch.battleEffects?.normalAttackSupplementalDamage));
  const third = calculateBattleTurn({ ...off, state: second.endState });
  assert.equal(third.events.find(e => e.kind === "normal" && e.actorPosition === 0)?.kind, "normal");
  assert.equal(third.endState.weaponCharge?.tripleAttackExpiresOnTurn, 3);
  const fourth = calculateBattleTurn({ ...input, state: { ...first.endState, turn: 4 }, protagonistCharge: { enabled: true, gauge: 100 } });
  assert.equal(fourth.events.filter(e => e.kind === "effect" && e.effect === "charge-ready" && e.actorPosition === 0).at(-1)?.value, 0);
});

test("weapon CA excludes ability-only job/LB/caps and reads CA LB without changing normal damage", () => {
  const input = request();
  const base = calculateWeaponChargeDamage(input.calculation);
  input.calculation.deckConfig.protagonist.otherLimitBonusLevels = { "5": 3, "32": 3, "84": 3, "89": 3, "21": 3, "91": 3 };
  const boosted = calculateWeaponChargeDamage(input.calculation);
  assert.equal(boosted.trace.damageContributions.limitBonus, 13);
  assert.equal(boosted.trace.damageContributions.jobLevel, 0);
  assert.equal(boosted.trace.capContributions.jobLevelCap, 0);
  assert.equal(boosted.trace.capContributions.limitBonusCap, 0);
  assert.equal(boosted.trace.capPercent, base.trace.capPercent);
  assert.ok(boosted.perHit.mean > base.perHit.mean);
  const normal = calculateNormalAttackFromRequest(input.calculation).result;
  input.calculation.battleEffects = { elementAttackPercent: 30 };
  assert.ok(calculateNormalAttackFromRequest(input.calculation).result.bodyDamageDistribution.preparedNominalDamage > normal.bodyDamageDistribution.preparedNominalDamage);
});
