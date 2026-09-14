import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  type AbilityDamageProfile,
  resolveAbilityDamageVariant,
  validateAbilityDamageProfile,
} from "../src/calculator/abilityDamageProfile.js";
import {
  ABILITY_DAMAGE_PROFILES,
  findAbilityDamageProfile,
} from "../src/calculator/abilityDamageProfiles.js";
import { calculateDamageAttenuation } from "../src/calculator/damageAttenuationCalculator.js";

function makeDriveBurstProfile(): AbilityDamageProfile {
  return {
    schemaVersion: 1,
    abilityId: "2040",
    name: "ドライブバースト",
    element: "own",
    targeting: "single",
    variants: [
      {
        id: "overdrive",
        condition: { type: "enemy-mode", mode: "overdrive" },
        multiplier: { min: 3, max: 3 },
        hitCount: 1,
        attenuation: { status: "unresolved" },
        verificationStatus: "下書き",
        source: "secondary-source-and-user-observation",
      },
      {
        id: "default",
        condition: { type: "always" },
        multiplier: { min: 1.84, max: 1.84 },
        hitCount: 1,
        attenuation: { status: "unresolved" },
        verificationStatus: "下書き",
        source: "user-observation",
      },
    ],
  };
}

test("resolves a conditional ability variant before the fallback", () => {
  const profile = makeDriveBurstProfile();

  assert.equal(resolveAbilityDamageVariant(profile, { enemyMode: "overdrive" }).id, "overdrive");
  assert.equal(resolveAbilityDamageVariant(profile, { enemyMode: "normal" }).id, "default");
});

test("accepts a resolved per-hit attenuation profile", () => {
  const profile = makeDriveBurstProfile();
  profile.variants[0].attenuation = {
    status: "resolved",
    profile: {
      id: "ability-2040-overdrive",
      name: "ドライブバースト OD中",
      lines: [{ threshold: 200_000, passRate: 0.5 }],
    },
  };

  assert.doesNotThrow(() => validateAbilityDamageProfile(profile));
});

test("rejects ambiguous or incomplete fallback definitions", () => {
  const profile = makeDriveBurstProfile();
  profile.variants[1].condition = { type: "enemy-mode", mode: "normal" };

  assert.throws(() => validateAbilityDamageProfile(profile), /exactly one always fallback/);
});

test("requires a confirmation date for verified variant data", () => {
  const profile = makeDriveBurstProfile();
  profile.variants[0].verificationStatus = "検証済み";

  assert.throws(() => validateAbilityDamageProfile(profile), /confirmedAt is required/);
});

test("supports a companion-weapon variant for multi-hit abilities", () => {
  const profile: AbilityDamageProfile = {
    schemaVersion: 1,
    abilityId: "200501",
    name: "ディストリーム",
    element: "weakness",
    targeting: "single",
    variants: [
      {
        id: "companion",
        condition: { type: "companion-weapon", equipped: true },
        multiplier: { min: 1, max: 1 },
        hitCount: 10,
        attenuation: { status: "unresolved" },
        verificationStatus: "下書き",
        source: "secondary-source-and-user-observation",
      },
      {
        id: "default",
        condition: { type: "always" },
        multiplier: { min: 1, max: 1 },
        hitCount: 5,
        attenuation: { status: "unresolved" },
        verificationStatus: "下書き",
        source: "secondary-source-and-user-observation",
      },
    ],
  };

  assert.equal(resolveAbilityDamageVariant(profile, { companionWeaponEquipped: true }).hitCount, 10);
  assert.equal(resolveAbilityDamageVariant(profile).hitCount, 5);
});

test("registers the observed normal-mode Drive Burst profile", () => {
  const profile = findAbilityDamageProfile("2040");
  assert.equal(profile, ABILITY_DAMAGE_PROFILES["2040"]);
  const variant = resolveAbilityDamageVariant(profile, { enemyMode: "normal" });

  assert.deepEqual(variant.multiplier, { min: 1.84, max: 1.84 });
  assert.equal(variant.verificationStatus, "検証済み");
  assert.equal(variant.attenuation.status, "partial");
  if (variant.attenuation.status === "partial") {
    assert.deepEqual(variant.attenuation.profile.lines, [{ threshold: 117_000, passRate: 0.6 }]);
  }
});

