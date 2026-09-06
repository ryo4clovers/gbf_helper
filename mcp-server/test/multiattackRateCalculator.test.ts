import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateProtagonistMultiattackRates } from "../src/calculator/multiattackRateCalculator.ts";
import type { DeckSnapshot } from "../src/calculator/types.ts";

function deck(): DeckSnapshot {
  return {
    schemaVersion: 1,
    protagonist: {
      elementCode: "1",
      job: {
        masterId: "test-job",
        name: "テストジョブ",
        weaponKindCodes: [],
        baseDoubleAttackRate: 7,
        baseTripleAttackRate: 3,
        jobCompletionDoubleAttackRate: 7,
        jobCompletionTripleAttackRate: 5,
        multiattackRateBonuses: [
          {
            sourceType: "job-level",
            level: 20,
            doubleAttackRatePercent: 10,
            tripleAttackRatePercent: 5,
            verificationStatus: "検証済み",
          },
        ],
      },
    },
    characters: [],
    weapons: [],
    summons: [],
    effectiveWeaponSkillEffects: [
      {
        sourceWeaponSlot: 1,
        sourceWeaponId: "weapon-a",
        sourceSkillId: "da-skill",
        sourceSkillName: "火の二手",
        kind: "double-attack-rate-up",
        elementCode: "1",
        baseAmountPercent: 10,
        effectiveAmountPercent: 13,
        verificationStatus: "検証済み",
        appliedModifiers: [],
      },
      {
        sourceWeaponSlot: 2,
        sourceWeaponId: "weapon-b",
        sourceSkillId: "wrong-element",
        sourceSkillName: "水の三手",
        kind: "triple-attack-rate-up",
        elementCode: "2",
        baseAmountPercent: 20,
        effectiveAmountPercent: 20,
        verificationStatus: "検証済み",
        appliedModifiers: [],
      },
    ],
  };
}

test("combines job base, acquired level bonuses and matching weapon skills", () => {
  const result = calculateProtagonistMultiattackRates(deck());

  assert.equal(result.doubleAttackRatePercent, 37);
  assert.equal(result.tripleAttackRatePercent, 13);
  assert.deepEqual(result.issues, ["battle-buffs-unresolved"]);
  assert.deepEqual(result.contributions.map((contribution) => contribution.sourceType), [
    "job-base",
    "job-completion",
    "job-level",
    "weapon-skill",
  ]);
});

test("caps displayed probabilities while retaining uncapped totals", () => {
  const input = deck();
  input.protagonist.job.baseDoubleAttackRate = 95;
  const result = calculateProtagonistMultiattackRates(input);

  assert.equal(result.doubleAttackRatePercent, 100);
  assert.equal(result.uncappedDoubleAttackRatePercent, 125);
});

test("adds acquired job completion bonuses independently of the selected job", () => {
  const result = calculateProtagonistMultiattackRates(deck());

  assert.equal(result.contributions[1]?.sourceType, "job-completion");
  assert.equal(result.contributions[1]?.sourceName, "取得済みジョブのコンプリートボーナス合計");
});

test("floors final DA and TA rates after summing fractional contributions", () => {
  const input = deck();
  input.protagonist.job.multiattackRateBonuses = [];
  input.effectiveWeaponSkillEffects = [
    {
      sourceWeaponSlot: 1,
      sourceWeaponId: "fractional-weapon",
      sourceSkillId: "trium",
      sourceSkillName: "三手",
      kind: "double-attack-rate-up",
      elementCode: "1",
      baseAmountPercent: 7,
      effectiveAmountPercent: 32.9,
      verificationStatus: "検証済み",
      appliedModifiers: [],
    },
    {
      sourceWeaponSlot: 1,
      sourceWeaponId: "fractional-weapon",
      sourceSkillId: "trium",
      sourceSkillName: "三手",
      kind: "triple-attack-rate-up",
      elementCode: "1",
      baseAmountPercent: 7,
      effectiveAmountPercent: 32.9,
      verificationStatus: "検証済み",
      appliedModifiers: [],
    },
  ];

  const result = calculateProtagonistMultiattackRates(input);
  assert.equal(result.uncappedDoubleAttackRatePercent, 46.9);
  assert.equal(result.uncappedTripleAttackRatePercent, 40.9);
  assert.equal(result.doubleAttackRatePercent, 46);
  assert.equal(result.tripleAttackRatePercent, 40);
});

test("caps the normal weapon-skill DA and TA frames at 75% before adding job rates", () => {
  const input = deck();
  input.protagonist.job.multiattackRateBonuses = [];
  input.effectiveWeaponSkillEffects = [
    ...[32.9, 32.9, 5.64].flatMap((rate, index) => [
      {
        sourceWeaponSlot: index + 1,
        sourceWeaponId: `trium-${index + 1}`,
        sourceSkillId: `trium-${index + 1}`,
        sourceSkillName: "紅蓮の三手",
        kind: "double-attack-rate-up" as const,
        elementCode: "1",
        baseAmountPercent: rate,
        effectiveAmountPercent: rate,
        verificationStatus: "検証済み" as const,
        appliedModifiers: [],
      },
      {
        sourceWeaponSlot: index + 1,
        sourceWeaponId: `trium-${index + 1}`,
        sourceSkillId: `trium-${index + 1}`,
        sourceSkillName: "紅蓮の三手",
        kind: "triple-attack-rate-up" as const,
        elementCode: "1",
        baseAmountPercent: rate,
        effectiveAmountPercent: rate,
        verificationStatus: "検証済み" as const,
        appliedModifiers: [],
      },
    ]),
    {
      sourceWeaponSlot: 4,
      sourceWeaponId: "dance",
      sourceSkillId: "dance",
      sourceSkillName: "業火の乱舞",
      kind: "triple-attack-rate-up",
      elementCode: "1",
      baseAmountPercent: 5.64,
      effectiveAmountPercent: 5.64,
      verificationStatus: "下書き",
      appliedModifiers: [],
    },
  ];

  const result = calculateProtagonistMultiattackRates(input);
  assert.equal(result.uncappedWeaponSkillDoubleAttackRatePercent, 71.44);
  assert.equal(result.weaponSkillDoubleAttackRatePercent, 71.44);
  assert.equal(result.uncappedWeaponSkillTripleAttackRatePercent, 77.08);
  assert.equal(result.weaponSkillTripleAttackRatePercent, 75);
  assert.equal(result.uncappedDoubleAttackRatePercent, 85.44);
  assert.equal(result.uncappedTripleAttackRatePercent, 83);
  assert.equal(result.doubleAttackRatePercent, 85);
  assert.equal(result.tripleAttackRatePercent, 83);
});
