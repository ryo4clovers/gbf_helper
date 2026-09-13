import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import { calculateOtherWeaponSkills } from "../src/calculator/otherWeaponSkillCalculator.ts";

test("matches Colossus Buster Ira healing cap and debuff resistance at SLv15", () => {
  const resolution = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1040026100",
        level: 150,
        skillLevel: 15,
        attackOverride: 2826,
        hpOverride: 241,
      },
    ],
    summons: [
      {
        slot: 1,
        position: "main",
        summonId: "2040034000",
        level: 250,
        uncapLevel: 6,
        attackOverride: 2645,
        hpOverride: 1068,
      },
    ],
  });

  const result = calculateOtherWeaponSkills(resolution.deck);
  assert.equal(result.healingCap.uncappedPercent, 40.5);
  assert.equal(result.healingCap.effectivePercent, 40.5);
  assert.equal(result.healingCap.capPercent, 100);
  assert.equal(result.debuffResistance.effectivePercent, 10.8);
  assert.equal(result.incomingDebuffSuccessRateAt100Percent, 89.2);
  assert.equal(result.healingCap.contributions[0]?.sourceSkillId, "2373");
  assert.equal(result.debuffResistance.contributions[0]?.sourceSkillId, "2378");
});

test("caps combined healing cap at 100 percent", () => {
  const result = calculateOtherWeaponSkills({
    schemaVersion: 1,
    protagonist: { masterId: "0", elementCode: "1" },
    weapons: [],
    summons: [],
    effectiveWeaponSkillEffects: [
      {
        sourceWeaponSlot: 1,
        sourceWeaponId: "weapon-1",
        sourceSkillId: "heal-1",
        sourceSkillName: "healing 1",
        kind: "healing-cap-up",
        elementCode: "1",
        baseAmountPercent: 60,
        effectiveAmountPercent: 60,
        verificationStatus: "検証済み",
        appliedModifiers: [],
      },
      {
        sourceWeaponSlot: 2,
        sourceWeaponId: "weapon-2",
        sourceSkillId: "heal-2",
        sourceSkillName: "healing 2",
        kind: "healing-cap-up",
        elementCode: "1",
        baseAmountPercent: 50,
        effectiveAmountPercent: 50,
        verificationStatus: "検証済み",
        appliedModifiers: [],
      },
    ],
  });

  assert.equal(result.healingCap.uncappedPercent, 110);
  assert.equal(result.healingCap.effectivePercent, 100);
});

test("reports post-cap damage dealt from weapon skills", () => {
  const resolution = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1040310700",
        level: 250,
        skillLevel: 25,
        attackOverride: 4440,
        hpOverride: 318,
      },
    ],
    summons: [],
  });

  const result = calculateOtherWeaponSkills(resolution.deck);
  assert.equal(result.damageDealt.effectivePercent, 2);
  assert.equal(result.damageDealt.contributions[0]?.sourceSkillId, "2198");
});
