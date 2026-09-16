import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { inferRandomMultiplierCandidates } from "../src/calculator/randomMultiplierInference.ts";
import { calculateCriticalBodyDamageAtMultiplier } from "../src/calculator/criticalBodyDamageCalculator.ts";
import { calculateDamageAttenuation } from "../src/calculator/damageAttenuationCalculator.ts";

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

function derivedFrogaRequest(enemyElementCode: "1" | "4", targetElementDamagePercent: number) {
  return {
    schemaVersion: 1 as const,
    protagonistCurrentHpPercent: 100,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
    deckConfig: {
      schemaVersion: 1 as const,
      format: "gbf-helper-calculator-deck" as const,
      protagonist: {
        rank: 425,
        elementCode: "1",
        jobId: "110001",
        jobLevel: 20,
        masterLevel: 0,
        perfectionProofLevel: 0,
        jobCompletionDoubleAttackRate: 7,
        jobCompletionTripleAttackRate: 5,
        masterBonusAttackPercent: 24,
        masterBonusHpPercent: 20,
        mainWeaponCompletionAttackContribution: 4,
        attackOverride: 10885,
        hpOverride: 2885,
      },
      weapons: [
        {
          slot: 1,
          position: "main" as const,
          weaponId: "1010000400",
          isJobFallback: true,
          level: 1,
          attackOverride: 70,
          hpOverride: 6,
        },
        {
          slot: 2,
          position: "grid" as const,
          weaponId: "1040024600",
          level: 150,
          skillLevel: 15,
        },
      ],
      summons: [
        {
          slot: 1,
          position: "main" as const,
          summonId: "2040094000",
          level: 250,
          uncapLevel: 6,
        },
      ],
      characters: [],
    },
    enemy: { elementCode: enemyElementCode, defense: 10 },
    modifiers: {
      allElementAttackPercent: 3,
      elementAttackPercent: 10,
      shipAttackPercent: 10,
      furnaceAttackPercent: 10,
      jobNormalAttackDamagePercent: 3,
      damageDealtPercent: 3.6,
      targetElementDamagePercent,
    },
  };
}

test("adds only the protagonist's matching elemental attack LB to the elemental frame", () => {
  const baselineRequest = agniRequest();
  const fireRequest = structuredClone(baselineRequest);
  fireRequest.deckConfig.protagonist.fireAttackLimitBonusLevel = 3;
  const baseline = calculateNormalAttackFromRequest(baselineRequest);
  const fire = calculateNormalAttackFromRequest(fireRequest);
  const baselineStage = baseline.result.baseDamage.stages.find((stage) => stage.stage === "elemental-attack");
  const fireStage = fire.result.baseDamage.stages.find((stage) => stage.stage === "elemental-attack");
  assert.equal(fireStage?.totalPercent, (baselineStage?.totalPercent ?? 0) + 5);
  assert.equal(
    fireStage?.contributions.some(
      (contribution) => "sourceId" in contribution && contribution.sourceId === "fire-attack-limit-bonus",
    ),
    true,
  );

  const waterBaselineRequest = agniRequest();
  waterBaselineRequest.deckConfig.protagonist.elementCode = "2";
  waterBaselineRequest.deckConfig.weapons = [{
    slot: 1, position: "main", weaponId: "1040101500", level: 150, skillLevel: 15,
    plusMark: 0, attackOverride: 2520, hpOverride: 255,
  }];
  waterBaselineRequest.deckConfig.summons = [];
  const waterRequest = structuredClone(waterBaselineRequest);
  waterRequest.deckConfig.protagonist.fireAttackLimitBonusLevel = 3;
  waterRequest.deckConfig.protagonist.waterAttackLimitBonusLevel = 3;
  const waterBaseline = calculateNormalAttackFromRequest(waterBaselineRequest);
  const water = calculateNormalAttackFromRequest(waterRequest);
  const waterBaselineStage = waterBaseline.result.baseDamage.stages.find((stage) => stage.stage === "elemental-attack");
  const waterStage = water.result.baseDamage.stages.find((stage) => stage.stage === "elemental-attack");
  assert.equal(
    waterStage?.totalPercent,
    (waterBaselineStage?.totalPercent ?? 0) + 5,
  );
  assert.equal(
    waterStage?.contributions.some(
      (contribution) => "sourceId" in contribution && contribution.sourceId === "water-attack-limit-bonus",
    ),
    true,
  );
  assert.equal(
    waterStage?.contributions.some(
      (contribution) => "sourceId" in contribution && contribution.sourceId === "fire-attack-limit-bonus",
    ),
    false,
  );
});

function fireAttackLimitBonusRequest(level: number, level2 = 0, level3 = 0) {
  return {
    schemaVersion: 1 as const,
    deckConfig: {
      schemaVersion: 1 as const,
      format: "gbf-helper-calculator-deck" as const,
      protagonist: {
        rank: 425, elementCode: "1", jobId: "110001", jobLevel: 20,
        masterLevel: 0, perfectionProofLevel: 0,
        masterBonusAttackPercent: 24, masterBonusHpPercent: 20,
        mainWeaponCompletionAttackContribution: 4,
        fireAttackLimitBonusLevel: level,
        fireAttackLimitBonus2Level: level2,
        fireAttackLimitBonus3Level: level3,
      },
      weapons: [{
        slot: 1, position: "main" as const, weaponId: "1010000400",
        isJobFallback: true, level: 1, attackOverride: 70, hpOverride: 6,
      }],
      summons: [{
        slot: 1, position: "main" as const, summonId: "2040094000", level: 250, uncapLevel: 6,
      }],
      characters: [],
    },
    enemy: { elementCode: "1", defense: 10 },
    modifiers: {
      allElementAttackPercent: 3, elementAttackPercent: 10,
      shipAttackPercent: 10, furnaceAttackPercent: 10,
      jobNormalAttackDamagePercent: 3, damageDealtPercent: 3.6,
      targetElementDamagePercent: 0,
    },
  };
}

