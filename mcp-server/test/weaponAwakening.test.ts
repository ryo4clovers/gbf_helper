import { test } from "node:test";
import assert from "node:assert/strict";
import { createSelectableWeaponCatalog } from "../src/calculator/weaponCatalogView.ts";
import { resolveWeaponAwakenings, weaponAwakeningOptions } from "../src/calculator/weaponAwakening.ts";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { calculateNormalAttackPower } from "../src/calculator/normalAttackPowerCalculator.ts";
import { calculateProtagonistHp } from "../src/calculator/protagonistHpCalculator.ts";
import { calculateOtherWeaponSkills } from "../src/calculator/otherWeaponSkillCalculator.ts";
import { calculateProtagonistMultiattackRates } from "../src/calculator/multiattackRateCalculator.ts";
import { calculateIlsaDamage } from "../src/calculator/ilsaDamage.ts";
import { calculateWeaponChargeDamage } from "../src/calculator/weaponChargeAttack.ts";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";
import type { CalculatorDeckConfig, DeckWeapon } from "../src/calculator/types.ts";

function weapon(weaponId: string, form?: string, level = 4, slot = 1) {
  return { weaponId, slot, position: slot === 1 ? "main" as const : "grid" as const,
    level: 150, uncapLevel: 4, skillLevel: 15,
    ...(form ? { awakening: { formCode: `limited-${form}`, level } } : {}) };
}
function config(weapons = [weapon("1040014300")]): CalculatorDeckConfig {
  return { schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "6", attackOverride: 10000, hpOverride: 1000, jobId: "110001", jobLevel: 20 },
    weapons, summons: [], characters: [{ slot: 1, position: "front", characterId: "3040456000",
      level: 80, attackOverride: 10000, hpOverride: 1000 }] };
}
const request = (deckConfig: CalculatorDeckConfig) => ({ schemaVersion: 1 as const, deckConfig,
  enemy: { elementCode: "5", defense: 10, maxHp: 1e9 }, modifiers: {} });

test("awakening catalog covers 30 known masters, two choices each and cumulative levels for all six types", () => {
  const catalog = createSelectableWeaponCatalog().weapons.filter(w => w.awakening);
  assert.equal(catalog.length, 30);
  assert.ok(catalog.every(w => w.awakening!.types.length === 2));
  assert.equal(weaponAwakeningOptions("1040314300"), undefined); // Pain and Suffering is not eligible.
  const expected: Record<string, [string, string, number, number, number]> = {
    attack: ["1040108700", "normal-attack-up", 15, 15, 40],
    defense: ["1040008700", "normal-hp-up", 15, 15, 40],
    charge: ["1040108700", "charge-supplemental-damage", 0, 0, 100000],
    ability: ["1040008700", "ability-damage-cap-up", 10, 10, 25],
    healing: ["1040014300", "healing-cap-up", 10, 10, 30],
    multiattack: ["1040014300", "triple-attack-rate-up", 5, 5, 10],
  };
  for (const [type, [id, kind, ...amounts]] of Object.entries(expected)) {
    for (const level of [1, 2, 3, 4]) {
      const input: DeckWeapon = { ...weapon(id, type, level), masterId: id, skills: [] };
      const result = resolveWeaponAwakenings([input]);
      const amount = result.effects.filter(e => e.kind === kind).reduce((sum, e) => sum + (e.effectiveAmountFlat ?? e.effectiveAmountPercent), 0);
      assert.equal(amount, level === 1 ? 0 : amounts[level - 2], `${type} Lv${level}`);
      assert.ok(result.effects.every(e => e.verificationStatus === "下書き" && e.appliedModifiers.length === 0));
    }
  }
});

test("unknown imports, unsupported combinations and unavailable levels remain explicit and never apply", () => {
  const base: DeckWeapon = { ...weapon("1040014300", "multiattack"), masterId: "1040014300", skills: [] };
  for (const patch of [{ awakening: { formCode: "7", level: 4 } }, { awakening: { formCode: "limited-attack", level: 4 } },
    { awakening: { formCode: "limited-multiattack", level: 5 } }, { awakening: { formCode: "limited-multiattack" } },
    { masterId: "1040314300" }]) {
    const result = resolveWeaponAwakenings([{ ...base, ...patch }]);
    assert.equal(result.effects.length, 0);
    assert.equal(result.issues[0].code, "weapon-awakening-unresolved");
  }
  for (const patch of [{ level: 149 }, { uncapLevel: 3 }, { level: undefined }]) {
    const result = resolveWeaponAwakenings([{ ...base, ...patch }]);
    assert.equal(result.effects.length, 0);
    assert.equal(result.issues[0].code, "weapon-awakening-inactive");
  }
  assert.equal(resolveWeaponAwakenings([{ ...base, uncapLevel: undefined }]).effects.length, 3);
});

