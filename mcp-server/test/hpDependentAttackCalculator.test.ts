import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateEnmityAmountPercent,
  calculateHpDependentAttack,
  calculateStaminaAmountPercent,
} from "../src/calculator/hpDependentAttackCalculator.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import type { DeckSnapshot, EffectiveWeaponSkillEffect } from "../src/calculator/types.ts";

test("reproduces published stamina and enmity checkpoints", () => {
  assert.equal(calculateStaminaAmountPercent(80, 15, 100), 5.59);
  assert.equal(calculateStaminaAmountPercent(80, 15, 75), 3.61);
  assert.equal(calculateStaminaAmountPercent(80, 15, 50), 2.57);
  assert.equal(calculateStaminaAmountPercent(80, 15, 24.99), 0);

  assert.equal(calculateEnmityAmountPercent(7, 100), 0);
  assert.equal(calculateEnmityAmountPercent(0.5, 50), 0.5);
  assert.equal(calculateEnmityAmountPercent(7, 50), 7);
  assert.equal(calculateEnmityAmountPercent(7, 25), 13.125);
  assert.equal(calculateEnmityAmountPercent(7, 1), 20.6514);
});

test("reproduces observed Nilakantha magna-stamina checkpoints", () => {
  const checkpoints = [
    { skillLevel: 15, hpPercent: 100, expectedDisplayPercent: 15 },
    { skillLevel: 15, hpPercent: 75, expectedDisplayPercent: 7.7 },
    { skillLevel: 15, hpPercent: 50, expectedDisplayPercent: 3.83 },
    { skillLevel: 1, hpPercent: 100, expectedDisplayPercent: 7.64 },
    { skillLevel: 1, hpPercent: 75, expectedDisplayPercent: 4.51 },
    { skillLevel: 1, hpPercent: 50, expectedDisplayPercent: 2.84 },
  ];

  for (const checkpoint of checkpoints) {
    assert.equal(
      Math.round(
        (calculateStaminaAmountPercent(56.4, checkpoint.skillLevel, checkpoint.hpPercent)
          + Number.EPSILON) * 100,
      ) / 100,
      checkpoint.expectedDisplayPercent,
    );
  }
});

test("adds same-frame skills and multiplies normal stamina and enmity as separate frames", () => {
  const effects: EffectiveWeaponSkillEffect[] = [
    {
      sourceWeaponSlot: 1,
      sourceWeaponId: "stamina",
      sourceSkillId: "1296",
      sourceSkillName: "火の渾身",
      kind: "normal-stamina-up",
      elementCode: "1",
      baseAmountPercent: 5.59,
      effectiveAmountPercent: 24.596,
      skillLevel: 15,
      hpDependentCurve: { kind: "stamina", coefficient: 80 },
      verificationStatus: "下書き",
      appliedModifiers: [],
    },
    {
      sourceWeaponSlot: 2,
      sourceWeaponId: "enmity",
      sourceSkillId: "118",
      sourceSkillName: "火の背水",
      kind: "normal-enmity-up",
      elementCode: "1",
      baseAmountPercent: 7,
      effectiveAmountPercent: 30.8,
      skillLevel: 15,
      hpDependentCurve: { kind: "enmity" },
      verificationStatus: "下書き",
      appliedModifiers: [],
    },
  ];
  const deck: DeckSnapshot = {
    schemaVersion: 1,
    protagonist: { attack: 10000, elementCode: "1" },
    weapons: [],
    summons: [],
    characters: [],
    effectiveWeaponSkillEffects: effects,
  };

  const result = calculateHpDependentAttack(deck, 50);
  assert.equal(result.totalEffectiveNormalStaminaPercent, 11.295971);
  assert.equal(result.totalEffectiveNormalEnmityPercent, 30.8);
  assert.equal(result.normalStaminaMultiplier, 1.11296);
  assert.equal(result.normalEnmityMultiplier, 1.308);
});