test("keeps the calculator profile identical to the knowledge entry", () => {
  const knowledgePath = new URL("../../knowledge/abilities/ability-effects.json", import.meta.url);
  const knowledge = JSON.parse(readFileSync(knowledgePath, "utf8")) as {
    abilities: Record<string, { damage_profile?: AbilityDamageProfile }>;
  };

  assert.deepEqual(knowledge.abilities["2040"].damage_profile, ABILITY_DAMAGE_PROFILES["2040"]);
  assert.doesNotThrow(() =>
    validateAbilityDamageProfile(knowledge.abilities["2040"].damage_profile as AbilityDamageProfile),
  );
});

test("reproduces all 11 observed non-OD Drive Burst hits", () => {
  const variant = resolveAbilityDamageVariant(ABILITY_DAMAGE_PROFILES["2040"], {
    enemyMode: "normal",
  });
  const commonPreAbilityDamage = 20_513.64161496;
  const postAttenuationDamageDealtMultiplier = 1.036;
  const observations = [39_300, 40_238, 37_579, 40_434, 39_144, 40_278, 39_417, 39_495, 37_618, 37_618, 39_417];
  const randomMultipliers = [1.005, 1.029, 0.961, 1.034, 1.001, 1.03, 1.008, 1.01, 0.962, 0.962, 1.008];

  const reproduced = randomMultipliers.map((randomMultiplier) =>
    Math.ceil(
      commonPreAbilityDamage
        * variant.multiplier.min
        * randomMultiplier
        * postAttenuationDamageDealtMultiplier,
    ),
  );
  assert.deepEqual(reproduced, observations);
});

test("reproduces all 21 observed protagonist normal-attack hits below attenuation", () => {
  const commonPreNormalDamage = 20_513.64161496;
  const postAttenuationDamageDealtMultiplier = 1.066;
  const observations = [
    21_103, 21_146, 21_168, 21_278, 21_321, 21_321, 21_343, 21_409, 21_474, 21_562, 21_584,
    21_737, 21_868, 22_130, 22_218, 22_349, 22_415, 22_458, 22_480, 22_568, 22_852,
  ];
  const randomMultipliers = [
    0.965, 0.967, 0.968, 0.973, 0.975, 0.975, 0.976, 0.979, 0.982, 0.986, 0.987, 0.994,
    1, 1.012, 1.016, 1.022, 1.025, 1.027, 1.028, 1.032, 1.045,
  ];

  const reproduced = randomMultipliers.map((randomMultiplier) =>
    Math.ceil(commonPreNormalDamage * randomMultiplier * postAttenuationDamageDealtMultiplier),
  );

  assert.deepEqual(reproduced, observations);
  assert.equal(commonPreNormalDamage * Math.max(...randomMultipliers), 21_436.7554876332);
});

test("reproduces grid 02 normal attacks and Drive Burst with one pre-attenuation base", () => {
  // The final ceil leaves an interval; its midpoint reproduces every observed hit.
  const inferredCommonPreDamage = (31_232.302529943638 + 31_232.307846757973) / 2;
  const normalObservations = [
    33_993, 33_794, 34_326, 34_459, 32_429, 34_160, 33_560, 32_029, 32_994, 33_094, 33_760,
  ];
  const normalRandomMultipliers = [
    1.021, 1.015, 1.031, 1.035, 0.974, 1.026, 1.008, 0.962, 0.991, 0.994, 1.014,
  ];
  const abilityObservations = [
    58_644, 59_715, 59_180, 62_395, 58_406, 58_406, 62_156, 60_311, 60_727, 61_561, 58_941,
  ];
  const abilityRandomMultipliers = [
    0.985, 1.003, 0.994, 1.048, 0.981, 0.981, 1.044, 1.013, 1.02, 1.034, 0.99,
  ];

  assert.deepEqual(
    normalRandomMultipliers.map((randomMultiplier) =>
      Math.ceil(inferredCommonPreDamage * randomMultiplier * 1.066),
    ),
    normalObservations,
  );
  assert.deepEqual(
    abilityRandomMultipliers.map((randomMultiplier) =>
      Math.ceil(inferredCommonPreDamage * 1.84 * randomMultiplier * 1.036),
    ),
    abilityObservations,
  );
});

