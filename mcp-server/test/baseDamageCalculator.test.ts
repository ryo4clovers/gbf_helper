import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDefenseAdjustedBaseDamage,
  inferCompositeDefenseDivisor,
} from "../src/calculator/baseDamageCalculator.ts";
import type { NormalAttackPowerResult } from "../src/calculator/normalAttackPowerCalculator.ts";
import type { DamageCalculationInput } from "../src/calculator/types.ts";

const attackPower: NormalAttackPowerResult = {
  schemaVersion: 1,
  stage: "normal-weapon-skill-frame",
  baseAttack: 19484,
  contributions: [],
  totalEffectiveNormalAttackPercent: 39,
  normalAttackSkillMultiplier: 1.39,
  normalSkillAdjustedAttack: 27082.76,
  elementalSummonAuraContributions: [],
  totalElementalSummonAuraPercent: 0,
  summonAuraMultiplier: 1,
  summonAuraAdjustedAttack: 27082.76,
  issues: [],
};

function inputWithDefense(defense?: number): DamageCalculationInput {
  return {
    schemaVersion: 1,
    deck: {
      schemaVersion: 1,
      protagonist: {},
      characters: [],
      weapons: [],
      summons: [],
    },
    battle: {
      schemaVersion: 1,
      enemies: [
        {
          slot: 1,
          enemyId: "9900007",
          defense,
          defenseSource: defense === undefined ? undefined : "user-override",
        },
      ],
      enemyPassiveEffectCount: 0,
      fieldEffectCount: 0,
    },
    targetEnemySlot: 1,
  };
}

test("divides summon-aura-adjusted attack by explicit enemy defense", () => {
  const result = calculateDefenseAdjustedBaseDamage(inputWithDefense(10), attackPower);

  assert.equal(result.status, "partial");
  assert.equal(result.enemyDefense, 10);
  assert.equal(result.enemyDefenseSource, "user-override");
  assert.equal(result.damageBeforeRandomAndCap, 2708.276);
  assert.deepEqual(result.unresolvedStages, ["rounding", "damage-cap"]);
  assert.deepEqual(
    result.stages.map((stage) => stage.stage),
    [
      "elemental-attack",
      "crew-ship",
      "crew-furnace",
      "normal-attack-damage",
      "damage-dealt",
      "target-element-damage",
    ],
  );
});

test("requires enemy defense instead of silently assuming a default", () => {
  assert.throws(
    () => calculateDefenseAdjustedBaseDamage(inputWithDefense(), attackPower),
    /enemy defense is unresolved/,
  );
});

test("infers a diagnostic composite divisor without calling it enemy defense", () => {
  assert.equal(inferCompositeDefenseDivisor(27082.76, 3950), 6.856395);
});

test("reproduces the displayed neutral damage with independent account, crew, and job stages", () => {
  const input = inputWithDefense(10);
  input.deck.protagonist.elementCode = "1";
  input.deck.protagonist.job = {
    masterId: "110001",
    classCode: "1",
    weaponKindCodes: [],
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
  input.battle.enemies[0].elementCode = "1";
  input.crewModifiers = { shipAttackPercent: 10, furnaceAttackPercent: 10 };
  input.accountBonuses = {
    schemaVersion: 1,
    issues: [],
    modifiers: [
      {
        stage: "elemental-attack",
        amountPercent: 3,
        sourceType: "account-item",
        sourceId: "9013",
        sourceName: "シグナム・へレディス",
        verificationStatus: "下書き",
      },
      {
        stage: "elemental-attack",
        amountPercent: 10,
        sourceType: "account-item",
        sourceId: "1001",
        sourceName: "祝融の玲瓏佩",
        elementCode: "1",
        verificationStatus: "下書き",
      },
      {
        stage: "damage-dealt",
        amountPercent: 3.6,
        sourceType: "account-item",
        sourceId: "9015",
        sourceName: "シンボルム・アミキティアエ",
        verificationStatus: "下書き",
      },
      {
        stage: "damage-cap",
        amountPercent: 3,
        sourceType: "account-item",
        sourceId: "9014",
        sourceName: "オプリメル・フラゴル",
        verificationStatus: "下書き",
      },
    ],
  };

  const result = calculateDefenseAdjustedBaseDamage(input, attackPower);

  assert.equal(result.attackBeforeDefense, 39514.247437);
  assert.equal(result.damageBeforeRandomAndCap, 3951.424744);
  assert.deepEqual(
    result.stages.map((stage) => [stage.stage, stage.totalPercent]),
    [
      ["elemental-attack", 13],
      ["crew-ship", 10],
      ["crew-furnace", 10],
      ["normal-attack-damage", 3],
      ["damage-dealt", 3.6],
      ["target-element-damage", 0],
    ],
  );
  assert.equal(result.deferredCapModifiers.length, 1);
});

test("does not apply the non-Class.V job bonus to a Class.V job", () => {
  const input = inputWithDefense(10);
  input.deck.protagonist.job = {
    masterId: "150001",
    classCode: "5",
    weaponKindCodes: [],
    damageModifiers: [
      {
        stage: "normal-attack-damage",
        amountPercent: 3,
        sourceType: "job-master-bonus",
        sourceId: "my_job_class_if:final_attack_rise_plus",
        sourceName: "conditional bonus",
        condition: "non-class-v",
        verificationStatus: "下書き",
      },
    ],
  };

  const result = calculateDefenseAdjustedBaseDamage(input, attackPower);
  assert.equal(result.stages.find((stage) => stage.stage === "normal-attack-damage")?.totalPercent, 0);
});

test("adds elemental superiority in the elemental frame and applies target-element damage separately", () => {
  const input = inputWithDefense(10);
  input.deck.protagonist.elementCode = "1";
  input.battle.enemies[0].elementCode = "4";
  input.accountBonuses = {
    schemaVersion: 1,
    issues: [],
    modifiers: [
      {
        stage: "elemental-attack",
        amountPercent: 10,
        sourceType: "account-item",
        sourceId: "1001",
        sourceName: "祝融の玲瓏佩",
        elementCode: "1",
        verificationStatus: "下書き",
      },
      {
        stage: "target-element-damage",
        amountPercent: 5,
        sourceType: "account-item",
        sourceId: "1001",
        sourceName: "祝融の玲瓏佩",
        targetElementCode: "4",
        verificationStatus: "下書き",
      },
    ],
  };
  const simpleAttackPower = { ...attackPower, normalSkillAdjustedAttack: 100 };

  const result = calculateDefenseAdjustedBaseDamage(input, simpleAttackPower);

  assert.equal(result.stages[0].totalPercent, 60);
  assert.equal(result.stages.at(-1)?.totalPercent, 5);
  assert.equal(result.damageBeforeRandomAndCap, 16.8);
});
