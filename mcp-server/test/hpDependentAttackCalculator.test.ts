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
  assert.equal(calculateEnmityAmountPercent(7, 50), 7);
  assert.equal(calculateEnmityAmountPercent(7, 25), 13.125);
  assert.equal(calculateEnmityAmountPercent(7, 1), 20.6514);
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
  assert.equal(result.totalEffectiveNormalStaminaPercent, 11.308);
  assert.equal(result.totalEffectiveNormalEnmityPercent, 30.8);
  assert.equal(result.normalStaminaMultiplier, 1.11308);
  assert.equal(result.normalEnmityMultiplier, 1.308);
});

test("connects Froga skill 1296 to the 340% Agni aura at full HP", () => {
  const response = calculateNormalAttackFromRequest({
    schemaVersion: 1,
    protagonistCurrentHpPercent: 100,
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

  const stamina = response.result.hpDependentAttack;
  assert.equal(stamina.staminaContributions[0]?.sourceSkillId, "1296");
  assert.equal(stamina.staminaContributions[0]?.baseAmountPercent, 5.59);
  assert.equal(stamina.staminaContributions[0]?.effectiveAmountPercent, 24.596);
  assert.equal(
    response.result.baseDamage.stages.some(
      (stage) => stage.stage === "normal-stamina" && stage.totalPercent === 24.596,
    ),
    true,
  );
});

test("keeps Crimson Stinger skill 118 inactive at full HP", () => {
  const response = calculateNormalAttackFromRequest({
    schemaVersion: 1,
    protagonistCurrentHpPercent: 100,
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

  const enmity = response.result.hpDependentAttack;
  assert.equal(enmity.enmityContributions[0]?.sourceSkillId, "118");
  assert.equal(enmity.enmityContributions[0]?.skillLevel, 1);
  assert.equal(enmity.enmityContributions[0]?.effectiveAmountPercent, 0);
  assert.equal(enmity.normalEnmityMultiplier, 1);
});