test("reproduces all observed fire attack LB game-calculator estimates", () => {
  const expected = [
    { normal: 2763, advantage: 3903 },
    { normal: 2782, advantage: 3924 },
    { normal: 2821, advantage: 3964 },
    { normal: 2859, advantage: 4004 },
  ];
  for (let level = 0; level <= 3; level++) {
    const request = fireAttackLimitBonusRequest(level);
    const normal = calculateNormalAttackFromRequest(request);
    const advantageRequest = structuredClone(request);
    advantageRequest.enemy.elementCode = "4";
    advantageRequest.modifiers.targetElementDamagePercent = 5;
    const advantage = calculateNormalAttackFromRequest(advantageRequest);
    assert.equal(normal.result.attackPower.baseAttack, 14967);
    assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, expected[level].normal);
    assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, expected[level].advantage);
  }
});

test("reproduces the observed independent protagonist critical LB proc at one percent", () => {
  const input = fireAttackLimitBonusRequest(0);
  input.deckConfig.protagonist.criticalRateLimitBonusLevel = 1;
  input.enemy.elementCode = "4";
  input.modifiers.targetElementDamagePercent = 5;
  const result = calculateNormalAttackFromRequest(input).result;
  const critical = result.protagonistLimitBonusCritical;

  assert.ok(critical !== undefined);
  assert.equal(result.criticalBodyDamage, undefined);
  assert.equal(critical.probabilityModel, "independent-per-limit-bonus");
  assert.equal(critical.damageMultiplier, 1.01);
  assert.equal(critical.nominalDamage, 3942);
  assert.deepEqual(critical.sources, [{
    sourceId: "critical-limit-bonus",
    sourceName: "クリティカル確率 LB",
    level: 1,
    triggerRatePercent: 1,
    damageBonusPercent: 1,
    verificationStatus: "検証済み",
  }]);

  const trace = result.baseDamage.articleTrace!;
  const inference = inferRandomMultiplierCandidates(trace.prePostCapDamage, [3919, 3840, 4037], {
    finalRounding: "ceil",
    damageTransform: {
      id: "observed-protagonist-critical-lb-star1",
      apply: (damage) => calculateDamageAttenuation(
        damage * critical.damageMultiplier,
        result.bodyDamageAttenuation.profile,
        { damageCapUpPercent: result.bodyDamageAttenuation.damageCapUpPercent },
      ).damage * (1 + trace.postCapDamagePercent / 100),
    },
  });
  assert.deepEqual(
    inference.observations.map((observation) => observation.candidates),
    [[0.994], [0.974], [1.024]],
  );
});

test("keeps the three protagonist critical LB items as independent draft rolls", () => {
  const input = fireAttackLimitBonusRequest(0);
  Object.assign(input.deckConfig.protagonist, {
    criticalRateLimitBonusLevel: 3,
    criticalRateLimitBonus2Level: 3,
    criticalRateLimitBonus3Level: 3,
  });
  input.enemy.elementCode = "4";
  input.modifiers.targetElementDamagePercent = 5;
  const critical = calculateNormalAttackFromRequest(input).result.protagonistLimitBonusCritical;

  assert.ok(critical !== undefined);
  assert.equal(critical.sources.length, 3);
  assert.deepEqual(critical.sources.map((source) => source.triggerRatePercent), [5, 5, 5]);
  assert.deepEqual(critical.sources.map((source) => source.damageBonusPercent), [5, 5, 5]);
  assert.deepEqual(critical.sources.map((source) => source.verificationStatus), ["下書き", "下書き", "下書き"]);
  assert.equal(critical.damageMultiplier, 1.15);
});

test("reproduces every observed neutral hit with fire attack LB at zero, five, and fifteen percent", () => {
  const observations = [
    { levels: [0, 0, 0], hits: [
      2743, 2672, 2713, 2752, 2768, 2879, 2658, 2724, 2743, 2666,
      2633, 2754, 2801, 2870, 2868, 2705, 2721, 2859, 2732, 2674,
    ] },
    { levels: [3, 0, 0], hits: [
      2731, 2991, 2988, 2839, 2794, 2825, 2985, 2916, 2879, 2748, 2951,
      2731, 2939, 2819, 2822, 2868, 2942, 2802, 2822, 2859, 2931, 2739,
    ] },
    { levels: [3, 3, 3], hits: [
      3132, 2988, 3007, 3016, 3065, 3059, 3025, 2943,
      3159, 3184, 3141, 3202, 2955, 3068, 2955, 3107,
    ] },
  ];
  for (const { levels, hits } of observations) {
    const result = calculateNormalAttackFromRequest(fireAttackLimitBonusRequest(...levels)).result;
    const trace = result.baseDamage.articleTrace!;
    const inference = inferRandomMultiplierCandidates(trace.prePostCapDamage, hits, {
      finalRounding: "ceil",
      damageTransform: {
        id: "observed-fire-lb-normal-attack",
        apply: (damage) => calculateDamageAttenuation(
          damage,
          result.bodyDamageAttenuation.profile,
          { damageCapUpPercent: result.bodyDamageAttenuation.damageCapUpPercent },
        ).damage * (1 + trace.postCapDamagePercent / 100),
      },
    });
    assert.equal(inference.resolvedObservationCount, hits.length);
    assert.deepEqual(inference.unresolvedObservationIndexes, []);
  }
});