test("keeps normal and magna stamina in separate multiplicative frames", () => {
  const effects: EffectiveWeaponSkillEffect[] = [
    {
      sourceWeaponSlot: 1,
      sourceWeaponId: "normal",
      sourceSkillId: "1296",
      sourceSkillName: "火の渾身",
      kind: "normal-stamina-up",
      elementCode: "1",
      baseAmountPercent: 5.587798,
      effectiveAmountPercent: 24.586309,
      skillLevel: 15,
      hpDependentCurve: { kind: "stamina", coefficient: 80 },
      verificationStatus: "下書き",
      appliedModifiers: [],
    },
    {
      sourceWeaponSlot: 2,
      sourceWeaponId: "magna",
      sourceSkillId: "1213",
      sourceSkillName: "機炎方陣・渾身III",
      kind: "magna-stamina-up",
      elementCode: "1",
      baseAmountPercent: 15,
      effectiveAmountPercent: 15,
      skillLevel: 15,
      hpDependentCurve: { kind: "stamina", coefficient: 56.4 },
      verificationStatus: "下書き",
      appliedModifiers: [],
    },
  ];
  const result = calculateHpDependentAttack({
    schemaVersion: 1,
    protagonist: { attack: 10000, elementCode: "1" },
    weapons: [],
    summons: [],
    characters: [],
    effectiveWeaponSkillEffects: effects,
  }, 100);

  assert.equal(result.totalEffectiveNormalStaminaPercent, 24.586307);
  assert.equal(result.totalEffectiveMagnaStaminaPercent, 15.003247);
  assert.equal(result.normalStaminaMultiplier, 1.245863);
  assert.equal(result.magnaStaminaMultiplier, 1.150032);
});

function calculateFrogaAtHp(protagonistCurrentHpPercent: number) {
  return calculateNormalAttackFromRequest({
    schemaVersion: 1,
    protagonistCurrentHpPercent,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
    deckConfig: {
      schemaVersion: 1,
      format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "1", attackOverride: 10000, hpOverride: 1000 },
      weapons: [{
        slot: 1,
        position: "main",
        weaponId: "1040024600",
        level: 150,
        skillLevel: 15,
        attackOverride: 3045,
        hpOverride: 258,
      }],
      summons: [{
        slot: 1,
        position: "main",
        summonId: "2040094000",
        level: 250,
        uncapLevel: 6,
        attackOverride: 0,
        hpOverride: 0,
      }],
      characters: [],
    },
    enemy: { elementCode: "1", defense: 10 },
    modifiers: {},
  });
}

test("connects Froga skill 1296 to the 340% Agni aura at full HP", () => {
  const response = calculateFrogaAtHp(100);

  const stamina = response.result.hpDependentAttack;
  assert.equal(stamina.staminaContributions[0]?.sourceSkillId, "1296");
  assert.equal(stamina.staminaContributions[0]?.baseAmountPercent, 5.587798);
  assert.equal(stamina.staminaContributions[0]?.effectiveAmountPercent, 24.586309);
  assert.equal(
    response.result.baseDamage.stages.some(
      (stage) => stage.stage === "normal-stamina" && stage.totalPercent === 24.586309,
    ),
    true,
  );
});

test("reproduces Froga skill 1296's observed 11.3% display at HP50", () => {
  const stamina = calculateFrogaAtHp(50).result.hpDependentAttack;
  assert.equal(stamina.staminaContributions[0]?.sourceSkillId, "1296");
  assert.equal(stamina.staminaContributions[0]?.baseAmountPercent, 2.567266);
  assert.equal(stamina.staminaContributions[0]?.effectiveAmountPercent, 11.295971);
  assert.equal(Math.round(stamina.totalEffectiveNormalStaminaPercent * 100) / 100, 11.3);
});

test("reproduces Froga skill 1296's observed displays at HP25 and HP75", () => {
  const checkpoints = [
    { hpPercent: 25, expectedEffectivePercent: 9.515442, expectedDisplayPercent: 9.52 },
    { hpPercent: 75, expectedEffectivePercent: 15.903181, expectedDisplayPercent: 15.9 },
  ];
  for (const checkpoint of checkpoints) {
    const stamina = calculateFrogaAtHp(checkpoint.hpPercent).result.hpDependentAttack;
    assert.equal(stamina.staminaContributions[0]?.effectiveAmountPercent, checkpoint.expectedEffectivePercent);
    assert.equal(
      Math.round(stamina.totalEffectiveNormalStaminaPercent * 100) / 100,
      checkpoint.expectedDisplayPercent,
    );
  }
});

