import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateEquipmentLevelStats } from "../web/equipment-level-stats.js";

const forbiddenSpear = {
  maximumLevel: 150,
  points: [
    { level: 1, attack: 420, hp: 24 },
    { level: 100, attack: 2207, hp: 225 },
    { level: 150, attack: 2654, hp: 275 },
  ],
};

test("reproduces every observed Forbidden Calamity Spear level stat", () => {
  const observations = [
    [1, 420, 24],
    [2, 455, 28],
    [3, 473, 30],
    [11, 616, 46],
    [40, 1134, 104],
    [60, 1492, 144],
    [80, 1849, 184],
    [100, 2207, 225],
    [113, 2323, 238],
    [117, 2358, 242],
    [119, 2376, 244],
    [150, 2654, 275],
  ];

  for (const [level, attack, hp] of observations) {
    assert.deepEqual(calculateEquipmentLevelStats(forbiddenSpear, level), { attack, hp });
  }
});

test("adds plus marks after calculating and flooring level stats", () => {
  assert.deepEqual(
    calculateEquipmentLevelStats(forbiddenSpear, 117, 99, { attack: 5, hp: 1 }),
    { attack: 2853, hp: 341 },
  );
});

test("reproduces every observed Colossus Cane Omega boundary and Lv150 to Lv200 sample", () => {
  const progression = {
    maximumLevel: 200,
    points: [
      { level: 1, attack: 325, hp: 40 },
      { level: 100, attack: 1960, hp: 258 },
      { level: 150, attack: 2290, hp: 302 },
      { level: 200, attack: 2450, hp: 324 },
    ],
  };
  const observations = [
    [1, 325, 40],
    [100, 1960, 258],
    [150, 2290, 302],
    [151, 2293, 302],
    [152, 2296, 302],
    [200, 2450, 324],
  ];

  for (const [level, attack, hp] of observations) {
    assert.deepEqual(calculateEquipmentLevelStats(progression, level), { attack, hp });
  }
});

test("reproduces every observed Leviathan Gaze Omega boundary", () => {
  const progression = {
    maximumLevel: 200,
    points: [
      { level: 1, attack: 340, hp: 37 },
      { level: 100, attack: 2155, hp: 219 },
      { level: 150, attack: 2520, hp: 255 },
      { level: 200, attack: 2700, hp: 273 },
    ],
  };

  for (const [level, attack, hp] of [
    [1, 340, 37],
    [100, 2155, 219],
    [150, 2520, 255],
    [200, 2700, 273],
  ]) {
    assert.deepEqual(calculateEquipmentLevelStats(progression, level), { attack, hp });
  }
});

test("accepts verified breakpoint data up to level 250 but rejects guesses beyond it", () => {
  const progression = {
    maximumLevel: 250,
    points: [
      { level: 1, attack: 10, hp: 5 },
      { level: 100, attack: 110, hp: 55 },
      { level: 150, attack: 160, hp: 80 },
      { level: 200, attack: 210, hp: 105 },
      { level: 250, attack: 260, hp: 130 },
    ],
  };
  assert.deepEqual(calculateEquipmentLevelStats(progression, 225), { attack: 235, hp: 117 });
  assert.throws(() => calculateEquipmentLevelStats(progression, 251), /1〜250/);
});
