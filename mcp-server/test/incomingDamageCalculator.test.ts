import assert from "node:assert/strict";
import test from "node:test";
import { calculateIncomingDamagePrediction } from "../src/calculator/incomingDamageCalculator.ts";

test("adds defense and multiplies matching elemental reductions before the final ceiling", () => {
  const result = calculateIncomingDamagePrediction(10_000, 73, [5, 5, 5]);
  const raw = 10_000 / 1.73 * 0.95 ** 3;
  assert.equal(result.nominalDamage, Math.ceil(raw));
  assert.equal(result.minimumDamage, Math.ceil(raw * 0.95));
  assert.equal(result.maximumDamage, Math.ceil(raw * 1.05));
  assert.ok(Math.abs(result.effectiveElementalDamageReductionPercent - 14.2625) < 1e-9);
});

test("adds weapon-skill defense to the existing defense frame", () => {
  const contribution = (slot: number) => ({
    sourceWeaponSlot: slot,
    sourceWeaponId: "1040023700",
    sourceSkillId: "1913",
    sourceSkillName: "スカーレット・コンバージェンス",
    kind: "weapon-defense-up" as const,
    elementCode: "1",
    baseAmountPercent: 25,
    effectiveAmountPercent: 25,
    verificationStatus: "検証済み" as const,
    appliedModifiers: [],
  });
  const result = calculateIncomingDamagePrediction(
    10_000,
    73,
    [],
    {},
    [contribution(1), contribution(2)],
  );

  assert.equal(result.baseDefensePercent, 73);
  assert.equal(result.weaponDefensePercent, 50);
  assert.equal(result.defensePercent, 123);
  assert.equal(result.nominalDamage, Math.ceil(10_000 / 2.23));
});
