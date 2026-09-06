import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCalculatorDeckEquipmentRules } from "../src/calculator/calculatorDeckEquipmentRules.ts";
import { parseCalculatorDeckConfig } from "../src/calculator/calculatorDeckConfig.ts";

function config(input: Record<string, unknown>) {
  return parseCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: {},
    ...input,
  });
}

test("selects the first proficient fallback weapon and its element when the job changes", () => {
  const result = applyCalculatorDeckEquipmentRules(
    config({
      protagonist: { jobId: "140001", elementCode: "1" },
      weapons: [
        {
          slot: 1,
          position: "main",
          weaponId: "1010000400",
          isJobFallback: true,
          attackOverride: 70,
          hpOverride: 6,
        },
      ],
    }),
  );

  assert.equal(result.weapons[0].isJobFallback, true);
  assert.equal(result.weapons[0].weaponId, "1010100400");
  assert.equal(result.weapons[0].nameHint, "ブロンズナイフ");
  assert.equal(result.protagonist.elementCode, "2");
});

test("creates the job fallback when no main weapon is present", () => {
  const result = applyCalculatorDeckEquipmentRules(
    config({ protagonist: { jobId: "100501" }, weapons: [] }),
  );

  assert.equal(result.weapons[0].weaponId, "1010000400");
  assert.equal(result.weapons[0].isJobFallback, true);
  assert.equal(result.protagonist.elementCode, "1");
});

test("updates the protagonist element from a real main weapon without removing it", () => {
  const result = applyCalculatorDeckEquipmentRules(
    config({
      protagonist: { jobId: "100501", elementCode: "6" },
      weapons: [
        {
          slot: 1,
          position: "main",
          weaponId: "1040201400",
          attackOverride: 2170,
          hpOverride: 241,
        },
      ],
    }),
  );

  assert.equal(result.weapons[0].weaponId, "1040201400");
  assert.equal(result.protagonist.elementCode, "1");
});

test("keeps an explicit element when an unregistered main weapon cannot be resolved", () => {
  const result = applyCalculatorDeckEquipmentRules(
    config({
      protagonist: { elementCode: "6" },
      weapons: [{ slot: 1, position: "main", weaponId: "unknown" }],
    }),
  );

  assert.equal(result.protagonist.elementCode, "6");
});
