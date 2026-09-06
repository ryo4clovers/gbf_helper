import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { inferRandomMultiplierCandidates } from "../src/calculator/randomMultiplierInference.ts";
import { calculateCriticalBodyDamageAtMultiplier } from "../src/calculator/criticalBodyDamageCalculator.ts";

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
        jobCompletionDoubleAttackRate: 7,
        jobCompletionTripleAttackRate: 5,
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

test("resolves protagonist DA and TA rates from the selected job", () => {
  const response = calculateNormalAttackFromRequest(agniRequest());

  assert.equal(response.result.multiattackRates.doubleAttackRatePercent, 14);
  assert.equal(response.result.multiattackRates.tripleAttackRatePercent, 8);
  assert.equal(response.result.multiattackRates.contributions[0]?.sourceName, "ナイト 基礎率");
  assert.deepEqual(
    response.result.multiattackRates.contributions.map((contribution) => contribution.sourceType),
    ["job-base", "job-completion"],
  );
});

test("adds boosted Solomon Accel trium rates to job and completion bonuses", () => {
  const input = agniRequest();
  input.deckConfig.protagonist.attackOverride = 27068;
  input.deckConfig.protagonist.hpOverride = 5095;
  input.deckConfig.weapons.push({
    slot: 3,
    position: "grid",
    weaponId: "1040915300",
    level: 150,
    skillLevel: 15,
    plusMark: 0,
    attackOverride: 3441,
    hpOverride: 182,
  });
  const response = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });

  assert.equal(response.result.multiattackRates.doubleAttackRatePercent, 46.9);
  assert.equal(response.result.multiattackRates.tripleAttackRatePercent, 40.9);
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 14852);
  const trium = response.result.multiattackRates.contributions.find(
    (contribution) => contribution.sourceName === "紅蓮の三手",
  );
  assert.equal(trium?.doubleAttackRatePercent, 32.9);
  assert.equal(trium?.tripleAttackRatePercent, 32.9);

  const advantageResponse = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
    enemy: { elementCode: "4", defense: 10 },
    modifiers: { ...input.modifiers, targetElementDamagePercent: 5 },
  });
  assert.equal(advantageResponse.result.baseDamage.damageBeforeRandomAndCap, 20985);
});

test("serves the same normal attack calculation to Web and MCP callers", () => {
  const response = calculateNormalAttackFromRequest(request());

  assert.equal(response.result.baseDamage.model, "article-2026-07");
  assert.equal(response.result.issues.includes("rounding-order-unresolved"), false);
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 3950);
  assert.equal(response.result.bodyDamageDistribution.minimumDamage, 3753);
  assert.equal(response.result.bodyDamageDistribution.maximumDamage, 4148);
  assert.equal(response.result.pursuitDamage?.effectivePursuitPercentage, 5.85);
  assert.equal(response.result.totalDamageDistribution.combinationCount, 10201);
  assert.equal(response.result.totalDamageDistribution.minimumDamage, 3972);
  assert.equal(response.result.totalDamageDistribution.maximumDamage, 4390);
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

test("applies support Agni's normal aura without stats or main-only elemental attack", () => {
  const withoutSupport = calculateNormalAttackFromRequest(agniRequest());
  const input = agniRequest();
  const withSupport = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });

  assert.equal(withSupport.result.attackPower.baseAttack, withoutSupport.result.attackPower.baseAttack);
  assert.equal(withSupport.result.attackPower.totalEffectiveNormalAttackPercent, 141);
  assert.equal(withSupport.result.attackPower.totalElementalSummonAuraPercent, 30);
  assert.equal(withSupport.result.attackPower.elementalSummonAuraContributions.length, 1);
  assert.equal(withSupport.result.baseDamage.damageBeforeRandomAndCap, 10144);
  assert.equal(withSupport.result.pursuitDamage?.effectivePursuitPercentage, 21.15);
  assert.deepEqual(withSupport.supportSummon, {
    summonId: "2040094000",
    name: "アグニス",
    callableFromTurn: 1,
    statsIncluded: false,
    subAuraIncluded: false,
    mainOnlyAuraEffectsIncluded: false,
  });
  assert.equal(
    withSupport.deckResolutionIssues.some(
      (issue) => issue.code === "multiple-weapon-skill-boosts-assumed-additive",
    ),
    false,
  );

  const advantageInput = structuredClone(input);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;
  const advantage = calculateNormalAttackFromRequest({
    ...advantageInput,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });
  const officialAdvantageDamage = 14332;
  assert.equal(advantage.result.baseDamage.model, "article-2026-07");
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 14332);
  assert.equal(
    advantage.result.baseDamage.damageBeforeRandomAndCap - officialAdvantageDamage,
    0,
  );
  assert.equal(advantage.result.criticalBodyDamage?.weaponSkillCriticalRatePercent, 28.2);
});

