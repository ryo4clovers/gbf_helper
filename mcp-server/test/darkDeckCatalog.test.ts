import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import type { CalculatorDeckCharacterConfig } from "../src/calculator/types.ts";

function calculateGrid(characters: CalculatorDeckCharacterConfig[] = []) {
  // Synthetic stats; only the master IDs/slot structure come from the target grid.
  const equipment = [
    ["1040315100", 250, 1], ["1040314300", 150, 15], ["1040314300", 150, 15],
    ["1040817900", 200, 1], ["1040918100", 150, 15], ["1040918100", 150, 15],
    ["1040911000", 250, 25], ["1040916700", 150, 15], ["1040916700", 150, 15],
    ["1040014300", 150, 15],
  ] as const;
  return calculateNormalAttackFromRequest({
    schemaVersion: 1,
    deckConfig: {
      schemaVersion: 1, format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "6", attackOverride: 10000, hpOverride: 1000 },
      weapons: equipment.map(([weaponId, level, skillLevel], index) => ({
        slot: index + 1, position: index === 0 ? "main" : "grid", weaponId, level, skillLevel,
      })),
      summons: [{ slot: 1, position: "sub", summonId: "2040418000", uncapLevel: 4 }],
      characters,
    },
    supportSummon: { summonId: "2040090000" },
    enemy: { elementCode: "5", defense: 10 },
  });
}

test("calculates a two-copy dark pursuit grid without treating unimplemented skills as verified", () => {
  const result = calculateGrid();
  assert.equal(result.result.attackPower.specialExAttackPercent, 48);
  assert.equal(result.result.otherWeaponSkills.supplementalDamage.effectiveAmount, 100000);
  assert.equal(result.result.bodyDamageAttenuation.normalFrameDamageCapPercent, 14);
  // Without Sariel equipped, his passive must not be used to reach 35.1%.
  assert.equal(result.result.pursuitDamage?.effectivePursuitPercentage, 33.3);
  assert.equal(result.result.pursuitDamage?.pursuitEffects.length, 2);
  assert.ok(result.deckResolutionIssues.some((issue) =>
    issue.code === "weapon-skill-partially-supported" && issue.message.includes("1936"),
  ));
  assert.equal(result.result.status, "provisional");
});

test("Sariel's sourced draft boost works in front and back rows with character provenance", () => {
  for (const position of ["front", "back"] as const) {
    const result = calculateGrid([{ slot: 1, position, characterId: "3040611000", attackOverride: 1, hpOverride: 1 }]);
    assert.equal(result.result.pursuitDamage?.effectivePursuitPercentage, 35.1);
    assert.ok(result.result.pursuitDamage?.pursuitEffect.appliedModifiers.some((modifier) =>
      modifier.sourceType === "character-passive" && modifier.verificationStatus === "下書き",
    ));
    assert.ok(result.result.pursuitDamage?.issues.some((issue) => issue.code === "unverified-effective-pursuit"));
    assert.ok(result.deckResolutionIssues.some((issue) => issue.code === "character-passives-partially-supported"));
  }
});
