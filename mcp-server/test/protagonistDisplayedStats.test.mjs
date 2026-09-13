import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProtagonistDisplayedStats,
  calculateProtagonistRankBaseStats,
} from "../web/protagonist-displayed-stats.js";

test("returns the provisional Rank 425 base stats", () => {
  assert.deepEqual(calculateProtagonistRankBaseStats(425), {
    rank: 425,
    attack: 7825,
    hp: 1964,
    verificationStatus: "下書き",
  });
});

test("derives the observed Froga protagonist ATK and pre-skill HP from components", () => {
  const result = calculateProtagonistDisplayedStats({
    rank: 425,
    jobGrowthAttack: 0,
    jobGrowthHp: 0,
    completionAttackPercent: 24,
    completionHpPercent: 20,
    mainWeaponCompletionAttack: 4,
    jobWeaponKindCodes: ["1", "3"],
    weapons: [
      { attack: 70, hp: 6, weaponKindCode: "1" },
      { attack: 3045, hp: 258, weaponKindCode: "1" },
    ],
    summons: [{ attack: 4157, hp: 1414 }],
  });

  assert.equal(result.attack, 19498);
  assert.equal(result.hp, 4434);
  assert.deepEqual(result.breakdown, {
    rankAttack: 7825,
    rankHp: 1964,
    jobGrowthAttack: 0,
    jobGrowthHp: 0,
    weaponAttack: 3115,
    weaponHp: 264,
    proficiencyAttack: 623,
    proficiencyHp: 53,
    mainWeaponCompletionAttack: 4,
    summonAttack: 4157,
    summonHp: 1414,
    attackSubtotal: 15724,
    hpSubtotal: 3695,
    completionAttackPercent: 24,
    completionHpPercent: 20,
  });
});
