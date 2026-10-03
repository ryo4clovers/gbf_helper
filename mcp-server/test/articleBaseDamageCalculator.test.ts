import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateArticleCrewAttackSteps, calculateArticleBaseDamage } from "../src/calculator/articleBaseDamageCalculator.ts";
import { calculateNormalAttackPower } from "../src/calculator/normalAttackPowerCalculator.ts";
import type { DamageCalculationInput, EffectiveWeaponSkillEffect } from "../src/calculator/types.ts";

test("article crew steps preserve K+epsilon for ship but avoid it for furnace", () => {
  const shipBoundary = calculateArticleCrewAttackSteps(26000, 10, 0);
  assert.equal(shipBoundary.precisionStep, 2600);
  assert.equal(shipBoundary.shipStepRaw, 2860.0000000000005);
  assert.equal(shipBoundary.shipStep, 2861);

  const furnaceBoundary = calculateArticleCrewAttackSteps(123714, 10, 10);
  assert.equal(furnaceBoundary.precisionStep, 12372);
  assert.equal(furnaceBoundary.shipStep, 13610);
  assert.equal(furnaceBoundary.furnaceStepRaw, 14971);
  assert.equal(furnaceBoundary.furnaceStep, 14971);
});

test("diagnostic weapon-frame ceilings propagate before EX, element and defense while preserving raw trace values", () => {
  const effect = (kind: "normal-attack-up" | "ex-attack-up", amount: number): EffectiveWeaponSkillEffect => ({
    sourceWeaponSlot: 1, sourceWeaponId: "synthetic", sourceSkillId: kind, sourceSkillName: kind, kind,
    baseAmountPercent: amount, effectiveAmountPercent: amount, verificationStatus: "下書き", appliedModifiers: [],
  });
  const input: DamageCalculationInput = { schemaVersion: 1, targetEnemySlot: 1,
    deck: { schemaVersion: 1, protagonist: { attack: 101, elementCode: "6" }, weapons: [], summons: [], characters: [],
      effectiveWeaponSkillEffects: [effect("normal-attack-up", 12.3), effect("ex-attack-up", 45.6)] },
    battle: { schemaVersion: 1, enemies: [{ slot: 1, enemyId: "synthetic", elementCode: "5", defense: 10 }],
      enemyPassiveEffectCount: 0, fieldEffectCount: 0 } };
  const power = calculateNormalAttackPower(input.deck);
  const normal = calculateArticleBaseDamage(input, power, undefined, "destruction", { weaponSkillRoundingStage: "normal-weapon-skill" });
  const ex = calculateArticleBaseDamage(input, power, undefined, "destruction", { weaponSkillRoundingStage: "ex-weapon-skill" });
  // ceil(110 * 1.123) * 1.456 * 1.5 / 10 = 27.0816; ceil(110 * 1.123 * 1.456) * 1.5 / 10 = 27.
  assert.ok(Math.abs(normal.articleTrace!.prePostCapDamage - 27.0816) < 1e-10);
  assert.equal(ex.articleTrace!.prePostCapDamage, 27);
  assert.equal(normal.stages.find(s => s.stage === "normal-weapon-skill")?.rawOutputDamage, 123.53);
  assert.equal(normal.stages.find(s => s.stage === "normal-weapon-skill")?.outputDamage, 124);
  assert.equal(normal.stages.find(s => s.stage === "ex-weapon-skill")?.inputDamage, 124);
  assert.equal(ex.stages.find(s => s.stage === "ex-weapon-skill")?.outputDamage, 180);
  assert.equal(normal.articleTrace?.weaponSkillRoundingStage, "normal-weapon-skill");
  const legacy = calculateArticleBaseDamage(input, power, undefined, "destruction");
  assert.ok(Math.abs(legacy.articleTrace!.prePostCapDamage - 26.978952) < 1e-10);
  assert.equal(legacy.articleTrace?.weaponSkillRoundingStage, undefined);
});
