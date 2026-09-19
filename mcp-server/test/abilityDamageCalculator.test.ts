import assert from "node:assert/strict";
import test from "node:test";
import { calculateArmorBreakDamage } from "../src/calculator/abilityDamageCalculator.js";

test("adds both Armor Break LB stages as percentage points", () => {
  const result = calculateArmorBreakDamage({
    commonPreAbilityDamage: 10_000,
    abilityDamageUpPercent: 44,
    limitBonusPercent: 10,
    damageCapUpPercent: 0,
    limitBonusDamageCapUpPercent: 0,
    supplementalDamagePerHit: 0,
    postAttenuationPercent: 0,
    multiplierMin: 1,
    multiplierMax: 1,
    multiplierStep: 1,
  });

  assert.equal(result.intrinsicMultiplier, 1);
  assert.equal(result.effectiveMultiplier, 1.44);
  assert.equal(result.limitBonusPercent, 10);
  assert.equal(result.damageDistribution.minimumDamage, 14_400);
});

test("applies candidate attenuation, post-cap damage, and supplemental damage in order", () => {
  const result = calculateArmorBreakDamage({
    commonPreAbilityDamage: 350_000,
    abilityDamageUpPercent: 0,
    limitBonusPercent: 0,
    damageCapUpPercent: 0,
    limitBonusDamageCapUpPercent: 0,
    supplementalDamagePerHit: 10_000,
    postAttenuationPercent: 5,
    multiplierMin: 1,
    multiplierMax: 1,
    multiplierStep: 1,
  });

  // 300,000 + 50,000 * 70% = 335,000; then +5%, then fixed 10,000.
  assert.equal(result.damageDistribution.minimumDamage, 361_750);
  assert.equal(result.reliableThroughPreAttenuationDamage, 600_000);
  assert.deepEqual(result.issues, ["attenuation-lines-candidate", "fourth-pass-rate-unresolved"]);
});

test("raises every Armor Break attenuation line with ability-damage cap LB", () => {
  const result = calculateArmorBreakDamage({
    commonPreAbilityDamage: 350_000,
    abilityDamageUpPercent: 0,
    limitBonusPercent: 0,
    damageCapUpPercent: 10,
    limitBonusDamageCapUpPercent: 10,
    supplementalDamagePerHit: 0,
    postAttenuationPercent: 0,
    multiplierMin: 1,
    multiplierMax: 1,
    multiplierStep: 1,
  });

  // First line moves from 300,000 to 330,000: 330,000 + 20,000 * 70%.
  assert.equal(result.damageDistribution.minimumDamage, 344_000);
  assert.equal(result.limitBonusDamageCapUpPercent, 10);
  assert.equal(result.reliableThroughPreAttenuationDamage, 660_000);
});
