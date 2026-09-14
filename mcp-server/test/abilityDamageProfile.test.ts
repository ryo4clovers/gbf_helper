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
  assert.equal(variant.attenuation.status, "unresolved");
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