test("adds fire attack LB II and III in the same elemental frame", () => {
  const expected = [
    { levels: [3, 0, 0], normal: 2859, advantage: 4004 },
    { levels: [3, 3, 0], normal: 2956, advantage: 4106 },
    { levels: [3, 3, 3], normal: 3052, advantage: 4207 },
  ];
  for (const observation of expected) {
    const [level, level2, level3] = observation.levels;
    const request = fireAttackLimitBonusRequest(level, level2, level3);
    const normal = calculateNormalAttackFromRequest(request);
    const advantageRequest = structuredClone(request);
    advantageRequest.enemy.elementCode = "4";
    advantageRequest.modifiers.targetElementDamagePercent = 5;
    const advantage = calculateNormalAttackFromRequest(advantageRequest);
    assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, observation.normal);
    assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, observation.advantage);
  }
});

test("reproduces the observed proficiency-1 attack LB display and battle damage", () => {
  const request = fireAttackLimitBonusRequest(0);
  Object.assign(request.deckConfig.protagonist, {
    proficiency1AttackLimitBonusLevel: 3,
    proficiency1AttackLimitBonus2Level: 3,
    proficiency1AttackLimitBonus3Level: 3,
    proficiencyBothAttackLimitBonusLevel: 3,
    proficiencyBothAttackLimitBonus2Level: 3,
  });
  const normal = calculateNormalAttackFromRequest(request);
  const advantageRequest = structuredClone(request);
  advantageRequest.enemy.elementCode = "4";
  advantageRequest.modifiers.targetElementDamagePercent = 5;
  const advantage = calculateNormalAttackFromRequest(advantageRequest);

  assert.equal(normal.result.attackPower.baseAttack, 14989);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 2766);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 3908);

  const hits = [2644, 2774, 2661, 2691, 2871, 2713, 2644, 2829, 2738, 2818, 2766, 2874, 2893, 2710, 2727, 2799, 2708, 2708];
  const trace = normal.result.baseDamage.articleTrace!;
  const inference = inferRandomMultiplierCandidates(trace.prePostCapDamage, hits, {
    finalRounding: "ceil",
    damageTransform: {
      id: "observed-proficiency1-lb-normal-attack",
      apply: (damage) => calculateDamageAttenuation(
        damage,
        normal.result.bodyDamageAttenuation.profile,
        { damageCapUpPercent: normal.result.bodyDamageAttenuation.damageCapUpPercent },
      ).damage * (1 + trace.postCapDamagePercent / 100),
    },
  });
  assert.equal(inference.resolvedObservationCount, hits.length);
  assert.deepEqual(inference.unresolvedObservationIndexes, []);
});

test("reproduces the observed inactive proficiency-2 and shared LB stages on a first-kind weapon", () => {
  const request = fireAttackLimitBonusRequest(0);
  Object.assign(request.deckConfig.protagonist, {
    proficiency2AttackLimitBonusLevel: 3,
    proficiency2AttackLimitBonus2Level: 3,
    proficiency2AttackLimitBonus3Level: 3,
    proficiencyBothAttackLimitBonusLevel: 3,
    proficiencyBothAttackLimitBonus2Level: 3,
  });
  const normal = calculateNormalAttackFromRequest(request);
  const advantageRequest = structuredClone(request);
  advantageRequest.enemy.elementCode = "4";
  advantageRequest.modifiers.targetElementDamagePercent = 5;
  const advantage = calculateNormalAttackFromRequest(advantageRequest);

  assert.equal(normal.result.attackPower.baseAttack, 14975);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 2764);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 3905);

  const hits = [2645, 2676, 2734, 2784, 2864, 2701, 2825, 2720, 2684, 2806, 2797, 2839, 2847, 2712, 2839, 2676, 2759, 2900, 2836, 2839, 2712, 2869, 2737, 2866, 2844, 2842];
  const trace = normal.result.baseDamage.articleTrace!;
  const inference = inferRandomMultiplierCandidates(trace.prePostCapDamage, hits, {
    finalRounding: "ceil",
    damageTransform: {
      id: "observed-proficiency2-lb-normal-attack",
      apply: (damage) => calculateDamageAttenuation(
        damage,
        normal.result.bodyDamageAttenuation.profile,
        { damageCapUpPercent: normal.result.bodyDamageAttenuation.damageCapUpPercent },
      ).damage * (1 + trace.postCapDamagePercent / 100),
    },
  });
  assert.equal(inference.resolvedObservationCount, hits.length);
  assert.deepEqual(inference.unresolvedObservationIndexes, []);
});

test("derives Froga display stats and reproduces the game calculator estimates", () => {
  const normal = calculateNormalAttackFromRequest(derivedFrogaRequest("1", 0));
  const advantage = calculateNormalAttackFromRequest(derivedFrogaRequest("4", 5));

  assert.equal(normal.result.attackPower.baseAttack, 19498);
  assert.equal(normal.result.protagonistHp?.baseHp, 4434);
  assert.equal(normal.result.protagonistHp?.hp, 7751);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 7342);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 10374);
});