test("rejects support summon stats so they cannot enter deck attack or HP", () => {
  assert.throws(
    () =>
      calculateNormalAttackFromRequest({
        ...agniRequest(),
        supportSummon: { summonId: "2040094000", attackOverride: 999999 },
      }),
    /unrecognized key/i,
  );
});

test("accepts the former experimental article model name as a compatibility alias", () => {
  const response = calculateNormalAttackFromRequest({
    ...agniRequest(),
    calculationModel: "article-2026-07-experimental",
  });

  assert.equal(response.result.baseDamage.model, "article-2026-07");
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 7997);
});

test("legacy defense model records the 18 neutral support-Agni hits and unresolved fractional base", () => {
  const input = agniRequest();
  const response = calculateNormalAttackFromRequest({
    ...input,
    calculationModel: "defense-first-provisional",
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });
  const bodyObserved = [
    10519, 9981, 10326, 10336, 10286, 10134, 9931, 9890, 10255,
    10103, 10042, 10205, 9981, 10225, 10610, 10631, 10235, 10499,
  ];
  const pursuitObserved = [
    2130, 2177, 2053, 2104, 2239, 2190, 2044, 2083, 2072,
    2164, 2151, 2038, 2130, 2244, 2194, 2065, 2055, 2177,
  ];
  const body = response.result.bodyDamageDistribution;
  const pursuit = response.result.pursuitDamage;

  assert.ok(pursuit !== undefined);
  assert.equal(response.result.issues.includes("rounding-order-unresolved"), true);
  assert.equal(
    bodyObserved.every((damage) => damage >= body.minimumDamage && damage <= body.maximumDamage),
    true,
  );
  assert.equal(
    pursuitObserved.every(
      (damage) =>
        damage >= pursuit.damageDistribution.minimumDamage &&
        damage <= pursuit.damageDistribution.maximumDamage,
    ),
    true,
  );

  const currentBodyInference = inferRandomMultiplierCandidates(
    response.result.baseDamage.unroundedDamageBeforeRandomAndCap,
    bodyObserved,
    { finalRounding: "floor" },
  );
  const currentPursuitInference = inferRandomMultiplierCandidates(
    pursuit.nominalPursuitDamage,
    pursuitObserved,
    { finalRounding: "floor" },
  );
  assert.equal(currentBodyInference.resolvedObservationCount, 11);
  assert.equal(currentPursuitInference.resolvedObservationCount, 17);

  // Midpoints of the base intervals that explain every observed hit with the
  // verified 0.001 random step. These are evidence, not yet the calculator formula.
  const calibratedBodyInference = inferRandomMultiplierCandidates(10144.2, bodyObserved, {
    finalRounding: "floor",
  });
  const calibratedPursuitInference = inferRandomMultiplierCandidates(2145.35, pursuitObserved, {
    finalRounding: "floor",
  });
  assert.equal(calibratedBodyInference.resolvedObservationCount, 18);
  assert.equal(calibratedPursuitInference.resolvedObservationCount, 18);
  assert.deepEqual(
    calibratedBodyInference.observations.map((observation) => observation.candidates),
    [
      1.037, 0.984, 1.018, 1.019, 1.014, 0.999, 0.979, 0.975, 1.011,
      0.996, 0.99, 1.006, 0.984, 1.008, 1.046, 1.048, 1.009, 1.035,
    ].map((multiplier) => [multiplier]),
  );
  assert.deepEqual(
    calibratedPursuitInference.observations.map((observation) => observation.candidates),
    [
      0.993, 1.015, 0.957, 0.981, 1.044, 1.021, 0.953, 0.971, 0.966,
      1.009, 1.003, 0.95, 0.993, 1.046, 1.023, 0.963, 0.958, 1.015,
    ].map((multiplier) => [multiplier]),
  );
});

