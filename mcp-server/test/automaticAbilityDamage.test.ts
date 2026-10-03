import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateAutomaticAbilityDamage as calculate } from "../src/calculator/automaticAbilityDamage.ts";
import { generateBattleActions } from "../src/calculator/battleActionGenerator.ts";
import { resolveDamageCalculationRequest } from "../src/calculator/normalAttackCalculationRequest.ts";

function setup() {
  return JSON.parse(readFileSync(new URL("../examples/battle-actions-request.v1.json", import.meta.url), "utf8"));
}
function request(abilityId = "mythical-arms") {
  return { abilityId, calculation: { schemaVersion: 1, deckConfig: setup().deckConfig,
    enemy: { elementCode: "6", defense: 10, maxHp: 1000000000 }, mythicalLancerLevel: 2 } };
}
const conditions = { enemy: { elementCode: "6", defense: 10, maxHp: 1000000000 }, protagonistCurrentHpPercent: 100,
  characters: [{ characterSlot: 1, currentHpPercent: 100 }, { characterSlot: 2, currentHpPercent: 100 }] };

test("automatic abilities retain uncertainty, independent hit ranges and immutable input", () => {
  const input = request(), before = structuredClone(input);
  const result = calculate(input);
  assert.deepEqual(input, before);
  assert.equal(result.verificationStatus, "下書き");
  assert.ok(result.issues.some((issue) => issue.includes("未一致")));
  assert.equal(result.hitCount, 2);
  assert.equal(result.predictions.length, 101);
  assert.equal(result.total.minimum, result.perHit.minimum * 2);
  assert.equal(result.total.maximum, result.perHit.maximum * 2);
  assert.ok(result.predictions.every((p) => Number.isInteger(p.damage) && p.damage > 0));
});

test("normal-only buffs, cap and completion damage never change automatic abilities", () => {
  const input = request();
  const expected = calculate(input).predictions;
  const changed = calculate({ ...input, calculation: { ...input.calculation,
    battleEffects: { normalAttackSupplementalDamage: 100000 },
    modifiers: { normalAttackDamageCapPercent: 80, jobNormalAttackDamagePercent: 60 } } });
  assert.deepEqual(changed.predictions, expected);
});

test("destruction ignores ship, furnace and elemental attack; ordinary abilities use them", () => {
  for (const abilityId of ["other-self", "mythical-arms"]) {
    const input = request(abilityId);
    const plain = calculate(input);
    const enhanced = calculate({ ...input, calculation: { ...input.calculation,
      modifiers: { shipAttackPercent: 10, furnaceAttackPercent: 10, elementAttackPercent: 10, allElementAttackPercent: 3 } } });
    if (abilityId === "other-self") assert.deepEqual(enhanced.predictions, plain.predictions);
    else assert.ok(enhanced.trace.commonPreAbilityDamage > plain.trace.commonPreAbilityDamage);
  }
});

test("damage taken amplification affects only attenuated damage, not fixed supplements", () => {
  const input = request();
  const baseline = calculate(input);
  const changed = calculate({ ...input, calculation: { ...input.calculation,
    battleEffects: { enemyDamageTakenAmplificationPercent: 20, enemySupplementalDamage: 10000 } } });
  const amp = 1 + baseline.trace.amplificationPercent / 100;
  // Allow one final rounding unit. Flat additions stay outside the taken multiplier.
  const estimate = (baseline.perHit.minimum - baseline.trace.supplementalDamage * amp) * 1.2
    + (baseline.trace.supplementalDamage + 10000) * amp;
  assert.ok(Math.abs(estimate - changed.perHit.minimum) <= 2);
});

test("beta and conditional Honing use separate ability cap frames", () => {
  const input = request();
  input.calculation.deckConfig.weapons.push({ slot: 2, position: "grid", weaponId: "1040911000", level: 250, uncapLevel: 6, skillLevel: 25 });
  const inactive = calculate(input);
  assert.equal(inactive.trace.capContributions.weaponAbilityCap, 50);
  assert.equal(inactive.trace.capContributions.weaponSpecialAbilityCap, 0);
  input.calculation.deckConfig.summons = [{ slot: 1, position: "main", summonId: "2040090000", level: 250, uncapLevel: 6 }];
  const calculation = { ...input.calculation, supportSummon: { summonId: "2040090000" } };
  const active = calculate({ ...input, calculation });
  assert.equal(active.trace.capContributions.weaponAbilityCap, 50);
  assert.equal(active.trace.capContributions.weaponSpecialAbilityCap, 30);
  const { calculationInput } = resolveDamageCalculationRequest(calculation);
  assert.ok(calculationInput.deck.effectiveWeaponSkillEffects?.some((e) => e.kind === "special-ability-damage-dealt-up" && e.effectiveAmountPercent === 10));
});

test("generated reactions use pre-application debuffs and match the single-event calculator", () => {
  const input = { ...setup(), automaticAbilityConditions: conditions };
  const plan = generateBattleActions(input);
  const first = plan.turns[0].events.filter((e) => e.kind === "automatic-ability");
  assert.equal(first[1].calculationPatch.battleEffects?.enemySupplementalDamage, 0);
  assert.equal(first[2].calculationPatch.battleEffects?.enemySupplementalDamage, 3000);
  assert.equal(first[2].calculationPatch.battleEffects?.enemyDefenseDownBeyondCapPercent, 0);
  assert.equal(first[3].calculationPatch.battleEffects?.enemyDefenseDownBeyondCapPercent, 10);
  const second = plan.turns[1].events.filter((e) => e.kind === "automatic-ability");
  assert.equal(second[1].abilityId, "other-self");
  assert.equal(second[1].damage?.trace.enemyDamageTakenAmplificationPercent, 0);
  assert.equal(second[2].damage?.trace.enemyDamageTakenAmplificationPercent, 20);
  for (const turn of plan.turns) for (const event of turn.events) {
    if (event.kind !== "automatic-ability") continue;
    const character = conditions.characters.find((c) => c.characterSlot === event.actorPosition);
    const expected = calculate({ abilityId: event.abilityId, calculation: {
      schemaVersion: 1, deckConfig: input.deckConfig, enemy: conditions.enemy, ...event.calculationPatch,
      attacker: character ? { ...character, ...event.calculationPatch.attacker } : undefined } });
    assert.deepEqual(event.damage, expected);
  }
});

test("unsupported actor, unknown random options and missing conditions fail explicitly", () => {
  assert.throws(() => calculate(request("mission-chocolate")), /攻撃者/);
  assert.throws(() => calculate({ ...request(), calculation: { ...request().calculation, random: { minimum: 0.9 } } }));
  const noVersusia = request("other-self"); noVersusia.calculation.deckConfig.summons = [];
  assert.throws(() => calculate(noVersusia), /ヴェルサシア/);
  assert.throws(() => generateBattleActions({ ...setup(), automaticAbilityConditions: { ...conditions,
    characters: [{ characterSlot: 1, currentHpPercent: 100 }, { characterSlot: 3, currentHpPercent: 100 }] } }), /前衛2/);
  assert.throws(() => generateBattleActions({ ...setup(), automaticAbilityConditions: { ...conditions,
    characters: [conditions.characters[0], conditions.characters[0]] } }), /重複/);
});