function derivedNilakanthaRequest(
  includeFroga: boolean,
  enemyElementCode: "1" | "4",
  protagonistCurrentHpPercent = 100,
  skillLevel = 15,
) {
  const request = derivedFrogaRequest(enemyElementCode, enemyElementCode === "4" ? 5 : 0);
  request.protagonistCurrentHpPercent = protagonistCurrentHpPercent;
  request.deckConfig.protagonist.attackOverride = includeFroga
    ? 22709
    : skillLevel === 1 ? 15380 : 18178;
  request.deckConfig.protagonist.hpOverride = includeFroga
    ? 4746
    : skillLevel === 1 ? 4111 : 4374;
  request.deckConfig.weapons = [
    request.deckConfig.weapons[0],
    {
      slot: 2,
      position: "grid" as const,
      weaponId: "1040417900",
      level: skillLevel === 1 ? 1 : 150,
      skillLevel,
      ...(skillLevel === 1 ? { attackOverride: 333, hpOverride: 41 } : {}),
    },
    ...(includeFroga ? [{
      slot: 3,
      position: "grid" as const,
      weaponId: "1040024600",
      level: 150,
      skillLevel: 15,
    }] : []),
  ];
  return request;
}

test("reproduces Nilakantha and proves normal/magna stamina multiply as separate frames", () => {
  const nilakantha = calculateNormalAttackFromRequest(derivedNilakanthaRequest(false, "1"));
  const combined = calculateNormalAttackFromRequest(derivedNilakanthaRequest(true, "1"));
  const advantage = calculateNormalAttackFromRequest(derivedNilakanthaRequest(true, "4"));

  assert.equal(nilakantha.result.attackPower.baseAttack, 18178);
  assert.equal(nilakantha.result.protagonistHp?.hp, 5009);
  assert.equal(nilakantha.result.baseDamage.damageBeforeRandomAndCap, 3857);
  assert.equal(combined.result.attackPower.baseAttack, 22709);
  assert.equal(combined.result.protagonistHp?.hp, 8985);
  assert.equal(combined.result.baseDamage.damageBeforeRandomAndCap, 9835);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 13897);
  assert.equal(
    combined.result.baseDamage.stages.some((stage) => stage.stage === "normal-stamina"),
    true,
  );
  assert.equal(
    combined.result.baseDamage.stages.some((stage) => stage.stage === "magna-stamina"),
    true,
  );
});

test("reproduces Nilakantha SLv15 estimates at HP50 and HP75", () => {
  const checkpoints = [
    { hpPercent: 75, normalDamage: 3612, advantageDamage: 5104, staminaDisplay: 7.7 },
    { hpPercent: 50, normalDamage: 3483, advantageDamage: 4920, staminaDisplay: 3.83 },
  ];

  for (const checkpoint of checkpoints) {
    const normal = calculateNormalAttackFromRequest(
      derivedNilakanthaRequest(false, "1", checkpoint.hpPercent),
    );
    const advantage = calculateNormalAttackFromRequest(
      derivedNilakanthaRequest(false, "4", checkpoint.hpPercent),
    );
    assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, checkpoint.normalDamage);
    assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, checkpoint.advantageDamage);
    assert.equal(
      Math.round(
        (normal.result.hpDependentAttack.totalEffectiveMagnaStaminaPercent + Number.EPSILON) * 100,
      ) / 100,
      checkpoint.staminaDisplay,
    );
  }
});

test("reproduces Nilakantha SLv1 estimates at HP100, HP75 and HP50", () => {
  const checkpoints = [
    { hpPercent: 100, normalDamage: 3056, advantageDamage: 4318, staminaDisplay: 7.64 },
    { hpPercent: 75, normalDamage: 2967, advantageDamage: 4192, staminaDisplay: 4.51 },
    { hpPercent: 50, normalDamage: 2920, advantageDamage: 4125, staminaDisplay: 2.84 },
  ];

  for (const checkpoint of checkpoints) {
    const normal = calculateNormalAttackFromRequest(
      derivedNilakanthaRequest(false, "1", checkpoint.hpPercent, 1),
    );
    const advantage = calculateNormalAttackFromRequest(
      derivedNilakanthaRequest(false, "4", checkpoint.hpPercent, 1),
    );
    assert.equal(normal.result.protagonistHp?.hp, 4235);
    assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, checkpoint.normalDamage);
    assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, checkpoint.advantageDamage);
    assert.equal(
      Math.round(
        (normal.result.hpDependentAttack.totalEffectiveMagnaStaminaPercent + Number.EPSILON) * 100,
      ) / 100,
      checkpoint.staminaDisplay,
    );
  }
});

test("applies Colossus Magna's 170% aura to Nilakantha at full HP", () => {
  const normalInput = derivedNilakanthaRequest(false, "1");
  normalInput.deckConfig.protagonist.attackOverride = 16328;
  normalInput.deckConfig.protagonist.hpOverride = 3954;
  normalInput.deckConfig.summons = [{
    slot: 1,
    position: "main" as const,
    summonId: "2040034000",
    level: 250,
    uncapLevel: 6,
  }];
  const advantageInput = structuredClone(normalInput);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;

  const normal = calculateNormalAttackFromRequest(normalInput);
  const advantage = calculateNormalAttackFromRequest(advantageInput);

  assert.equal(normal.result.attackPower.baseAttack, 16328);
  assert.equal(normal.result.protagonistHp?.hp, 5502);
  assert.equal(
    Math.round(normal.result.hpDependentAttack.totalEffectiveMagnaStaminaPercent * 100) / 100,
    40.51,
  );
  assert.equal(normal.result.protagonistHp?.weaponSkillHpPercent, 39.15);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 3347);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 5054);
});

