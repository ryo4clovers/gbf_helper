import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { inferRandomMultiplierCandidates } from "../src/calculator/randomMultiplierInference.ts";

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

function agniRequest() {
  return {
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
}

test("serves the same normal attack calculation to Web and MCP callers", () => {
  const response = calculateNormalAttackFromRequest(request());

  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 3951);
  assert.equal(response.result.bodyDamageDistribution.minimumDamage, 3753);
  assert.equal(response.result.bodyDamageDistribution.maximumDamage, 4148);
  assert.equal(response.result.pursuitDamage?.effectivePursuitPercentage, 5.85);
  assert.equal(response.result.totalDamageDistribution.combinationCount, 10201);
  assert.equal(response.result.totalDamageDistribution.minimumDamage, 3973);
  assert.equal(response.result.totalDamageDistribution.maximumDamage, 4391);
});

test("reproduces the verified +0 through +5 Agni weapon-plus displays", () => {
  const input = agniRequest();
  const response = calculateNormalAttackFromRequest(input);

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
    const observedRequest = structuredClone(input);
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

test("reproduces all eight observed Agni battle body hits from the unrounded base", () => {
  const response = calculateNormalAttackFromRequest(agniRequest());
  const observedBodyDamage = [7725, 7685, 7629, 8229, 7693, 7901, 7685, 8245];
  const expectedMultipliers = [0.966, 0.961, 0.954, 1.029, 0.962, 0.988, 0.961, 1.031];
  const baseDamage = response.result.baseDamage;

  assert.equal(baseDamage.damageBeforeRandomAndCap, 7997);
  assert.equal(baseDamage.unroundedDamageBeforeRandomAndCap, 7997.7612);
  assert.equal(response.result.bodyDamageDistribution.finalRounding, "floor");
  assert.equal(response.result.bodyDamageDistribution.minimumDamage, 7597);
  assert.equal(response.result.bodyDamageDistribution.maximumDamage, 8397);

  const inference = inferRandomMultiplierCandidates(
    baseDamage.unroundedDamageBeforeRandomAndCap,
    observedBodyDamage,
    { finalRounding: "floor" },
  );
  assert.equal(inference.resolvedObservationCount, observedBodyDamage.length);
  assert.deepEqual(
    inference.observations.map((observation) => observation.candidates),
    expectedMultipliers.map((multiplier) => [multiplier]),
  );
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