test("default article model resolves all 18 support-Agni body hits", () => {
  const input = agniRequest();
  const response = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });
  const bodyObserved = [
    10519, 9981, 10326, 10336, 10286, 10134, 9931, 9890, 10255,
    10103, 10042, 10205, 9981, 10225, 10610, 10631, 10235, 10499,
  ];
  const inference = inferRandomMultiplierCandidates(
    response.result.baseDamage.unroundedDamageBeforeRandomAndCap,
    bodyObserved,
    { finalRounding: "ceil" },
  );

  assert.equal(response.result.baseDamage.model, "article-2026-07");
  assert.equal(response.result.bodyDamageDistribution.finalRounding, "ceil");
  assert.equal(inference.resolvedObservationCount, 18);
});

test("legacy defense model retains the support-Agni +0 through +10 prediction drift", () => {
  const observations = [
    { plusMark: 0, weaponAttack: 2170, protagonistAttack: 22801, officialNormal: 10144, localNormal: 10144, officialAdvantage: 14332, localAdvantage: 14333 },
    { plusMark: 1, weaponAttack: 2175, protagonistAttack: 22809, officialNormal: 10144, localNormal: 10144, officialAdvantage: 14332, localAdvantage: 14333 },
    { plusMark: 2, weaponAttack: 2180, protagonistAttack: 22816, officialNormal: 10151, localNormal: 10152, officialAdvantage: 14343, localAdvantage: 14344 },
    { plusMark: 3, weaponAttack: 2185, protagonistAttack: 22825, officialNormal: 10155, localNormal: 10155, officialAdvantage: 14348, localAdvantage: 14349 },
    { plusMark: 4, weaponAttack: 2190, protagonistAttack: 22832, officialNormal: 10158, localNormal: 10159, officialAdvantage: 14353, localAdvantage: 14355 },
    { plusMark: 5, weaponAttack: 2195, protagonistAttack: 22840, officialNormal: 10158, localNormal: 10159, officialAdvantage: 14353, localAdvantage: 14355 },
    { plusMark: 6, weaponAttack: 2200, protagonistAttack: 22847, officialNormal: 10162, localNormal: 10163, officialAdvantage: 14358, localAdvantage: 14360 },
    { plusMark: 7, weaponAttack: 2205, protagonistAttack: 22854, officialNormal: 10166, localNormal: 10171, officialAdvantage: 14364, localAdvantage: 14371 },
    { plusMark: 8, weaponAttack: 2210, protagonistAttack: 22862, officialNormal: 10169, localNormal: 10174, officialAdvantage: 14369, localAdvantage: 14376 },
    { plusMark: 9, weaponAttack: 2215, protagonistAttack: 22869, officialNormal: 10169, localNormal: 10174, officialAdvantage: 14369, localAdvantage: 14376 },
    { plusMark: 10, weaponAttack: 2220, protagonistAttack: 22878, officialNormal: 10173, localNormal: 10178, officialAdvantage: 14374, localAdvantage: 14381 },
  ];
  const differences: Array<[number, number]> = [];

  for (const observation of observations) {
    const input = agniRequest();
    input.deckConfig.protagonist.attackOverride = observation.protagonistAttack;
    input.deckConfig.weapons[0].plusMark = observation.plusMark;
    input.deckConfig.weapons[0].attackOverride = observation.weaponAttack;
    const supportSummon = { summonId: "2040094000", nameHint: "アグニス" };
    const normal = calculateNormalAttackFromRequest({
      ...input,
      calculationModel: "defense-first-provisional",
      supportSummon,
    });
    const advantageInput = structuredClone(input);
    advantageInput.enemy.elementCode = "4";
    advantageInput.modifiers.targetElementDamagePercent = 5;
    const advantage = calculateNormalAttackFromRequest({
      ...advantageInput,
      calculationModel: "defense-first-provisional",
      supportSummon,
    });

    assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, observation.localNormal);
    assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, observation.localAdvantage);
    differences.push([
      normal.result.baseDamage.damageBeforeRandomAndCap - observation.officialNormal,
      advantage.result.baseDamage.damageBeforeRandomAndCap - observation.officialAdvantage,
    ]);
  }
  assert.deepEqual(differences, [
    [0, 1], [0, 1], [1, 1], [0, 1], [1, 2],
    [1, 2], [1, 2], [5, 7], [5, 7], [5, 7], [5, 7],
  ]);
});