test("reproduces Brahman Scimitar's magna attack, DA, HP and damage displays", () => {
  const input = derivedNilakanthaRequest(false, "1");
  input.deckConfig.protagonist.attackOverride = 20391;
  input.deckConfig.protagonist.hpOverride = 4285;
  input.deckConfig.weapons.push({
    slot: 3,
    position: "grid",
    weaponId: "1040015000",
    level: 150,
    skillLevel: 15,
  });
  input.deckConfig.summons = [{
    slot: 1,
    position: "main",
    summonId: "2040034000",
    level: 250,
    uncapLevel: 6,
  }];
  const { supportSummon: _unusedSupportSummon, ...normalInput } = input;
  const advantageInput = structuredClone(normalInput);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;

  const normal = calculateNormalAttackFromRequest(normalInput);
  const advantage = calculateNormalAttackFromRequest(advantageInput);

  assert.equal(normal.result.attackPower.totalEffectiveNormalAttackPercent, 39.15);
  assert.equal(normal.result.protagonistHp?.weaponSkillHpPercent, 78.3);
  assert.equal(normal.result.protagonistHp?.hp, 7641);
  assert.equal(normal.result.multiattackRates.weaponSkillDoubleAttackRatePercent, 13.5);
  assert.equal(normal.result.multiattackRates.doubleAttackRatePercent, 27);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 5815);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 8782);
});

test("reproduces Brahman Trident's magna attack, TA, HP and damage displays", () => {
  const input = derivedNilakanthaRequest(false, "1");
  input.deckConfig.protagonist.attackOverride = 28315;
  input.deckConfig.protagonist.hpOverride = 5035;
  input.deckConfig.weapons.push(
    { slot: 3, position: "grid", weaponId: "1040015000", level: 150, skillLevel: 15 },
    { slot: 4, position: "grid", weaponId: "1040026100", level: 150, skillLevel: 15 },
    { slot: 5, position: "grid", weaponId: "1040210400", level: 150, skillLevel: 15 },
  );
  input.deckConfig.summons = [{
    slot: 1,
    position: "main",
    summonId: "2040034000",
    level: 250,
    uncapLevel: 6,
  }];
  const { supportSummon: _unusedSupportSummon, ...normalInput } = input;
  const advantageInput = structuredClone(normalInput);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;

  const normal = calculateNormalAttackFromRequest(normalInput);
  const advantage = calculateNormalAttackFromRequest(advantageInput);

  assert.equal(normal.result.attackPower.totalEffectiveNormalAttackPercent, 78.3);
  assert.equal(normal.result.protagonistHp?.weaponSkillHpPercent, 116.1);
  assert.equal(normal.result.protagonistHp?.hp, 10881);
  assert.equal(normal.result.multiattackRates.weaponSkillDoubleAttackRatePercent, 13.5);
  assert.equal(normal.result.multiattackRates.weaponSkillTripleAttackRatePercent, 6.75);
  assert.equal(normal.result.otherWeaponSkills.healingCap.effectivePercent, 40.5);
  assert.equal(normal.result.otherWeaponSkills.debuffResistance.effectivePercent, 10.8);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 10346);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 15623);
});

test("reproduces Dark Opus Magna Majesty's attack, HP, and post-defense damage displays", () => {
  const input = derivedFrogaRequest("1", 0);
  input.deckConfig.protagonist.attackOverride = 18622;
  input.deckConfig.protagonist.hpOverride = 4024;
  input.deckConfig.weapons = [
    input.deckConfig.weapons[0],
    {
      slot: 2,
      position: "grid",
      weaponId: "1040310700",
      level: 250,
      skillLevel: 25,
      attackOverride: 4440,
      hpOverride: 318,
    },
  ];
  input.deckConfig.summons = [{
    slot: 1,
    position: "main",
    summonId: "2040034000",
    level: 250,
    uncapLevel: 6,
  }];
  const { supportSummon: _unusedSupportSummon, ...normalInput } = input;
  const advantageInput = structuredClone(normalInput);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;

  const result = calculateNormalAttackFromRequest(normalInput).result;
  const advantageResult = calculateNormalAttackFromRequest(advantageInput).result;
  const damageDealtStage = result.baseDamage.stages.find((stage) => stage.stage === "damage-dealt");

  assert.equal(result.attackPower.totalEffectiveNormalAttackPercent, 64.8);
  assert.equal(result.protagonistHp?.weaponSkillHpPercent, 64.8);
  assert.equal(result.protagonistHp?.hp, 6632);
  assert.equal(result.otherWeaponSkills.damageDealt.effectivePercent, 5.4);
  assert.equal(damageDealtStage?.totalPercent, 12);
  assert.equal(
    damageDealtStage?.contributions.some(
      (contribution) => "kind" in contribution && contribution.kind === "damage-dealt-up",
    ),
    true,
  );
  assert.equal(result.baseDamage.damageBeforeRandomAndCap, 4704);
  assert.equal(advantageResult.baseDamage.damageBeforeRandomAndCap, 7088);
});

test("reproduces Colossus Bomber Ira's attack and ability-skill displays", () => {
  const input = derivedFrogaRequest("1", 0);
  input.deckConfig.protagonist.masterLevel = 1;
  input.deckConfig.protagonist.attackOverride = 16800;
  input.deckConfig.protagonist.hpOverride = 3896;
  input.deckConfig.weapons = [
    input.deckConfig.weapons[0],
    {
      slot: 2,
      position: "grid",
      weaponId: "1040317400",
      level: 150,
      skillLevel: 15,
      attackOverride: 2970,
      hpOverride: 212,
    },
  ];
  input.deckConfig.summons = [{
    slot: 1,
    position: "main",
    summonId: "2040034000",
    level: 250,
    uncapLevel: 6,
  }];
  const { supportSummon: _unusedSupportSummon, ...normalInput } = input;
  const advantageInput = structuredClone(normalInput);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;

  const result = calculateNormalAttackFromRequest(normalInput).result;
  const advantageResult = calculateNormalAttackFromRequest(advantageInput).result;

  assert.equal(result.attackPower.totalEffectiveNormalAttackPercent, 32.4);
  assert.equal(result.otherWeaponSkills.abilityDamageCap.effectivePercent, 14.85);
  assert.equal(result.otherWeaponSkills.abilitySupplementalDamage.effectiveAmount, 67_500);
  assert.equal(result.baseDamage.damageBeforeRandomAndCap, 3244);
  assert.equal(advantageResult.baseDamage.damageBeforeRandomAndCap, 4899);
});

