import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import {
  calculateBattleNormalAttackPower,
  calculateNormalAttackPower,
} from "../src/calculator/normalAttackPowerCalculator.ts";
import type { BattleSnapshot, DeckSnapshot } from "../src/calculator/types.ts";

test("applies the combined 39% normal weapon-skill frame to protagonist attack", () => {
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

  const result = calculateNormalAttackPower(resolution.deck);

  assert.equal(result.stage, "normal-weapon-skill-frame");
  assert.equal(result.baseAttack, 19484);
  assert.deepEqual(
    result.contributions.map((effect) => [effect.sourceSkillId, effect.effectiveAmountPercent]),
    [
      ["25", 23.4],
      ["845", 15.6],
    ],
  );
  assert.equal(result.totalEffectiveNormalAttackPercent, 39);
  assert.equal(result.normalAttackSkillMultiplier, 1.39);
  assert.equal(result.normalSkillAdjustedAttack, 27082.76);
  assert.deepEqual(result.elementalSummonAuraContributions, []);
  assert.equal(result.totalElementalSummonAuraPercent, 0);
  assert.equal(result.summonAuraMultiplier, 1);
  assert.equal(result.summonAuraAdjustedAttack, 27082.76);
  assert.deepEqual(result.issues, []);
});

test("uses a neutral 1.0 multiplier when no normal attack-up effect is resolved", () => {
  const deck = {
    schemaVersion: 1,
    protagonist: { attack: 1000, elementCode: "1" },
    characters: [],
    weapons: [],
    summons: [],
  } satisfies DeckSnapshot;

  const result = calculateNormalAttackPower(deck);
  assert.equal(result.totalEffectiveNormalAttackPercent, 0);
  assert.equal(result.normalAttackSkillMultiplier, 1);
  assert.equal(result.normalSkillAdjustedAttack, 1000);
  assert.equal(result.totalEffectiveExAttackPercent, 0);
  assert.equal(result.exAttackSkillMultiplier, 1);
  assert.equal(result.exSkillAdjustedAttack, 1000);
  assert.equal(result.summonAuraMultiplier, 1);
  assert.equal(result.summonAuraAdjustedAttack, 1000);
});

test("applies EX attack as a separate multiplicative weapon-skill frame", () => {
  const deck = {
    schemaVersion: 1,
    protagonist: { attack: 1000, elementCode: "1" },
    characters: [],
    weapons: [],
    summons: [],
    effectiveWeaponSkillEffects: [{
      sourceWeaponSlot: 1,
      sourceWeaponId: "1040023700",
      sourceSkillId: "1913",
      sourceSkillName: "スカーレット・コンバージェンス",
      kind: "ex-attack-up",
      elementCode: "1",
      baseAmountPercent: 40,
      effectiveAmountPercent: 40,
      verificationStatus: "検証済み",
      appliedModifiers: [],
    }],
  } satisfies DeckSnapshot;

  const result = calculateNormalAttackPower(deck);
  assert.equal(result.normalAttackSkillMultiplier, 1);
  assert.equal(result.totalEffectiveExAttackPercent, 40);
  assert.equal(result.exAttackSkillMultiplier, 1.4);
  assert.equal(result.exSkillAdjustedAttack, 1400);
  assert.equal(result.summonAuraAdjustedAttack, 1400);
});

test("applies a resolved elemental main-summon aura as a separate multiplier", () => {
  const deck = {
    schemaVersion: 1,
    protagonist: { attack: 1000, elementCode: "1" },
    characters: [],
    weapons: [],
    summons: [
      {
        slot: 1,
        position: "main",
        masterId: "fire-summon",
        aura: {
          name: "火属性攻撃UP",
          description: "火属性攻撃力が50%UP",
          effects: [
            {
              kind: "elemental-attack-up",
              elementCode: "1",
              amountPercent: 50,
              activation: "always",
              description: "火属性攻撃力が50%UP",
            },
          ],
          verificationStatus: "検証済み",
          source: "test",
        },
      },
    ],
  } satisfies DeckSnapshot;

  const result = calculateNormalAttackPower(deck);
  assert.equal(result.totalElementalSummonAuraPercent, 50);
  assert.equal(result.summonAuraMultiplier, 1.5);
  assert.equal(result.summonAuraAdjustedAttack, 1500);
});

