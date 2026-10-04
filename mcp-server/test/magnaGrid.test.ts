import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { calculateIlsaDamage } from "../src/calculator/ilsaDamage.ts";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";
import { calculateWeaponOverskills, applyDamageCapPenetration } from "../src/calculator/weaponOverskills.ts";
import { calculateDamageAttenuation } from "../src/calculator/damageAttenuationCalculator.ts";
import { finalizeNormalAttackHit } from "../web/normal-attack-rounding.js";
import { weaponAwakeningOptions } from "../src/calculator/weaponAwakening.ts";
import { weaponAwakeningStatBonus } from "../web/weapon-awakening-stats.js";
import type { CalculatorDeckConfig } from "../src/calculator/types.ts";

// Synthetic stats; no recorded inventory IDs, account data or combat responses.
function request(awakeningLevel = 4) {
  const ids = ["1040014300", ...Array(4).fill("1040422300"), "1040618800", "1040618800", "1040108700", "1040618800", "1040618800"];
  const deckConfig: CalculatorDeckConfig = { schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: { jobId: "110001", jobLevel: 20, elementCode: "6", attackOverride: 50000, hpOverride: 10000 },
    weapons: ids.map((weaponId, i) => ({ weaponId, slot: i + 1, position: i ? "grid" : "main", level: 150, uncapLevel: 4, skillLevel: 15,
      ...(weaponId === "1040422300" ? { awakening: { formCode: "1", level: 20 } }
        : i === 7 ? { awakening: { formCode: "1", level: awakeningLevel } }
        : i === 0 ? { awakening: { formCode: "7", level: 4 } } : {}) })),
    summons: [{ summonId: "2040046000", slot: 1, position: "main", level: 250, uncapLevel: 6 }],
    characters: [{ characterId: "3040456000", slot: 1, position: "front", level: 80, attackOverride: 50000, hpOverride: 10000 }] };
  return { schemaVersion: 1 as const, deckConfig, supportSummon: { summonId: "2040046000" }, enemy: { elementCode: "5", defense: 10, maxHp: 1e9 }, modifiers: {} };
}

test("dark Magna grid derives frames from weapon counts, auras and awakenings", () => {
  for (const level of [1, 4]) {
    const r = calculateNormalAttackFromRequest(request(level)).result;
    assert.equal(r.attackPower.totalEffectiveNormalAttackPercent, level === 4 ? 224 : 184);
    assert.equal(r.attackPower.totalEffectiveMagnaAttackPercent, 748.8); // Never round down to the displayed 748.
    assert.equal(r.attackPower.totalEffectiveExAttackPercent, 104);
    assert.equal(r.attackPower.totalWeaponElementalAttackPercent, 40);
    assert.equal(r.bodyDamageAttenuation.normalFrameDamageCapRawPercent, level === 4 ? 37 : 32);
    assert.equal(r.bodyDamageAttenuation.weaponOverskills.damageCapPenetrationPercent, level === 4 ? 8.5 : 6);
    assert.equal(r.bodyDamageAttenuation.weaponOverskills.addedHitRatePercent, 21);
    assert.equal(r.criticalBodyDamage?.weaponSkillCriticalRatePercent, 135.2);
    assert.equal(r.criticalBodyDamage?.criticalDamageBonusPercent, 58.8);
    const ability = calculateIlsaDamage({ ...request(level), attacker: { characterSlot: 1, currentHpPercent: 100 } }, "ability", 1);
    assert.equal(ability.criticalDamageBonusPercent, 58.8);
    assert.equal(ability.trace.weaponOverskills.damageCapPenetrationPercent, level === 4 ? 8.5 : 6);
  }
});

