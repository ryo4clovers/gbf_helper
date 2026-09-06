import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAccountBonusResponse } from "../src/calculator/accountBonusParser.ts";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import { calculateNormalAttackDamage } from "../src/calculator/normalAttackDamageCalculator.ts";
import type { DamageCalculationInput } from "../src/calculator/types.ts";

function makeCurrentInput(): DamageCalculationInput {
  const resolution = resolveCalculatorDeckConfig({
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
  });
  resolution.deck.protagonist.job = {
    masterId: "110001",
    classCode: "1",
    weaponKindCodes: ["1", "3"],
    damageModifiers: [
      {
        stage: "normal-attack-damage",
        amountPercent: 3,
        sourceType: "job-master-bonus",
        sourceId: "my_job_class_if:final_attack_rise_plus",
        sourceName: "Class.V以外のジョブの時、通常攻撃の与ダメージUP",
        condition: "non-class-v",
        verificationStatus: "下書き",
      },
    ],
  };

  return {
    schemaVersion: 1,
    deck: resolution.deck,
    battle: {
      schemaVersion: 1,
      enemies: [
        {
          slot: 1,
          enemyId: "9900007",
          elementCode: "1",
          defense: 10,
          defenseSource: "user-override",
        },
      ],
      enemyPassiveEffectCount: 0,
      fieldEffectCount: 0,
    },
    targetEnemySlot: 1,
    accountBonuses: parseAccountBonusResponse([
      {
        item: [
          {
            item_id: "9013",
            name: "シグナム・へレディス",
            set_flg: "1",
            comment: "全属性攻撃力が3％UPする。",
          },
          {
            item_id: "9015",
            name: "シンボルム・アミキティアエ",
            set_flg: "1",
            effective_acquired_bonus: { current_bonus: { name: "与ダメージ", value: 3.6 } },
          },
          {
            item_id: "1001",
            name: "祝融の玲瓏佩",
            set_flg: "1",
            effective_acquired_bonus: [
              { name: "火属性攻撃力", detail: "＋10％" },
              { name: "対風属性与ダメージ", detail: "＋5％" },
              { name: "通常攻撃ダメージ上限", detail: "＋5％" },
            ],
          },
        ],
      },
    ]),
    crewModifiers: { shipAttackPercent: 10, furnaceAttackPercent: 10 },
  };
}

test("connects staged base damage to independent 101-pattern body and pursuit distributions", () => {
  const result = calculateNormalAttackDamage(makeCurrentInput());

  assert.equal(result.baseDamage.model, "article-2026-07");
  assert.equal(result.baseDamage.damageBeforeRandomAndCap, 3950);
  assert.equal(result.bodyDamageDistribution.nominalDamage, 3949.8298658000003);
  assert.equal(result.bodyDamageDistribution.finalRounding, "ceil");
  assert.equal(result.bodyDamageDistribution.patternCount, 101);
  assert.equal(result.bodyDamageDistribution.minimumDamage, 3753);
  assert.equal(result.bodyDamageDistribution.maximumDamage, 4148);
  assert.equal(result.pursuitDamage?.effectivePursuitPercentage, 5.85);
  assert.equal(result.pursuitDamage?.nominalPursuitDamage, 231.075);
  assert.equal(result.pursuitDamage?.damageDistribution.patternCount, 101);
  assert.equal(result.pursuitDamage?.damageDistribution.nominalPreparation, "none");
  assert.equal(result.pursuitDamage?.damageDistribution.finalRounding, "floor");
  assert.equal(result.pursuitDamage?.damageDistribution.minimumDamage, 219);
  assert.equal(result.pursuitDamage?.damageDistribution.maximumDamage, 242);
  assert.deepEqual(result.totalDamageDistribution, {
    schemaVersion: 1,
    model: "independent-discrete-components",
    componentCount: 2,
    combinationCount: 10201,
    minimumDamage: 3972,
    maximumDamage: 4390,
    expectedDamage:
      result.bodyDamageDistribution.expectedDamage +
      (result.pursuitDamage?.damageDistribution.expectedDamage ?? 0),
  });
});

test("returns only the 101 body patterns when the deck has no pursuit effect", () => {
  const input = makeCurrentInput();
  input.deck.effectiveWeaponSkillEffects = input.deck.effectiveWeaponSkillEffects?.filter(
    (effect) => effect.kind !== "elemental-pursuit",
  );

  const result = calculateNormalAttackDamage(input);

  assert.equal(result.pursuitDamage, undefined);
  assert.equal(result.totalDamageDistribution.componentCount, 1);
  assert.equal(result.totalDamageDistribution.combinationCount, 101);
  assert.equal(result.totalDamageDistribution.minimumDamage, result.bodyDamageDistribution.minimumDamage);
  assert.equal(result.totalDamageDistribution.maximumDamage, result.bodyDamageDistribution.maximumDamage);
});

test("contains all 12 reacquired body and pursuit observations", () => {
  const result = calculateNormalAttackDamage(makeCurrentInput());
  const observations = [
    [3824, 236],
    [3931, 240],
    [3982, 238],
    [4073, 223],
    [3867, 225],
    [4006, 228],
    [3757, 227],
    [4057, 227],
    [3777, 220],
    [3820, 224],
    [4014, 241],
    [3856, 222],
  ];
  const pursuitDistribution = result.pursuitDamage?.damageDistribution;
  assert.ok(pursuitDistribution !== undefined);

  for (const [body, pursuit] of observations) {
    assert.ok(body >= result.bodyDamageDistribution.minimumDamage);
    assert.ok(body <= result.bodyDamageDistribution.maximumDamage);
    assert.ok(pursuit >= pursuitDistribution.minimumDamage);
    assert.ok(pursuit <= pursuitDistribution.maximumDamage);
    assert.ok(body + pursuit >= result.totalDamageDistribution.minimumDamage);
    assert.ok(body + pursuit <= result.totalDamageDistribution.maximumDamage);
  }
});
