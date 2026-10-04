import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { calculateCombatHp } from "../src/calculator/protagonistHpCalculator.ts";
import { createInitialBattleState, applyItem } from "../web/battle-state.js";
import type { EffectiveCharacterHpAura, EffectiveWeaponSkillEffect } from "../src/calculator/types.ts";

function request(): any {
  return { schemaVersion: 1, enemy: { elementCode: "5", defense: 10 }, deckConfig: {
    schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "6", attackOverride: 10000, hpOverride: 10000 },
    weapons: [{ slot: 1, position: "main", weaponId: "1040106500", level: 150, skillLevel: 15 }],
    summons: [], characters: [{ slot: 1, position: "front", characterId: "3040456000", level: 80, elementCode: "6",
      attackOverride: 10000, hpOverride: 10000 }],
  } };
}
const effect = (kind: EffectiveWeaponSkillEffect["kind"], value: number, elementCode = "6"): EffectiveWeaponSkillEffect => ({
  kind, elementCode, baseAmountPercent: value, effectiveAmountPercent: value, sourceWeaponId: "synthetic",
  sourceWeaponSlot: 1, sourceSkillId: "synthetic", sourceSkillName: "合成効果", verificationStatus: "下書き", appliedModifiers: [],
});
const aura: EffectiveCharacterHpAura = { kind: "character-hp-down", elementCode: "0", amountPercent: 30,
  stackingGroup: "synthetic", sourceSummonSlot: 1, sourcePosition: "sub", sourceSummonId: "synthetic",
  sourceAuraName: "合成効果", verificationStatus: "下書き" };

test("Tyranny is multiplicative; summon reduction shares the additive HP stage before fixed HP", () => {
  const result = calculateCombatHp({ baseHp: 1000, elementCode: "6", otherHpPercent: 10,
    effects: [effect("normal-hp-up", 100), effect("weapon-hp-down", 10), effect("weapon-hp-down", 10), effect("weapon-hp-down", 10, "1")],
    auras: [aura], flatAuras: [{ kind: "character-hp-flat", elementCode: "0", amount: 25000,
      sourceSummonSlot: 1, sourcePosition: "main", sourceSummonId: "synthetic", sourceAuraName: "合成固定HP", verificationStatus: "下書き" }] })!;
  assert.equal(result.hp, 26440); // 1000 * 0.8 * (1 + 1 + .1 - .3) + 25000
  assert.equal(result.weaponSkillHpPercent, 100);
  assert.equal(result.weaponHpReductionPercent, 20);
  assert.equal(result.summonAuraPercent, -30);
  assert.ok(result.issues.includes("hp-reduction-unverified"));
  assert.equal(calculateCombatHp({ baseHp: 1000, elementCode: "6", effects: Array.from({ length: 8 }, () => effect("weapon-hp-down", 10)) })!.hp, 300);
  assert.equal(calculateCombatHp({ baseHp: 1000, elementCode: "6", effects: [effect("normal-hp-up", 420), effect("weapon-hp-down", 10)], auras: [aura] })!.hp, 4266);
  assert.equal(calculateCombatHp({ baseHp: 1, auras: [aura] })!.hp, 1);
});

test("registered Tyranny remains 10 percent at every SLv and with Hades; display HP stays intact", () => {
  for (const skillLevel of [1, 15]) {
    const input = request(); input.deckConfig.weapons[0].skillLevel = skillLevel;
    input.deckConfig.summons = [{ slot: 1, position: "main", summonId: "2040090000", uncapLevel: 6 }];
    input.supportSummon = { summonId: "2040090000" };
    const before = structuredClone(input), result = calculateNormalAttackFromRequest(input);
    assert.equal(result.battleHp.protagonist?.hp, 9000);
    assert.equal(result.battleHp.characters[0].result?.hp, 9000);
    assert.equal(result.battleHp.protagonist?.appliedHpReductionEffects?.[0].appliedModifiers.length, 0);
    assert.equal(result.battleHp.characters[0].result?.baseHp, 10000);
    assert.deepEqual(input, before);
  }
});

test("Belial sub HP cut applies once in either sub slot across uncaps, excludes main/support and combines with Tyranny", () => {
  for (const uncapLevel of [0, 3, 4]) {
    const input = request(); input.deckConfig.summons = [
      { slot: 2, position: "grid", summonId: "2040347000", uncapLevel },
      { slot: 6, position: "sub", summonId: "2040347000", uncapLevel },
    ];
    const result = calculateNormalAttackFromRequest(input);
    assert.equal(result.battleHp.protagonist?.hp, 6300);
    assert.equal(result.battleHp.characters[0].result?.hp, 6300);
    assert.equal(result.battleHp.protagonist?.summonHpReductionPercent, 30);
    const initial = createInitialBattleState({ request: input, protagonistMaxHp: result.battleHp.protagonist!.hp,
      characterMaxHp: { 1: result.battleHp.characters[0].result!.hp }, enemyMaxHp: 100000 });
    assert.equal(initial.party[1].hp, 6300);
    initial.party[1].hp = 1000;
    assert.equal(applyItem(initial, { name: "合成回復", scope: "all", healPercent: 50 }).party[1].hp, 4150);
  }
  const input = request(); input.deckConfig.summons = [{ slot: 1, position: "main", summonId: "2040347000", uncapLevel: 4 }];
  input.supportSummon = { summonId: "2040347000" };
  assert.equal(calculateNormalAttackFromRequest(input).battleHp.protagonist?.summonHpReductionPercent, undefined);
});

test("Death loses its main HP penalty at five stars, and the penalty never applies from sub slots", () => {
  for (const [uncapLevel, position, expected] of [[3, "main", 7000], [4, "main", 7000], [5, "main", 10000], [4, "sub", 10000]] as const) {
    const input = request(); input.deckConfig.weapons = [];
    input.deckConfig.summons = [{ slot: 1, position, summonId: "2040315000", uncapLevel }];
    const result = calculateNormalAttackFromRequest(input);
    assert.equal(result.battleHp.characters[0].result?.hp, expected);
    assert.equal(result.battleHp.protagonist?.hp, expected);
  }
});