test("Stargaze counts each matching weapon once, requires Lv120, and Magna Boost caps at five copies", () => {
  const input = request();
  input.deckConfig.weapons = input.deckConfig.weapons.filter(w => w.weaponId !== "1040422300");
  let r = calculateNormalAttackFromRequest(input).result;
  assert.equal(r.attackPower.totalEffectiveExAttackPercent, 32); // four matching weapons, four Stargazes
  input.deckConfig.weapons[1].level = 119;
  r = calculateNormalAttackFromRequest(input).result;
  assert.equal(r.attackPower.totalEffectiveExAttackPercent, 24);
  input.deckConfig.weapons = Array.from({ length: 6 }, (_, i) => ({ weaponId: "1040618800", slot: i + 1, position: i ? "grid" : "main", level: 150, skillLevel: 15 }));
  r = calculateNormalAttackFromRequest(input).result;
  assert.equal(r.attackPower.totalEffectiveMagnaAttackPercent, 583.2); // 6 * 18 * (1 + 3.4 + 1)
  assert.equal(r.attackPower.totalEffectiveExAttackPercent, 72);
});

test("Revans flat attack uses cumulative levels and never adds to imported display overrides", () => {
  const options = weaponAwakeningOptions("1040422300")!;
  assert.equal(options.maximumLevel, 20);
  for (const [level, expected] of [[1, 0], [5, 100], [10, 200], [15, 500], [20, 500]]) {
    assert.equal(weaponAwakeningStatBonus({ level: 150, uncapLevel: 4, awakening: { formCode: "1", level } }, options).attack, expected);
  }
  const config = request().deckConfig;
  const r = resolveCalculatorDeckConfig(config).deck;
  assert.equal(r.weapons[1].attack, 3431);
  config.weapons[1].attackOverride = 3431;
  assert.equal(resolveCalculatorDeckConfig(config).deck.weapons[1].attack, 3431);
  config.weapons[1].awakening!.level = 1;
  assert.equal(resolveCalculatorDeckConfig(config).deck.weapons[1].attack, 2931);
});

test("cap penetration changes pass rates, leaves thresholds intact, and does not amplify sub-cap hits", () => {
  const profile = { id: "synthetic-normal", name: "normal", lines: [
    { threshold: 300000, passRate: .8 }, { threshold: 400000, passRate: .6 },
    { threshold: 500000, passRate: .05 }, { threshold: 600000, passRate: .01 }] };
  const penetrated = applyDamageCapPenetration(profile, 5);
  assert.equal(calculateDamageAttenuation(100000, penetrated).damage, 100000);
  assert.equal(calculateDamageAttenuation(720000, penetrated, { damageCapUpPercent: 20 }).damage, 542700);
  assert.deepEqual(penetrated.lines.map(l => l.threshold), profile.lines.map(l => l.threshold));
  assert.equal(profile.lines[0].passRate, .8);
  const deck = resolveCalculatorDeckConfig(request().deckConfig).deck;
  deck.effectiveWeaponSkillEffects = deck.effectiveWeaponSkillEffects!.filter(e => e.kind === "normal-frame-damage-cap-up").slice(0, 1);
  deck.effectiveWeaponSkillEffects[0].effectiveAmountPercent = 21.9;
  assert.equal(calculateWeaponOverskills(deck).damageCapPenetrationPercent, 0);
  deck.effectiveWeaponSkillEffects[0].effectiveAmountPercent = 22;
  assert.equal(calculateWeaponOverskills(deck).damageCapPenetrationPercent, 1);
});

test("added hits round the unsplit parent before 20%, preserve flat supplements, and generate once per multiattack", () => {
  const stages = { randomTargetHitCount: 1, addedHitMultiplier: .2, postAttenuationPercent: 0,
    supplementalDamagePerHit: 1000, beforePursuitRounding: "ceil" as const };
  assert.equal(finalizeNormalAttackHit(123456.3, 100, stages), 25691);
  assert.equal(finalizeNormalAttackHit(123456.3, 20, stages), 5938);
  const input = { calculation: request(), characters: [{ characterSlot: 1, currentHpPercent: 100 }], mode: "upside", secondsPerTurn: 15 };
  const upper = calculateBattleTurn(input).events.filter(e => e.kind === "normal");
  assert.ok(upper.every(e => e.addedHit));
  assert.equal(upper.find(e => e.actorPosition === 1)?.bodyHitCount, 10); // TA * 3 splits + 1
  const lower = calculateBattleTurn({ ...input, mode: "downside" }).events.filter(e => e.kind === "normal");
  assert.ok(lower.every(e => !e.addedHit));
});