test("article model reproduces all support-Agni +0 through +10 normal and advantageous displays", () => {
  const observations = [
    { plusMark: 0, weaponAttack: 2170, protagonistAttack: 22801, normal: 10144, advantage: 14332 },
    { plusMark: 1, weaponAttack: 2175, protagonistAttack: 22809, normal: 10144, advantage: 14332 },
    { plusMark: 2, weaponAttack: 2180, protagonistAttack: 22816, normal: 10151, advantage: 14343 },
    { plusMark: 3, weaponAttack: 2185, protagonistAttack: 22825, normal: 10155, advantage: 14348 },
    { plusMark: 4, weaponAttack: 2190, protagonistAttack: 22832, normal: 10158, advantage: 14353 },
    { plusMark: 5, weaponAttack: 2195, protagonistAttack: 22840, normal: 10158, advantage: 14353 },
    { plusMark: 6, weaponAttack: 2200, protagonistAttack: 22847, normal: 10162, advantage: 14358 },
    { plusMark: 7, weaponAttack: 2205, protagonistAttack: 22854, normal: 10166, advantage: 14364 },
    { plusMark: 8, weaponAttack: 2210, protagonistAttack: 22862, normal: 10169, advantage: 14369 },
    { plusMark: 9, weaponAttack: 2215, protagonistAttack: 22869, normal: 10169, advantage: 14369 },
    { plusMark: 10, weaponAttack: 2220, protagonistAttack: 22878, normal: 10173, advantage: 14374 },
  ];

  for (const observation of observations) {
    const input = agniRequest();
    input.deckConfig.protagonist.attackOverride = observation.protagonistAttack;
    input.deckConfig.weapons[0].plusMark = observation.plusMark;
    input.deckConfig.weapons[0].attackOverride = observation.weaponAttack;
    const supportSummon = { summonId: "2040094000", nameHint: "アグニス" };
    const normal = calculateNormalAttackFromRequest({
      ...input,
      calculationModel: "article-2026-07",
      supportSummon,
    });
    const advantageInput = structuredClone(input);
    advantageInput.enemy.elementCode = "4";
    advantageInput.modifiers.targetElementDamagePercent = 5;
    const advantage = calculateNormalAttackFromRequest({
      ...advantageInput,
      calculationModel: "article-2026-07",
      supportSummon,
    });

    assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, observation.normal, `normal +${observation.plusMark}`);
    assert.equal(
      advantage.result.baseDamage.damageBeforeRandomAndCap,
      observation.advantage,
      `advantage +${observation.plusMark}`,
    );
  }
});