test("applies character attack and elemental attack sub auras in separate frames", () => {
  const deck = {
    schemaVersion: 1,
    protagonist: { attack: 1000, elementCode: "1" },
    characters: [],
    weapons: [],
    summons: [
      {
        slot: 2,
        position: "grid",
        masterId: "colossus",
        aura: {
          name: "コロッサス・マグナの加護",
          description: "火属性キャラの攻撃力が10%UP",
          effects: [{
            kind: "character-attack-up",
            elementCode: "1",
            amountPercent: 10,
            activation: "sub-only",
            description: "火属性キャラの攻撃力が10%UP",
          }],
          verificationStatus: "検証済み",
          source: "test",
        },
      },
      {
        slot: 3,
        position: "grid",
        masterId: "agni",
        aura: {
          name: "アグニスの加護",
          description: "火属性攻撃力が20%UP",
          effects: [{
            kind: "elemental-attack-up",
            elementCode: "1",
            amountPercent: 20,
            activation: "sub-only",
            description: "火属性攻撃力が20%UP",
          }],
          verificationStatus: "検証済み",
          source: "test",
        },
      },
    ],
  } satisfies DeckSnapshot;

  const result = calculateNormalAttackPower(deck);
  assert.equal(result.characterAttackSummonAuraMultiplier, 1.1);
  assert.equal(result.characterAttackSummonAuraAdjustedAttack, 1100);
  assert.equal(result.summonAuraMultiplier, 1.2);
  assert.equal(result.summonAuraAdjustedAttack, 1320);
});

test("does not apply a dark support aura to a fire protagonist", () => {
  const deck = {
    schemaVersion: 1,
    protagonist: { attack: 1000, elementCode: "1" },
    characters: [],
    weapons: [],
    summons: [],
  } satisfies DeckSnapshot;
  const result = calculateNormalAttackPower(deck, {
    supportSummon: {
      masterId: "2040090000",
      name: "ハデス",
      elementCode: "6",
      aura: {
        name: "ハデスの加護",
        description: "闇属性用加護",
        effects: [
          {
            kind: "normal-skill-boost",
            elementCode: "6",
            amountPercent: 170,
            targetSkillNamePrefixes: ["闇", "憎悪", "奈落"],
            activation: "always",
            description: "闇属性通常スキル170%UP",
          },
          {
            kind: "elemental-attack-up",
            elementCode: "6",
            amountPercent: 30,
            activation: "main-only",
            description: "メイン装備時のみ闇属性攻撃30%UP",
          },
        ],
        verificationStatus: "検証済み",
        source: "test",
      },
    },
  });

  assert.equal(result.summonAuraMultiplier, 1);
  assert.equal(result.summonAuraAdjustedAttack, 1000);
  assert.deepEqual(result.issues, []);
});

test("resolves the battle support summon and keeps the current fire multiplier at 1.0", () => {
  const deck = {
    schemaVersion: 1,
    protagonist: { attack: 1000, elementCode: "1" },
    characters: [],
    weapons: [],
    summons: [],
  } satisfies DeckSnapshot;
  const battle = {
    schemaVersion: 1,
    enemies: [],
    enemyPassiveEffectCount: 0,
    fieldEffectCount: 0,
    supportSummon: { masterId: "2040090000", name: "ハデス", elementCode: "6" },
  } satisfies BattleSnapshot;

  const result = calculateBattleNormalAttackPower(deck, battle);
  assert.equal(result.summonAuraMultiplier, 1);
  assert.equal(result.summonAuraAdjustedAttack, 1000);
  assert.deepEqual(result.issues, []);
});

test("rejects a deck without resolved protagonist attack", () => {
  const deck = {
    schemaVersion: 1,
    protagonist: {},
    characters: [],
    weapons: [],
    summons: [],
  } satisfies DeckSnapshot;

  assert.throws(() => calculateNormalAttackPower(deck), /protagonist attack/);
});