test("adds Wedges of the Sky's 30% sub aura to Colossus Magna for Nilakantha", () => {
  const normalInput = derivedNilakanthaRequest(false, "1");
  normalInput.deckConfig.protagonist.attackOverride = 16328;
  normalInput.deckConfig.protagonist.hpOverride = 3954;
  normalInput.deckConfig.summons = [
    {
      slot: 1,
      position: "main" as const,
      summonId: "2040034000",
      level: 250,
      uncapLevel: 6,
    },
    {
      slot: 1,
      position: "sub" as const,
      summonId: "2040430000",
      level: 150,
      uncapLevel: 4,
    },
  ];
  const advantageInput = structuredClone(normalInput);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;

  const normal = calculateNormalAttackFromRequest(normalInput);
  const advantage = calculateNormalAttackFromRequest(advantageInput);

  assert.equal(normal.result.attackPower.baseAttack, 16328);
  assert.equal(normal.result.protagonistHp?.hp, 5674);
  assert.equal(
    Math.round(normal.result.hpDependentAttack.totalEffectiveMagnaStaminaPercent * 100) / 100,
    45.01,
  );
  assert.equal(normal.result.protagonistHp?.weaponSkillHpPercent, 43.5);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 3454);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 5216);
});

test("applies Wedges of the Sky's elemental attack and flat HP main aura", () => {
  const normalInput = derivedNilakanthaRequest(false, "1");
  normalInput.deckConfig.protagonist.attackOverride = 15635;
  normalInput.deckConfig.protagonist.hpOverride = 3647;
  normalInput.deckConfig.summons = [{
    slot: 1,
    position: "main" as const,
    summonId: "2040430000",
    level: 150,
    uncapLevel: 4,
  }];
  const advantageInput = structuredClone(normalInput);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;

  const normal = calculateNormalAttackFromRequest(normalInput);
  const advantage = calculateNormalAttackFromRequest(advantageInput);

  assert.equal(normal.result.attackPower.totalElementalSummonAuraPercent, 140);
  assert.equal(
    Math.round(normal.result.hpDependentAttack.totalEffectiveMagnaStaminaPercent * 100) / 100,
    15,
  );
  assert.equal(normal.result.protagonistHp?.weaponSkillHpPercent, 14.5);
  assert.equal(normal.result.protagonistHp?.summonAuraFlatHp, 25000);
  assert.equal(normal.result.protagonistHp?.hp, 29176);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 5875);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 7366);
});

test("applies Colossus Magna's attack sub aura without applying its magna boost", () => {
  const normalInput = derivedNilakanthaRequest(false, "1");
  normalInput.deckConfig.protagonist.attackOverride = 18940;
  normalInput.deckConfig.protagonist.hpOverride = 4924;
  normalInput.deckConfig.summons = [
    { slot: 1, position: "main", summonId: "2040430000", level: 150, uncapLevel: 4 },
    { slot: 2, position: "grid", summonId: "2040034000", level: 250, uncapLevel: 6 },
  ];
  const advantageInput = structuredClone(normalInput);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;

  const normal = calculateNormalAttackFromRequest(normalInput);
  const advantage = calculateNormalAttackFromRequest(advantageInput);

  assert.equal(normal.result.attackPower.totalCharacterAttackSummonAuraPercent, 10);
  assert.equal(normal.result.hpDependentAttack.totalEffectiveMagnaStaminaPercent, 15.003247);
  assert.equal(normal.result.protagonistHp?.hp, 30638);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 7824);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 9809);
});

test("combines Colossus attack and Agni elemental/HP sub auras", () => {
  const normalInput = derivedNilakanthaRequest(false, "1");
  normalInput.deckConfig.protagonist.attackOverride = 24094;
  normalInput.deckConfig.protagonist.hpOverride = 6620;
  normalInput.deckConfig.summons = [
    { slot: 1, position: "main", summonId: "2040430000", level: 150, uncapLevel: 4 },
    { slot: 2, position: "grid", summonId: "2040034000", level: 250, uncapLevel: 6 },
    { slot: 3, position: "grid", summonId: "2040094000", level: 250, uncapLevel: 6 },
  ];
  const advantageInput = structuredClone(normalInput);
  advantageInput.enemy.elementCode = "4";
  advantageInput.modifiers.targetElementDamagePercent = 5;

  const normal = calculateNormalAttackFromRequest(normalInput);
  const advantage = calculateNormalAttackFromRequest(advantageInput);

  assert.equal(normal.result.attackPower.totalCharacterAttackSummonAuraPercent, 10);
  assert.equal(normal.result.attackPower.totalElementalSummonAuraPercent, 160);
  assert.equal(normal.result.protagonistHp?.summonAuraPercent, 20);
  assert.equal(normal.result.protagonistHp?.hp, 33904);
  assert.equal(normal.result.baseDamage.damageBeforeRandomAndCap, 10739);
  assert.equal(advantage.result.baseDamage.damageBeforeRandomAndCap, 13302);
});

