import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type AbilityDamageProfile,
  resolveAbilityDamageVariant,
  validateAbilityDamageProfile,
} from "../src/calculator/abilityDamageProfile.js";

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
        multiplier: { min: 1.5, max: 1.5 },
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
