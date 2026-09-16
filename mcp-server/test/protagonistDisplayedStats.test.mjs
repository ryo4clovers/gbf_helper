import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProtagonistDisplayedStats,
  calculateProtagonistRankBaseStats,
  PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS,
} from "../web/protagonist-displayed-stats.js";

test("registers all in-game elemental attack LB IDs and fields", () => {
  assert.equal(PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS.length, 18);
  assert.deepEqual(
    PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS.map(({ limitBonusId }) => limitBonusId),
    ["9", "67", "106", "10", "68", "107", "11", "69", "108", "12", "70", "109", "13", "71", "110", "14", "72", "111"],
  );
  assert.equal(new Set(PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS.map(({ fieldKey }) => fieldKey)).size, 18);
});

test("reproduces every observed Knight attack and HP LB stage without double counting", () => {
  const input = {
    rank: 425, jobGrowthAttack: 0, jobGrowthHp: 0,
    completionAttackPercent: 24, completionHpPercent: 20,
    mainWeaponCompletionAttack: 4, jobWeaponKindCodes: ["1", "3"],
    weapons: [{ attack: 70, hp: 6, weaponKindCode: "1" }],
    summons: [{ attack: 4157, hp: 1414 }],
  };
  const attackObservations = [14967, 15587, 16827, 18687];
  const hpObservations = [4062, 4422, 4782, 5262];
  for (let level = 0; level <= 3; level++) {
    const attack = calculateProtagonistDisplayedStats({ ...input, attackLimitBonusLevel: level });
    const hp = calculateProtagonistDisplayedStats({ ...input, hpLimitBonusLevel: level });
    assert.equal(attack.attack, attackObservations[level]);
    assert.equal(attack.hp, 4062);
    assert.equal(hp.hp, hpObservations[level]);
    assert.equal(hp.attack, 14967);
    const combined = calculateProtagonistDisplayedStats({ ...input, attackLimitBonusLevel: level, hpLimitBonusLevel: level });
    assert.equal(combined.attack, attackObservations[level]);
    assert.equal(combined.hp, hpObservations[level]);
  }
  assert.equal(calculateProtagonistDisplayedStats(input).attack, 14967);
});

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
    limitBonusAttack: 0,
    limitBonusHp: 0,
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
