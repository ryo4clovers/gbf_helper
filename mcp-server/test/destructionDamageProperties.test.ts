import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackDamage } from "../src/calculator/normalAttackDamageCalculator.ts";
import type { DamageCalculationInput, EffectiveWeaponSkillEffect } from "../src/calculator/types.ts";

function input(targetElementCode: string): DamageCalculationInput {
  const effect = (kind: "destruction-pursuit" | "elemental-superiority-damage-up", amount: number): EffectiveWeaponSkillEffect => ({
    sourceWeaponSlot: 1, sourceWeaponId: "synthetic", sourceSkillId: kind, sourceSkillName: kind,
    kind, baseAmountPercent: amount, effectiveAmountPercent: amount, verificationStatus: "下書き", appliedModifiers: [],
  });
  return { schemaVersion: 1, targetEnemySlot: 1,
    deck: { schemaVersion: 1, protagonist: { attack: 1_000, elementCode: "6" }, weapons: [], characters: [],
      effectiveWeaponSkillEffects: [effect("destruction-pursuit", 20), effect("elemental-superiority-damage-up", 30)],
      summons: [{ slot: 1, position: "grid", instanceId: "synthetic", masterId: "synthetic", aura: {
        name: "synthetic", description: "synthetic", source: "synthetic", verificationStatus: "下書き",
        effects: [{ kind: "damage-dealt-up", elementCode: "6", targetElementCode: "5", amountPercent: 10,
          activation: "sub-only", stackingGroup: "synthetic", description: "闇キャラの対光与ダメージ" }],
      } }] },
    battle: { schemaVersion: 1, enemies: [{ slot: 1, enemyId: "synthetic", elementCode: targetElementCode, defense: 10 }],
      enemyPassiveEffectCount: 0, fieldEffectCount: 0 },
    crewModifiers: { shipAttackPercent: 10, furnaceAttackPercent: 10 },
    accountBonuses: { schemaVersion: 1, issues: [], modifiers: [
      { stage: "elemental-attack", amountPercent: 3, sourceType: "user-input", sourceId: "all-element", sourceName: "synthetic", verificationStatus: "下書き" },
      { stage: "elemental-attack", amountPercent: 10, elementCode: "6", sourceType: "user-input", sourceId: "dark", sourceName: "synthetic", verificationStatus: "下書き" },
      { stage: "damage-dealt", amountPercent: 3.6, sourceType: "user-input", sourceId: "generic", sourceName: "synthetic", verificationStatus: "下書き" },
      { stage: "target-element-damage", amountPercent: 5, elementCode: "6", targetElementCode: "5", sourceType: "user-input", sourceId: "vs-light", sourceName: "synthetic", verificationStatus: "下書き" },
    ] } };
}

test("destruction always gains 50% superiority and generic superior damage while explicit target-element bonuses keep their conditions", () => {
  // The 0 code is a synthetic neutral target here, not a claim about the game's response codes or public API support.
  for (const target of ["1", "2", "3", "4", "5", "6", "0"]) {
    const result = calculateNormalAttackDamage(input(target));
    const destruction = result.destructionPursuitDamage!;
    assert.equal(destruction.baseDamage, 150); // 1,000 * 1.5 / 10, without crew or elemental ATK.
    assert.equal(result.normalAttackSkillFrames.elementalSuperiority.effectivePercent, 30);
    assert.equal(destruction.stages?.postAttenuationPercent, target === "5" ? 48.6 : 33.6);
    assert.equal(result.bodyDamageAttenuation.postAttenuationPercent, target === "5" ? 48.6 : 3.6);
    assert.equal(result.summonDamageEffects.amplificationPercent, target === "5" ? 10 : 0);
  }
});

test("ship, reactor, element and all-element ATK changes never affect the destruction distribution", () => {
  for (const target of ["5", "6", "0"]) {
    const baseline = calculateNormalAttackDamage(input(target));
    const changed = input(target);
    changed.crewModifiers = { shipAttackPercent: 20, furnaceAttackPercent: 30 };
    for (const modifier of changed.accountBonuses!.modifiers) {
      if (modifier.stage === "elemental-attack") modifier.amountPercent += 100;
    }
    const result = calculateNormalAttackDamage(changed);
    assert.deepEqual(result.destructionPursuitDamage, baseline.destructionPursuitDamage);
    assert.notEqual(result.baseDamage.articleTrace?.prePostCapDamage, baseline.baseDamage.articleTrace?.prePostCapDamage);
  }
});
