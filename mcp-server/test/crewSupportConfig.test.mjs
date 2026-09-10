import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCrewSupportEffects,
  defaultCrewSupportSettings,
  normalizeCrewSupportSettings,
} from "../web/crew-support-config.js";

test("crew support defaults every fixed support to enabled", () => {
  assert.deepEqual(defaultCrewSupportSettings(), {
    airshipEnabled: true,
    rainbowFurnaceEnabled: true,
    copperGongEnabled: true,
    potionMakerEnabled: true,
  });
});

test("crew support converts toggles into fixed calculation and battle effects", () => {
  assert.deepEqual(calculateCrewSupportEffects({
    airshipEnabled: false,
    rainbowFurnaceEnabled: true,
    copperGongEnabled: false,
    potionMakerEnabled: true,
  }), {
    shipAttackPercent: 0,
    furnaceAttackPercent: 10,
    battleStartChargeGaugePercent: 0,
    curePotionCount: 2,
  });
});

test("crew support fills missing legacy settings with enabled defaults", () => {
  assert.deepEqual(normalizeCrewSupportSettings({ airshipEnabled: false }), {
    airshipEnabled: false,
    rainbowFurnaceEnabled: true,
    copperGongEnabled: true,
    potionMakerEnabled: true,
  });
});