test("reproduces grid 03 normal attacks and Drive Burst with one pre-attenuation base", () => {
  // The final ceil leaves an interval; its midpoint reproduces every observed hit.
  const inferredCommonPreDamage = (51_773.72065159788 + 51_773.82748490804) / 2;
  const normalObservations = [
    53_039, 54_639, 56_074, 55_412, 53_812, 55_798, 56_019, 52_984, 55_467, 52_708, 54_419,
    56_130, 56_019,
  ];
  const normalRandomMultipliers = [
    0.961, 0.99, 1.016, 1.004, 0.975, 1.011, 1.015, 0.96, 1.005, 0.955, 0.986, 1.017, 1.015,
  ];
  const abilityObservations = [
    101_951, 98_891, 94_647, 102_148, 102_543, 96_424, 100_668, 102_247, 101_852, 101_260,
    95_634, 102_740, 94_549,
  ];
  const abilityRandomMultipliers = [
    1.033, 1.002, 0.959, 1.035, 1.039, 0.977, 1.02, 1.036, 1.032, 1.026, 0.969, 1.041,
    0.958,
  ];

  assert.deepEqual(
    normalRandomMultipliers.map((randomMultiplier) =>
      Math.ceil(inferredCommonPreDamage * randomMultiplier * 1.066),
    ),
    normalObservations,
  );
  assert.deepEqual(
    abilityRandomMultipliers.map((randomMultiplier) =>
      Math.ceil(inferredCommonPreDamage * 1.84 * randomMultiplier * 1.036),
    ),
    abilityObservations,
  );
});

test("reproduces grid 04 and identifies Drive Burst's first attenuation line", () => {
  // Any value in the normal-hit-derived interval reproduces both series; use one near its lower edge.
  const inferredCommonPreDamage = 81_089.311;
  const normalObservations = [
    82_379, 88_516, 88_949, 85_232, 82_898, 88_171, 87_911, 87_306, 83_589, 85_059, 82_984,
    89_899, 86_269, 88_862, 82_379,
  ];
  const normalRandomMultipliers = [
    0.953, 1.024, 1.029, 0.986, 0.959, 1.02, 1.017, 1.01, 0.967, 0.984, 0.96, 1.04, 0.998,
    1.028, 0.953,
  ];
  const abilityObservations = [
    145_868, 142_622, 139_747, 143_271, 137_706, 141_323, 141_416, 136_686, 141_602, 137_428,
    139_283, 143_642, 138_819, 140_211, 137_521,
  ];
  const abilityRandomMultipliers = [
    1.05, 1.015, 0.984, 1.022, 0.962, 1.001, 1.002, 0.951, 1.004, 0.959, 0.979, 1.026,
    0.974, 0.989, 0.96,
  ];
  const variant = resolveAbilityDamageVariant(ABILITY_DAMAGE_PROFILES["2040"], {
    enemyMode: "normal",
  });
  assert.equal(variant.attenuation.status, "partial");
  if (variant.attenuation.status !== "partial") return;

  assert.deepEqual(
    normalRandomMultipliers.map((randomMultiplier) =>
      Math.ceil(inferredCommonPreDamage * randomMultiplier * 1.066),
    ),
    normalObservations,
  );
  assert.deepEqual(
    abilityRandomMultipliers.map((randomMultiplier) => {
      const preAttenuationDamage = inferredCommonPreDamage * 1.84 * randomMultiplier;
      const attenuated = calculateDamageAttenuation(
        preAttenuationDamage,
        variant.attenuation.profile,
      );
      return Math.ceil(attenuated.damage * 1.036);
    }),
    abilityObservations,
  );
});