test("resolves protagonist DA and TA rates from the selected job", () => {
  const response = calculateNormalAttackFromRequest(agniRequest());

  assert.equal(response.result.multiattackRates.doubleAttackRatePercent, 14);
  assert.equal(response.result.multiattackRates.tripleAttackRatePercent, 8);
  assert.equal(response.result.multiattackRates.contributions[0]?.sourceName, "ナイト 基礎率");
  assert.deepEqual(
    response.result.multiattackRates.contributions.map((contribution) => contribution.sourceType),
    ["job-base", "job-completion"],
  );
  assert.deepEqual(response.result.protagonistHp, {
    schemaVersion: 1,
    status: "provisional",
    baseHp: 4877,
    weaponSkillHpPercent: 0,
    summonAuraPercent: 0,
    hp: 4877,
    appliedWeaponSkillEffects: [],
    appliedAuras: [],
    issues: [],
  });
});

test("adds protagonist DA and TA limit bonuses to the selected job rates", () => {
  const input = agniRequest();
  Object.assign(input.deckConfig.protagonist, {
    doubleAttackRateLimitBonusLevel: 3,
    doubleAttackRateLimitBonus2Level: 3,
    doubleAttackRateLimitBonus3Level: 3,
    tripleAttackRateLimitBonusLevel: 3,
    tripleAttackRateLimitBonus2Level: 3,
  });
  const response = calculateNormalAttackFromRequest(input);

  assert.equal(response.result.multiattackRates.doubleAttackRatePercent, 29);
  assert.equal(response.result.multiattackRates.tripleAttackRatePercent, 18);
  const limitBonusContributions = response.result.multiattackRates.contributions
    .filter((contribution) => contribution.sourceType === "job-limit-bonus");
  assert.deepEqual(
    limitBonusContributions.map(({ sourceName, doubleAttackRatePercent, tripleAttackRatePercent, verificationStatus }) => ({
      sourceName, doubleAttackRatePercent, tripleAttackRatePercent, verificationStatus,
    })),
    [
      { sourceName: "ダブルアタック確率 LB", doubleAttackRatePercent: 5, tripleAttackRatePercent: 0, verificationStatus: "下書き" },
      { sourceName: "ダブルアタック確率 II LB", doubleAttackRatePercent: 5, tripleAttackRatePercent: 0, verificationStatus: "下書き" },
      { sourceName: "トリプルアタック確率 LB", doubleAttackRatePercent: 0, tripleAttackRatePercent: 5, verificationStatus: "下書き" },
      { sourceName: "トリプルアタック確率 II LB", doubleAttackRatePercent: 0, tripleAttackRatePercent: 5, verificationStatus: "下書き" },
      { sourceName: "ダブルアタック確率 III LB", doubleAttackRatePercent: 5, tripleAttackRatePercent: 0, verificationStatus: "下書き" },
    ],
  );
});

test("adds God Extinction Crest DA and TA rates as an account-item contribution", () => {
  const input = agniRequest();
  const response = calculateNormalAttackFromRequest({
    ...input,
    modifiers: {
      ...input.modifiers,
      extinctionCrestDoubleAttackRatePercent: 6,
      extinctionCrestTripleAttackRatePercent: 7,
    },
  });

  assert.equal(response.result.multiattackRates.doubleAttackRatePercent, 20);
  assert.equal(response.result.multiattackRates.tripleAttackRatePercent, 15);
  assert.equal(
    response.result.multiattackRates.contributions.some((contribution) => contribution.sourceType === "memorial-item"),
    true,
  );
});

