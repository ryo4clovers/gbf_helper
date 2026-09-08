import { test } from "node:test";
import assert from "node:assert/strict";
import { createEquipmentLevelOptions } from "../web/equipment-level-options.js";

const progression = {
  maximumLevel: 200,
  points: [
    { level: 1, attack: 340, hp: 37 },
    { level: 100, attack: 2155, hp: 219 },
    { level: 150, attack: 2520, hp: 255 },
    { level: 200, attack: 2700, hp: 273 },
  ],
};

test("offers only measured equipment breakpoints for a new selection", () => {
  assert.deepEqual(createEquipmentLevelOptions(progression, 200), [
    { level: 1, verified: true },
    { level: 100, verified: true },
    { level: 150, verified: true },
    { level: 200, verified: true },
  ]);
});

test("retains an imported intermediate level as a disabled UI option", () => {
  assert.deepEqual(createEquipmentLevelOptions(progression, 117), [
    { level: 1, verified: true },
    { level: 100, verified: true },
    { level: 117, verified: false },
    { level: 150, verified: true },
    { level: 200, verified: true },
  ]);
});
