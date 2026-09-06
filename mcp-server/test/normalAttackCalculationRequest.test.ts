import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";

function request() {
  return {
    schemaVersion: 1,
    deckConfig: {
      schemaVersion: 1,
      format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "1", attackOverride: 19484, hpOverride: 3851 },
      weapons: [
        {
          slot: 1,
          position: "main",
          weaponId: "1040201400",
          skillLevel: 15,
          attackOverride: 2170,
          hpOverride: 241,
        },
        {
          slot: 2,
          position: "grid",
          weaponId: "1040218900",
          skillLevel: 15,
          attackOverride: 3609,
          hpOverride: 430,
        },
      ],
      summons: [],
      characters: [],
    },
    enemy: { elementCode: "1", defense: 10 },
    modifiers: {
      allElementAttackPercent: 3,
      elementAttackPercent: 10,
      shipAttackPercent: 10,
      furnaceAttackPercent: 10,
      jobNormalAttackDamagePercent: 3,
      damageDealtPercent: 3.6,
    },
  };
}

test("serves the same normal attack calculation to Web and MCP callers", () => {
  const response = calculateNormalAttackFromRequest(request());

  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 3951);
  assert.equal(response.result.bodyDamageDistribution.minimumDamage, 3754);
  assert.equal(response.result.bodyDamageDistribution.maximumDamage, 4149);
  assert.equal(response.result.pursuitDamage?.effectivePursuitPercentage, 5.85);
  assert.equal(response.result.totalDamageDistribution.combinationCount, 10201);
  assert.equal(response.result.totalDamageDistribution.minimumDamage, 3974);
  assert.equal(response.result.totalDamageDistribution.maximumDamage, 4392);
});

test("reproduces the verified +0 through +5 Agni weapon-plus displays", () => {
  const agniRequest = {
    schemaVersion: 1,
    deckConfig: {
      schemaVersion: 1,
      format: "gbf-helper-calculator-deck",
      protagonist: {
        elementCode: "1",
        jobId: "110001",
        jobNameHint: "ナイト",
        jobLevel: 20,
        masterLevel: 1,
        perfectionProofLevel: 0,
        attackOverride: 22801,
        hpOverride: 4877,
      },
      weapons: [
        {
          slot: 1,
          position: "main",
          weaponId: "1040201400",
          level: 150,
          skillLevel: 15,
          plusMark: 0,
          attackOverride: 2170,
          hpOverride: 241,
        },
        {
          slot: 2,
          position: "grid",
          weaponId: "1040218900",
          level: 150,
          skillLevel: 15,
          plusMark: 0,
          attackOverride: 3114,
          hpOverride: 331,
        },
      ],
      summons: [
        {
          slot: 1,
          position: "main",
          summonId: "2040094000",
          level: 250,
          uncapLevel: 6,
          plusMark: 0,
          attackOverride: 4157,
          hpOverride: 1414,
        },
      ],
      characters: [],
    },
    enemy: { elementCode: "1", defense: 10 },
    modifiers: {
      allElementAttackPercent: 3,
      elementAttackPercent: 10,
      shipAttackPercent: 10,
      furnaceAttackPercent: 10,
      jobNormalAttackDamagePercent: 3,
      damageDealtPercent: 3.6,
      targetElementDamagePercent: 0,
    },
  };
  const response = calculateNormalAttackFromRequest(agniRequest);

  assert.equal(response.result.attackPower.totalEffectiveNormalAttackPercent, 90);
  assert.equal(response.result.attackPower.normalAttackSkillMultiplier, 1.9);
  assert.equal(response.result.pursuitDamage?.effectivePursuitPercentage, 13.5);
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 7997);
  assert.equal(
    response.deckResolutionIssues.some(
      (issue) => issue.code === "multiple-weapon-skill-boosts-assumed-additive",
    ),
    false,
  );

  const observations = [
    { plusMark: 0, weaponAttack: 2170, protagonistAttack: 22801, displayedDamage: 7997 },
    { plusMark: 1, weaponAttack: 2175, protagonistAttack: 22809, displayedDamage: 7997 },
    { plusMark: 2, weaponAttack: 2180, protagonistAttack: 22816, displayedDamage: 8003 },
    { plusMark: 3, weaponAttack: 2185, protagonistAttack: 22825, displayedDamage: 8006 },
    { plusMark: 4, weaponAttack: 2190, protagonistAttack: 22832, displayedDamage: 8009 },
    { plusMark: 5, weaponAttack: 2195, protagonistAttack: 22840, displayedDamage: 8009 },
  ];
  for (const observation of observations) {
    const observedRequest = structuredClone(agniRequest);
    observedRequest.deckConfig.protagonist.attackOverride = observation.protagonistAttack;
    observedRequest.deckConfig.weapons[0].plusMark = observation.plusMark;
    observedRequest.deckConfig.weapons[0].attackOverride = observation.weaponAttack;

    const observedResponse = calculateNormalAttackFromRequest(observedRequest);
    assert.equal(
      observedResponse.result.baseDamage.damageBeforeRandomAndCap,
      observation.displayedDamage,
      `weapon +${observation.plusMark}`,
    );
  }
});

test("rejects unknown request fields and invalid enemy defense", () => {
  assert.throws(
    () => calculateNormalAttackFromRequest({ ...request(), unexpected: true }),
    /Unrecognized key/,
  );
  assert.throws(
    () => calculateNormalAttackFromRequest({ ...request(), enemy: { elementCode: "1", defense: 0 } }),
    /greater than 0/,
  );
});