test("legacy defense model reproduces all eight observed Agni battle body hits", () => {
  const response = calculateNormalAttackFromRequest({
    ...agniRequest(),
    calculationModel: "defense-first-provisional",
  });
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

test("article model reproduces all eight observed Agni body hits with final ceil", () => {
  const input = agniRequest();
  const response = calculateNormalAttackFromRequest({
    ...input,
    calculationModel: "article-2026-07",
  });
  const observedBodyDamage = [7725, 7685, 7629, 8229, 7693, 7901, 7685, 8245];
  const expectedMultipliers = [0.966, 0.961, 0.954, 1.029, 0.962, 0.988, 0.961, 1.031];
  const baseDamage = response.result.baseDamage;

  assert.equal(baseDamage.model, "article-2026-07");
  assert.equal(baseDamage.damageBeforeRandomAndCap, 7997);
  assert.equal(baseDamage.articleTrace?.precisionStep, 2281);
  assert.equal(baseDamage.articleTrace?.shipStep, 2510);
  assert.equal(baseDamage.articleTrace?.furnaceStep, 2761);
  assert.equal(baseDamage.articleTrace?.postCapDamagePercent, 6.6);
  assert.equal(response.result.bodyDamageDistribution.finalRounding, "ceil");

  const inference = inferRandomMultiplierCandidates(
    baseDamage.unroundedDamageBeforeRandomAndCap,
    observedBodyDamage,
    { finalRounding: "ceil" },
  );
  assert.equal(inference.resolvedObservationCount, observedBodyDamage.length);
  assert.deepEqual(
    inference.observations.map((observation) => observation.candidates),
    expectedMultipliers.map((multiplier) => [multiplier]),
  );
});

test("legacy defense model reproduces 11,300 with its calibrated additive stage", () => {
  const input = agniRequest();
  input.enemy.elementCode = "4";
  input.modifiers.targetElementDamagePercent = 5;

  const response = calculateNormalAttackFromRequest({
    ...input,
    calculationModel: "defense-first-provisional",
  });
  const targetElementStage = response.result.baseDamage.stages.find(
    (stage) => stage.stage === "target-element-damage",
  );

  assert.equal(targetElementStage?.totalPercent, 5);
  assert.equal(targetElementStage?.additiveBasePercent, 6.6);
  assert.equal(targetElementStage?.multiplier, 1.046904);
  assert.equal(response.result.baseDamage.unroundedDamageBeforeRandomAndCap, 11300.471475);
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 11300);
});

test("reproduces all 18 observed advantageous pursuit packets with independent rolls", () => {
  const input = agniRequest();
  input.enemy.elementCode = "4";
  input.modifiers.targetElementDamagePercent = 5;
  const response = calculateNormalAttackFromRequest(input);
  const pursuit = response.result.pursuitDamage;

  assert.ok(pursuit !== undefined);
  assert.equal(pursuit.nominalPursuitDamage, 1525.5);
  assert.equal(pursuit.damageDistribution.nominalPreparation, "none");
  assert.equal(pursuit.damageDistribution.finalRounding, "floor");

  const normalObserved = [
    1581, 1581, 1552, 1571, 1467, 1452, 1525, 1501, 1502, 1511, 1595, 1566, 1534, 1470,
  ];
  const normalMultipliers = [
    1.037, 1.037, 1.018, 1.03, 0.962, 0.952, 1, 0.984, 0.985, 0.991, 1.046, 1.027, 1.006,
    0.964,
  ];
  const normalInference = inferRandomMultiplierCandidates(pursuit.nominalPursuitDamage, normalObserved, {
    finalRounding: "floor",
  });
  assert.equal(normalInference.resolvedObservationCount, normalObserved.length);
  assert.deepEqual(
    normalInference.observations.map((observation) => observation.candidates),
    normalMultipliers.map((multiplier) => [multiplier]),
  );

  const criticalObserved = [2320, 2182, 2340, 2295];
  const criticalMultipliers = [1.014, 0.954, 1.023, 1.003];
  const criticalInference = inferRandomMultiplierCandidates(
    pursuit.nominalPursuitDamage * 1.5,
    criticalObserved,
    { finalRounding: "floor" },
  );
  assert.equal(criticalInference.resolvedObservationCount, criticalObserved.length);
  assert.deepEqual(
    criticalInference.observations.map((observation) => observation.candidates),
    criticalMultipliers.map((multiplier) => [multiplier]),
  );
});

test("article model reproduces all 18 advantageous pursuit packets", () => {
  const input = agniRequest();
  input.enemy.elementCode = "4";
  input.modifiers.targetElementDamagePercent = 5;
  const response = calculateNormalAttackFromRequest({
    ...input,
    calculationModel: "article-2026-07",
  });
  const pursuit = response.result.pursuitDamage;
  assert.ok(pursuit !== undefined);
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 11300);
  assert.equal(pursuit.nominalPursuitDamage, 1525.5);
  assert.equal(pursuit.damageDistribution.finalRounding, "floor");

  const observations = [
    ...[
      1581, 1581, 1552, 1571, 1467, 1452, 1525, 1501, 1502, 1511, 1595, 1566, 1534, 1470,
    ].map((damage) => ({ damage, nominalDamage: pursuit.nominalPursuitDamage })),
    ...[2320, 2182, 2340, 2295].map((damage) => ({
      damage,
      nominalDamage: pursuit.nominalPursuitDamage * 1.5,
    })),
  ];

  const resolvedCount = observations.filter(({ damage, nominalDamage }) =>
    inferRandomMultiplierCandidates(nominalDamage, [damage], { finalRounding: "floor" })
      .resolvedObservationCount === 1,
  ).length;
  assert.equal(resolvedCount, 18);
});

