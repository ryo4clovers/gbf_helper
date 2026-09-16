import assert from "node:assert/strict";
import test from "node:test";
import {
  PROTAGONIST_CRITICAL_LIMIT_BONUS_DEFINITIONS,
  calculateProtagonistDisplayedStats,
  calculateProtagonistRankBaseStats,
  PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS,
  PROTAGONIST_MULTIATTACK_LIMIT_BONUS_DEFINITIONS,
  PROTAGONIST_PARTY_HP_LIMIT_BONUS_DEFINITIONS,
  PROTAGONIST_PROFICIENCY_ATTACK_LIMIT_BONUS_DEFINITIONS,
} from "../web/protagonist-displayed-stats.js";

test("registers all in-game elemental attack LB IDs and fields", () => {
  assert.equal(PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS.length, 18);
  assert.deepEqual(
    PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS.map(({ limitBonusId }) => limitBonusId),
    ["9", "67", "106", "10", "68", "107", "11", "69", "108", "12", "70", "109", "13", "71", "110", "14", "72", "111"],
  );
  assert.equal(new Set(PROTAGONIST_ELEMENT_ATTACK_LIMIT_BONUS_DEFINITIONS.map(({ fieldKey }) => fieldKey)).size, 18);
});

test("registers all observed proficiency attack LB IDs and targets", () => {
  assert.deepEqual(
    PROTAGONIST_PROFICIENCY_ATTACK_LIMIT_BONUS_DEFINITIONS.map(({ limitBonusId, target }) => [limitBonusId, target]),
    [["22", "first"], ["23", "second"], ["30", "first"], ["31", "second"], ["64", "first"], ["65", "second"], ["83", "both"], ["97", "both"]],
  );
});

test("registers all observed protagonist multiattack LB IDs and kinds", () => {
  assert.deepEqual(
    PROTAGONIST_MULTIATTACK_LIMIT_BONUS_DEFINITIONS.map(({ limitBonusId, kind }) => [limitBonusId, kind]),
    [["24", "double"], ["33", "double"], ["34", "triple"], ["88", "triple"], ["102", "double"]],
  );
});

test("registers all observed party HP LB IDs", () => {
  assert.deepEqual(
    PROTAGONIST_PARTY_HP_LIMIT_BONUS_DEFINITIONS.map(({ limitBonusId }) => limitBonusId),
    ["28", "40", "73"],
  );
});

test("registers all observed protagonist critical LB IDs", () => {
  assert.deepEqual(
    PROTAGONIST_CRITICAL_LIMIT_BONUS_DEFINITIONS.map(({ limitBonusId }) => limitBonusId),
    ["27", "38", "99"],
  );
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

test("reproduces every observed Knight party HP LB stage", () => {
  const input = {
    rank: 425, jobGrowthAttack: 0, jobGrowthHp: 0,
    completionAttackPercent: 24, completionHpPercent: 20,
    mainWeaponCompletionAttack: 4, jobWeaponKindCodes: ["1", "3"],
    weapons: [{ attack: 70, hp: 6, weaponKindCode: "1" }],
    summons: [{ attack: 4157, hp: 1414 }],
  };
  const stages = [
    [{}, 4062, 0],
    [{ partyHpLimitBonusLevel: 1 }, 4422, 300],
    [{ partyHpLimitBonusLevel: 2 }, 4782, 600],
    [{ partyHpLimitBonusLevel: 3 }, 5262, 1000],
    [{ partyHpLimitBonusLevel: 3, partyHpLimitBonus2Level: 3 }, 6462, 2000],
    [{ partyHpLimitBonusLevel: 3, partyHpLimitBonus2Level: 3, partyHpLimitBonus3Level: 3 }, 7662, 3000],
  ];
  for (const [levels, hp, contribution] of stages) {
    const result = calculateProtagonistDisplayedStats({ ...input, ...levels });
    assert.equal(result.hp, hp);
    assert.equal(result.attack, 14967);
    assert.equal(result.breakdown.partyLimitBonusHp, contribution);
  }
});

test("reproduces every observed Knight proficiency-1 attack LB stage", () => {
  const input = {
    rank: 425, jobGrowthAttack: 0, jobGrowthHp: 0,
    completionAttackPercent: 24, completionHpPercent: 20,
    mainWeaponCompletionAttack: 4, jobWeaponKindCodes: ["1", "3"],
    weapons: [{ attack: 70, hp: 6, weaponKindCode: "1" }],
    summons: [{ attack: 4157, hp: 1414 }],
  };
  const stages = [
    [{}, 14967, 0],
    [{ proficiency1AttackLimitBonusLevel: 3 }, 14972, 4],
    [{ proficiency1AttackLimitBonusLevel: 3, proficiency1AttackLimitBonus2Level: 3 }, 14975, 7],
    [{ proficiency1AttackLimitBonusLevel: 3, proficiency1AttackLimitBonus2Level: 3, proficiency1AttackLimitBonus3Level: 3 }, 14980, 11],
    [{ proficiency1AttackLimitBonusLevel: 3, proficiency1AttackLimitBonus2Level: 3, proficiency1AttackLimitBonus3Level: 3, proficiencyBothAttackLimitBonusLevel: 3 }, 14984, 14],
    [{ proficiency1AttackLimitBonusLevel: 3, proficiency1AttackLimitBonus2Level: 3, proficiency1AttackLimitBonus3Level: 3, proficiencyBothAttackLimitBonusLevel: 3, proficiencyBothAttackLimitBonus2Level: 3 }, 14989, 18],
  ];
  for (const [levels, attack, contribution] of stages) {
    const result = calculateProtagonistDisplayedStats({ ...input, ...levels });
    assert.equal(result.attack, attack);
    assert.equal(result.breakdown.proficiencyLimitBonusAttack, contribution);
  }
});

test("keeps proficiency-2 LB off the first weapon kind and applies it to the second", () => {
  const input = {
    rank: 425, jobGrowthAttack: 0, jobGrowthHp: 0,
    completionAttackPercent: 24, completionHpPercent: 20,
    mainWeaponCompletionAttack: 4, jobWeaponKindCodes: ["1", "3"],
    weapons: [{ attack: 70, hp: 6, weaponKindCode: "1" }],
    summons: [{ attack: 4157, hp: 1414 }],
    proficiency2AttackLimitBonusLevel: 3,
    proficiency2AttackLimitBonus2Level: 3,
    proficiency2AttackLimitBonus3Level: 3,
  };
  const firstWeaponResult = calculateProtagonistDisplayedStats(input);
  assert.equal(firstWeaponResult.attack, 14967);
  assert.equal(firstWeaponResult.breakdown.proficiencyLimitBonusAttack, 0);

  const secondWeaponResult = calculateProtagonistDisplayedStats({
    ...input,
    weapons: [{ attack: 70, hp: 6, weaponKindCode: "3" }],
  });
  assert.equal(secondWeaponResult.attack, 14980);
  assert.equal(secondWeaponResult.breakdown.proficiencyLimitBonusAttack, 11);
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
    partyLimitBonusHp: 0,
    jobGrowthAttack: 0,
    jobGrowthHp: 0,
    weaponAttack: 3115,
    weaponHp: 264,
    proficiencyAttack: 623,
    proficiencyHp: 53,
    proficiencyLimitBonusAttack: 0,
    mainWeaponCompletionAttack: 4,
    summonAttack: 4157,
    summonHp: 1414,
    attackSubtotal: 15724,
    hpSubtotal: 3695,
    completionAttackPercent: 24,
    completionHpPercent: 20,
  });
});