test("returns HP after applying the strongest resolved character HP sub aura", () => {
  const input = agniRequest();
  input.deckConfig.protagonist.hpOverride = 4630;
  input.deckConfig.summons.push(
    {
      slot: 1,
      position: "sub",
      summonId: "2040094000",
      level: 250,
      uncapLevel: 6,
      plusMark: 0,
      attackOverride: 4157,
      hpOverride: 1414,
    },
    {
      slot: 2,
      position: "sub",
      summonId: "2040317000",
      level: 200,
      uncapLevel: 5,
      plusMark: 0,
      attackOverride: 2737,
      hpOverride: 1130,
    },
  );

  const response = calculateNormalAttackFromRequest(input);

  assert.equal(response.result.protagonistHp?.hp, 6019);
  assert.equal(response.result.protagonistHp?.summonAuraPercent, 30);
  assert.deepEqual(
    response.result.protagonistHp?.appliedAuras.map((aura) => aura.sourceSummonId),
    ["2040317000"],
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

  assert.equal(response.result.multiattackRates.doubleAttackRatePercent, 46);
  assert.equal(response.result.multiattackRates.tripleAttackRatePercent, 40);
  assert.equal(response.result.multiattackRates.uncappedDoubleAttackRatePercent, 46.9);
  assert.equal(response.result.multiattackRates.uncappedTripleAttackRatePercent, 40.9);
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

test("caps the observed normal weapon-skill TA frame at 75% before adding job rates", () => {
  const input = agniRequest();
  input.deckConfig.weapons.push(
    {
      slot: 3,
      position: "grid",
      weaponId: "1040915300",
      level: 150,
      skillLevel: 15,
      attackOverride: 3441,
      hpOverride: 182,
    },
    {
      slot: 4,
      position: "grid",
      weaponId: "1040206800",
      level: 150,
      skillLevel: 15,
      attackOverride: 2500,
      hpOverride: 278,
    },
    {
      slot: 5,
      position: "grid",
      weaponId: "1040812900",
      level: 1,
      skillLevel: 1,
      attackOverride: 384,
      hpOverride: 43,
    },
    {
      slot: 6,
      position: "grid",
      weaponId: "1040915300",
      level: 1,
      skillLevel: 1,
      attackOverride: 485,
      hpOverride: 24,
    },
  );

  const response = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });
  const rates = response.result.multiattackRates;

  assert.equal(rates.uncappedWeaponSkillDoubleAttackRatePercent, 71.44);
  assert.equal(rates.weaponSkillDoubleAttackRatePercent, 71.44);
  assert.equal(rates.uncappedWeaponSkillTripleAttackRatePercent, 77.08);
  assert.equal(rates.weaponSkillTripleAttackRatePercent, 75);
  assert.equal(rates.doubleAttackRatePercent, 85);
  assert.equal(rates.tripleAttackRatePercent, 83);
  assert.equal(
    response.deckResolutionIssues.some(
      (issue) => issue.code === "weapon-skill-level-unresolved" && issue.message.includes("Skill 510"),
    ),
    false,
  );
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

test("resolves Ecke Sachs Hellfire's Celere at skill level 15", () => {
  const input = agniRequest();
  input.enemy.elementCode = "4";
  input.deckConfig.weapons.push({
    slot: 3,
    position: "grid",
    weaponId: "1040007100",
    level: 150,
    skillLevel: 15,
    plusMark: 0,
    attackOverride: 2030,
    hpOverride: 800,
  });

  const response = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });

  assert.equal(response.result.attackPower.totalEffectiveNormalAttackPercent, 209.15);
  assert.equal(response.result.criticalBodyDamage?.weaponSkillCriticalRatePercent, 58.75);
});

test("applies Wilnas' verified 4-star sub aura to normal weapon skills", () => {
  const input = agniRequest();
  input.deckConfig.summons.push({
    slot: 1,
    position: "sub",
    summonId: "2040398000",
    level: 150,
    uncapLevel: 4,
    plusMark: 0,
    attackOverride: 0,
    hpOverride: 0,
  });

  const response = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });

  assert.equal(response.result.attackPower.totalEffectiveNormalAttackPercent, 153);
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 10649);
  assert.equal(response.result.pursuitDamage?.effectivePursuitPercentage, 22.95);
  assert.equal(
    response.result.attackPower.contributions[0]?.appliedModifiers.some(
      (modifier) =>
        modifier.sourceType === "summon-aura" &&
        modifier.sourcePosition === "sub" &&
        modifier.sourceSummonId === "2040398000" &&
        modifier.amountPercent === 40,
    ),
    true,
  );
});

test("applies Wilnas' sub aura from a normal sub-summon slot with the observed stat total", () => {
  const input = agniRequest();
  input.deckConfig.protagonist.attackOverride = 26923;
  input.deckConfig.protagonist.hpOverride = 6188;
  input.deckConfig.summons.push({
    slot: 2,
    position: "grid",
    summonId: "2040398000",
    level: 150,
    uncapLevel: 4,
    plusMark: 0,
    attackOverride: 3324,
    hpOverride: 1093,
  });

  const response = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });

  assert.equal(response.result.attackPower.baseAttack, 26923);
  assert.equal(response.result.attackPower.totalEffectiveNormalAttackPercent, 153);
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 12573);
  assert.equal(
    response.result.attackPower.contributions[0]?.appliedModifiers.some(
      (modifier) =>
        modifier.sourceType === "summon-aura" &&
        modifier.sourcePosition === "sub" &&
        modifier.sourceSummonId === "2040398000" &&
        modifier.amountPercent === 40,
    ),
    true,
  );
});

test("keeps only the strongest same-effect Wilnas sub aura across both sub slot types", () => {
  const input = agniRequest();
  input.deckConfig.protagonist.attackOverride = 26923;
  input.deckConfig.protagonist.hpOverride = 6188;
  input.deckConfig.summons.push(
    {
      slot: 2,
      position: "grid",
      summonId: "2040398000",
      level: 150,
      uncapLevel: 4,
      plusMark: 0,
      attackOverride: 3324,
      hpOverride: 1093,
    },
    {
      slot: 1,
      position: "sub",
      summonId: "2040398000",
      level: 1,
      uncapLevel: 0,
      plusMark: 0,
      attackOverride: 399,
      hpOverride: 127,
    },
  );

  const response = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });
  const summonModifiers = response.result.attackPower.contributions[0]?.appliedModifiers.filter(
    (modifier) => modifier.sourceType === "summon-aura" && modifier.sourceSummonId === "2040398000",
  );

  assert.deepEqual(summonModifiers?.map((modifier) => modifier.amountPercent), [40]);
  assert.equal(response.result.attackPower.totalEffectiveNormalAttackPercent, 153);
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 12573);
});

test("reproduces the observed 0-star Wilnas sub aura in a normal sub-summon slot", () => {
  const input = agniRequest();
  input.deckConfig.protagonist.attackOverride = 23296;
  input.deckConfig.protagonist.hpOverride = 5029;
  input.deckConfig.summons.push({
    slot: 2,
    position: "grid",
    summonId: "2040398000",
    level: 1,
    uncapLevel: 0,
    plusMark: 0,
    attackOverride: 399,
    hpOverride: 127,
  });

  const response = calculateNormalAttackFromRequest({
    ...input,
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
  });

  assert.equal(response.result.attackPower.totalEffectiveNormalAttackPercent, 144);
  assert.equal(response.result.pursuitDamage?.effectivePursuitPercentage, 21.6);
  assert.equal(response.result.baseDamage.damageBeforeRandomAndCap, 10489);
  assert.deepEqual(
    response.result.attackPower.contributions[0]?.appliedModifiers
      .filter((modifier) => modifier.sourceType === "summon-aura" && modifier.sourceSummonId === "2040398000")
      .map((modifier) => modifier.amountPercent),
    [10],
  );
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