test("reproduces all four observed critical body hits with the two-floor model", () => {
  const input = agniRequest();
  input.enemy.elementCode = "4";
  input.modifiers.targetElementDamagePercent = 5;
  const response = calculateNormalAttackFromRequest(input);
  const critical = response.result.criticalBodyDamage;

  assert.ok(critical !== undefined);
  assert.equal(critical.status, "provisional");
  assert.equal(critical.probabilityModel, "damage-only");
  assert.equal(critical.weaponSkillCriticalRatePercent, 18);
  assert.equal(critical.criticalDamageMultiplier, 1.5);
  assert.equal(critical.nominalDamage, 16949);
  assert.equal(critical.targetElementMultiplierSource, "displayed-damage-calibration");

  const cases = [
    { randomMultiplier: 0.995, afterCriticalFloor: 16108, finalDamage: 16864 },
    { randomMultiplier: 0.972, afterCriticalFloor: 15735, finalDamage: 16474 },
    { randomMultiplier: 1.026, afterCriticalFloor: 16610, finalDamage: 17390 },
    { randomMultiplier: 1, afterCriticalFloor: 16189, finalDamage: 16949 },
  ];
  assert.deepEqual(
    cases.map(({ randomMultiplier }) => {
      const trace = calculateCriticalBodyDamageAtMultiplier(response.result.baseDamage, randomMultiplier);
      return {
        randomMultiplier: trace.randomMultiplier,
        afterCriticalFloor: trace.damageAfterCriticalFloor,
        finalDamage: trace.finalDamage,
      };
    }),
    cases,
  );
});

test("does not expose a weapon-skill critical distribution against a non-advantageous target", () => {
  const response = calculateNormalAttackFromRequest(agniRequest());

  assert.equal(response.result.criticalBodyDamage, undefined);
  assert.ok(!response.result.issues.includes("critical-probability-unresolved"));
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
