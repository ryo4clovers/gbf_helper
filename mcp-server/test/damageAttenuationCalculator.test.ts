import assert from "node:assert/strict";
import test from "node:test";

import {
	calculateDamageAttenuation,
	type DamageAttenuationProfile,
	PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES,
} from "../src/calculator/damageAttenuationCalculator.js";

test("applies every standard normal-attack attenuation segment", () => {
	const result = calculateDamageAttenuation(
		700_000,
		PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES.normalAttack,
	);

	assert.equal(result.damage, 446_000);
	assert.deepEqual(
		result.segments.map((segment) => [
			segment.inputDamage,
			segment.passRate,
			segment.outputDamage,
		]),
		[
			[300_000, 1, 300_000],
			[100_000, 0.8, 80_000],
			[100_000, 0.6, 60_000],
			[100_000, 0.05, 5_000],
			[100_000, 0.01, 1_000],
		],
	);
});

test("scales all lines before applying damage-cap up", () => {
	const result = calculateDamageAttenuation(
		700_000,
		PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES.normalAttack,
		{ damageCapUpPercent: 10 },
	);

	assert.deepEqual(
		result.scaledLines.map((line) => line.threshold),
		[330_000, 440_000, 550_000, 660_000],
	);
	assert.equal(result.damage, 489_900);
});

test("ceil of the cap increase preserves floating-point line shifts without rounding the cap total", () => {
  const profile = PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES.normalAttack;
  const thresholds = (percent: number) => calculateDamageAttenuation(1_100_000, profile,
    { damageCapUpPercent: percent, thresholdRounding: "ceil-increase" }).scaledLines.map(line => line.threshold);
  assert.deepEqual(thresholds(68), [504_001, 672_000, 840_000, 1_008_001]);
  assert.deepEqual(thresholds(95), [585_000, 780_000, 975_000, 1_170_000]);
  assert.deepEqual(thresholds(7), [321_001, 428_001, 535_000, 642_001]);
  assert.deepEqual(thresholds(0), [300_000, 400_000, 500_000, 600_000]);
  const fractional = calculateDamageAttenuation(20_000,
    { id: "fractional-cap", name: "fractional-cap", lines: [{ threshold: 12_345, passRate: 0.5 }] },
    { damageCapUpPercent: 1.23, thresholdRounding: "ceil-increase" });
  assert.equal(fractional.scaledLines[0].threshold, 12_497);
  assert.equal(fractional.damage, 16_248.5);
  assert.equal(fractional.thresholdRounding, "ceil-increase");
  assert.equal(calculateDamageAttenuation(1, profile, { damageCapUpPercent: 68 }).thresholdRounding, "none");
  assert.throws(() => calculateDamageAttenuation(1, profile, { thresholdRounding: "bad" as never }), /threshold rounding/);
});

test("reproduces the provisional standard charge-attack and chain-burst soft caps", () => {
	const profiles = PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES;

	assert.equal(
		calculateDamageAttenuation(2_500_000, profiles.chargeAttackMassive).damage,
		1_685_000,
	);
	assert.equal(
		calculateDamageAttenuation(1_500_000, profiles.chainBurst2).damage,
		1_160_000,
	);
	assert.equal(
		calculateDamageAttenuation(2_000_000, profiles.chainBurst3).damage,
		1_410_000,
	);
	assert.equal(
		calculateDamageAttenuation(2_500_000, profiles.chainBurst4).damage,
		1_685_000,
	);
});

test("supports an ability-specific profile with different lines and pass rates", () => {
	const profile: DamageAttenuationProfile = {
		id: "test-multihit-ability",
		name: "検証用多段アビリティ",
		lines: [
			{ threshold: 75_000, passRate: 0.7 },
			{ threshold: 100_000, passRate: 0.5 },
			{ threshold: 125_000, passRate: 0.05 },
			{ threshold: 250_000, passRate: 0.01 },
		],
	};

	assert.equal(calculateDamageAttenuation(250_000, profile).damage, 111_250);
});

test("keeps fractional diagnostics and rounds only the final value on request", () => {
	const profile: DamageAttenuationProfile = {
		id: "fractional-test",
		name: "端数テスト",
		lines: [{ threshold: 1, passRate: 1 / 3 }],
	};
	const result = calculateDamageAttenuation(2, profile, { rounding: "floor" });

	assert.equal(result.unroundedDamage, 1 + 1 / 3);
	assert.equal(result.damage, 1);
	assert.equal(result.segments[1].outputDamage, 1 / 3);
});

test("uses an empty profile as an identity transform", () => {
	const result = calculateDamageAttenuation(123.45, {
		id: "no-attenuation",
		name: "減衰なし",
		lines: [],
	});

	assert.equal(result.damage, 123.45);
	assert.deepEqual(
		result.segments.map((segment) => segment.passRate),
		[1],
	);
});

test("rejects invalid damage, cap boosts, thresholds, and pass rates", () => {
	const validProfile: DamageAttenuationProfile = {
		id: "valid",
		name: "valid",
		lines: [{ threshold: 100, passRate: 0.5 }],
	};

	assert.throws(
		() => calculateDamageAttenuation(-1, validProfile),
		/inputDamage/,
	);
	assert.throws(
		() =>
			calculateDamageAttenuation(1, validProfile, { damageCapUpPercent: -1 }),
		/damageCapUpPercent/,
	);
	assert.throws(
		() =>
			calculateDamageAttenuation(1, {
				...validProfile,
				lines: [{ threshold: 0, passRate: 0.5 }],
			}),
		/strictly increasing/,
	);
	assert.throws(
		() =>
			calculateDamageAttenuation(1, {
				...validProfile,
				lines: [{ threshold: 100, passRate: 1.1 }],
			}),
		/between 0 and 1/,
	);
	assert.throws(
		() =>
			calculateDamageAttenuation(1, validProfile, {
				rounding: "invalid" as never,
			}),
		/unsupported rounding mode/,
	);
});