test("awakening attack is normal-frame, applies across elements and is never aura or SLv boosted", () => {
  const input = config([weapon("1040108700", "attack")]);
  input.protagonist.elementCode = "1"; // Off-element awakening remains active; native dark skills do not.
  const original = structuredClone(input);
  const low = resolveCalculatorDeckConfig(input);
  assert.deepEqual(input, original);
  assert.equal(calculateNormalAttackPower(low.deck).totalEffectiveNormalAttackPercent, 40);
  input.protagonist.elementCode = "6";
  input.summons = [{ slot: 1, position: "main", summonId: "2040100000", uncapLevel: 6, level: 250 }];
  const high = resolveCalculatorDeckConfig(input).deck.effectiveWeaponSkillEffects!.filter(e => e.sourceSkillId.startsWith("awakening:"));
  assert.deepEqual(high, low.deck.effectiveWeaponSkillEffects!.filter(e => e.sourceSkillId.startsWith("awakening:")));
  input.weapons[0].skillLevel = 1;
  assert.deepEqual(resolveCalculatorDeckConfig(input).deck.effectiveWeaponSkillEffects!.filter(e => e.sourceSkillId.startsWith("awakening:")), high);
});

test("defense, healing, resistance and multiattack feed the existing aggregate calculations", () => {
  const noAwakening = resolveCalculatorDeckConfig(config([weapon("1040008700")])).deck;
  const defense = resolveCalculatorDeckConfig(config([weapon("1040008700", "defense")])).deck;
  assert.equal(calculateProtagonistHp(defense)!.hp - calculateProtagonistHp(noAwakening)!.hp, 400);
  assert.equal(defense.effectiveWeaponSkillEffects!.find(e => e.kind === "weapon-defense-up")!.effectiveAmountPercent, 20);
  const healed = calculateOtherWeaponSkills(resolveCalculatorDeckConfig(config([weapon("1040014300", "healing")])).deck);
  assert.equal(healed.healingCap.effectivePercent, 30);
  assert.equal(healed.debuffResistance.effectivePercent, 10);
  const multi = calculateProtagonistMultiattackRates(resolveCalculatorDeckConfig(config([weapon("1040014300", "multiattack")])).deck);
  assert.equal(multi.contributions.filter(c => c.sourceType === "weapon-skill").reduce((s,c) => s+c.doubleAttackRatePercent,0), 20);
  assert.equal(multi.contributions.filter(c => c.sourceType === "weapon-skill").reduce((s,c) => s+c.tripleAttackRatePercent,0), 10);
});

test("two charge awakenings add per-CA damage and supplements to MC and Ilsa, never normal or ability damage", () => {
  const initial = request(config([weapon("1040014300"), weapon("1040108700", undefined, 4, 2), weapon("1040108700", undefined, 4, 3)]));
  const awakened = structuredClone(initial);
  for (const w of awakened.deckConfig.weapons.slice(1)) w.awakening = { formCode: "limited-charge", level: 4 };
  const baseline = calculateWeaponChargeDamage(initial), changed = calculateWeaponChargeDamage(awakened);
  assert.equal(changed.trace.damageContributions.weapon, 40);
  assert.equal(changed.trace.capContributions.weaponChargeCap, 20);
  assert.equal(changed.trace.supplementalDamage - baseline.trace.supplementalDamage, 200000);
  assert.ok(changed.perHit.minimum > baseline.perHit.minimum);
  const character = { characterSlot: 1, currentHpPercent: 100 };
  const ilsa = calculateIlsaDamage({ ...awakened, attacker: character }, "charge", 1);
  assert.equal(ilsa.trace.damageContributions.weapon, 40);
  assert.equal(ilsa.trace.capContributions.weaponChargeCap, 20);
  assert.equal(ilsa.trace.supplementalDamage, 200000);
  assert.deepEqual(calculateIlsaDamage({ ...awakened, attacker: character }, "ability", 1).predictions,
    calculateIlsaDamage({ ...initial, attacker: character }, "ability", 1).predictions);
  assert.deepEqual(calculateNormalAttackFromRequest(initial).result.bodyDamageDistribution,
    calculateNormalAttackFromRequest(awakened).result.bodyDamageDistribution);
  const turn = calculateBattleTurn({ calculation: awakened, protagonistCharge: { enabled: true, gauge: 100 }, ilsaChargeEnabled: true,
    characters: [{ characterSlot: 1, currentHpPercent: 100, chargeGauge: 100 }], mode: "downside", secondsPerTurn: 15 });
  const charges = turn.events.filter(e => e.kind === "charge-attack");
  assert.equal(charges.length, 2);
  assert.ok(charges.every(e => e.damage.trace.damageContributions.weapon === 40));
});

test("ability awakening changes ability multiplier and cap without contaminating CA or normal hits", () => {
  const base = request(config([weapon("1040008700")]));
  const enhanced = structuredClone(base); enhanced.deckConfig.weapons[0].awakening = { formCode: "limited-ability", level: 4 };
  const attacker = { characterSlot: 1, currentHpPercent: 100 };
  const before = calculateIlsaDamage({ ...base, attacker }, "ability", 1);
  const after = calculateIlsaDamage({ ...enhanced, attacker }, "ability", 1);
  assert.ok(Math.abs(after.trace.effectiveMultiplier - before.trace.effectiveMultiplier - .2) < 1e-10);
  assert.equal(after.trace.capPercent - before.trace.capPercent, 25);
  assert.deepEqual(calculateIlsaDamage({ ...base, attacker }, "charge", 1).predictions,
    calculateIlsaDamage({ ...enhanced, attacker }, "charge", 1).predictions);
  assert.deepEqual(calculateNormalAttackFromRequest(base).result.bodyDamageDistribution,
    calculateNormalAttackFromRequest(enhanced).result.bodyDamageDistribution);
});