test("reproduces Froga skill 1296's observed absence at HP20 and 9.71% at HP30", () => {
  const checkpoints = [
    { hpPercent: 20, expectedEffectivePercent: 0, expectedDisplayPercent: 0 },
    { hpPercent: 30, expectedEffectivePercent: 9.707364, expectedDisplayPercent: 9.71 },
  ];
  for (const checkpoint of checkpoints) {
    const stamina = calculateFrogaAtHp(checkpoint.hpPercent).result.hpDependentAttack;
    assert.equal(stamina.staminaContributions[0]?.effectiveAmountPercent, checkpoint.expectedEffectivePercent);
    assert.equal(
      Math.round(stamina.totalEffectiveNormalStaminaPercent * 100) / 100,
      checkpoint.expectedDisplayPercent,
    );
  }
});

function calculateCrimsonStingerAtHp(protagonistCurrentHpPercent: number) {
  return calculateNormalAttackFromRequest({
    schemaVersion: 1,
    protagonistCurrentHpPercent,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
    deckConfig: {
      schemaVersion: 1,
      format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "1", attackOverride: 15574, hpOverride: 4117 },
      weapons: [
        {
          slot: 1,
          position: "main",
          weaponId: "1010000400",
          level: 1,
          skillLevel: 1,
          attackOverride: 70,
          hpOverride: 6,
        },
        {
          slot: 2,
          position: "grid",
          weaponId: "1040218700",
          level: 1,
          skillLevel: 1,
          attackOverride: 408,
          hpOverride: 38,
        },
      ],
      summons: [{
        slot: 1,
        position: "main",
        summonId: "2040094000",
        level: 250,
        uncapLevel: 6,
        attackOverride: 4157,
        hpOverride: 1414,
      }],
      characters: [],
    },
    enemy: { elementCode: "1", defense: 10 },
    modifiers: {},
  });
}

test("keeps Crimson Stinger skill 118 inactive at full HP", () => {
  const response = calculateCrimsonStingerAtHp(100);

  const enmity = response.result.hpDependentAttack;
  assert.equal(enmity.enmityContributions[0]?.sourceSkillId, "118");
  assert.equal(enmity.enmityContributions[0]?.skillLevel, 1);
  assert.equal(enmity.enmityContributions[0]?.effectiveAmountPercent, 0);
  assert.equal(enmity.normalEnmityMultiplier, 1);
});

test("reproduces Crimson Stinger skill 118's observed 2.2% display at HP50", () => {
  const enmity = calculateCrimsonStingerAtHp(50).result.hpDependentAttack;
  assert.equal(enmity.enmityContributions[0]?.sourceSkillId, "118");
  assert.equal(enmity.enmityContributions[0]?.baseAmountPercent, 0.5);
  assert.equal(enmity.enmityContributions[0]?.effectiveAmountPercent, 2.2);
  assert.equal(enmity.totalEffectiveNormalEnmityPercent, 2.2);
});

test("reproduces Crimson Stinger skill 118's observed displays at HP25 and HP75", () => {
  const checkpoints = [
    { hpPercent: 25, expectedEffectivePercent: 4.125, expectedDisplayPercent: 4.13 },
    { hpPercent: 75, expectedEffectivePercent: 0.825, expectedDisplayPercent: 0.83 },
  ];
  for (const checkpoint of checkpoints) {
    const enmity = calculateCrimsonStingerAtHp(checkpoint.hpPercent).result.hpDependentAttack;
    assert.equal(enmity.enmityContributions[0]?.effectiveAmountPercent, checkpoint.expectedEffectivePercent);
    assert.equal(
      Math.round((enmity.totalEffectiveNormalEnmityPercent + Number.EPSILON) * 100) / 100,
      checkpoint.expectedDisplayPercent,
    );
  }
});
