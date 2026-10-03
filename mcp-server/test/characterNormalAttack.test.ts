import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { importCharacterLimitBonuses } from "../src/calculator/characterNormalAttack.ts";

function request(characterId = "3040611000") {
  return { schemaVersion: 1, deckConfig: {
    schemaVersion: 1, format: "gbf-helper-calculator-deck", protagonist: {
      attackOverride: 10_000, hpOverride: 2_000, elementCode: "6", jobId: "190501", jobLevel: 50,
      darkAttackLimitBonusLevel: 3, masterBonusDamageCapPercent: 10,
    }, weapons: [], summons: [], characters: [{ slot: 1, position: "front", characterId,
      elementCode: "6", attackOverride: 1_000, hpOverride: 1_000 }],
  }, attacker: { characterSlot: 1 }, enemy: { elementCode: "5", defense: 10, attack: 1_000 },
    random: { minimum: 1, maximum: 1, step: 1 } };
}

test("character uses its displayed ATK without inheriting MC job attack, critical, cap, HP or abilities", () => {
  const input = request();
  const before = structuredClone(input);
  const result = calculateNormalAttackFromRequest(input).result;
  assert.equal(result.attackPower.baseAttack, 1_000);
  assert.equal(result.bodyDamageDistribution.minimumDamage, 150);
  assert.equal(result.bodyDamageAttenuation.damageCapUpPercent, 0);
  assert.equal(result.normalAttackSupport.randomTargetHitCount, 1);
  assert.equal(result.guaranteedCriticalBodyDamageDistribution, undefined);
  assert.equal(result.protagonistHp, undefined);
  assert.equal(result.multiattackRates, undefined);
  assert.equal(result.abilityDamage, undefined);
  assert.equal(result.incomingDamage, undefined);
  assert.equal(result.attacker?.characterId, "3040611000");
  assert.ok(result.attacker?.unresolvedInputs.includes("awakeningForm"));
  assert.ok(result.attacker?.unresolvedInputs.includes("awakeningLevel"));
  assert.deepEqual(input, before);
});

test("selected character elemental LB is additive, and flat ATK/HP LB is not added twice", () => {
  const input = request("3040456000");
  Object.assign(input.deckConfig.characters[0], { limitBonuses: importCharacterLimitBonuses({ bonus_list: [
    { name: "攻撃力", current_level: 3 }, { name: "HP", current_level: 3 },
    { name: "闇属性攻撃力", current_level: 3 }, { name: "闇属性攻撃力", current_level: 2 },
    { name: "クリティカル確率", current_level: 0 },
  ] }) });
  const result = calculateNormalAttackFromRequest(input).result;
  assert.equal(result.attackPower.baseAttack, 1_000);
  assert.ok(Math.abs(result.baseDamage.articleTrace!.prePostCapDamage - 168) < 1e-10);
  assert.equal(result.normalAttackSupport.randomTargetHitCount, 3);
});

test("Cidala requires an explicit buff state and switches splitting and support when it expires", () => {
  const input = request("3040512000");
  assert.throws(() => calculateNormalAttackFromRequest(input), /coupledConfectionActive/);
  const active = calculateNormalAttackFromRequest({ ...input, attacker: { characterSlot: 1, coupledConfectionActive: true },
    battleEffects: { supportSkillSupplementalDamage: 30_000 } }).result;
  const inactive = calculateNormalAttackFromRequest({ ...input, attacker: { characterSlot: 1, coupledConfectionActive: false },
    battleEffects: { supportSkillSupplementalDamage: 30_000 } }).result;
  assert.equal(active.normalAttackSupport.randomTargetHitCount, 2);
  assert.equal(active.bodyDamageDistribution.minimumDamage, 50_075);
  assert.equal(inactive.normalAttackSupport.randomTargetHitCount, 1);
  assert.equal(inactive.bodyDamageDistribution.minimumDamage, 30_150);
});

test("character stamina LB remains separate from weapon stamina and follows the source HP curve", () => {
  const input = request();
  Object.assign(input.deckConfig.characters[0], { limitBonuses: { staminaLevel: 3 } });
  const full = calculateNormalAttackFromRequest(input).result;
  const half = calculateNormalAttackFromRequest({ ...input, attacker: { characterSlot: 1, currentHpPercent: 50 } }).result;
  assert.equal(full.baseDamage.articleTrace?.prePostCapDamage, 159);
  assert.equal(half.baseDamage.articleTrace?.prePostCapDamage, 156);
  assert.equal(full.baseDamage.stages.find(stage => stage.stage === "character-stamina")?.totalPercent, 6);
  assert.equal(half.hpDependentAttack.totalEffectiveNormalStaminaPercent, 0);
});

test("awakening type without a level never assumes max level; Lv9 amplification and Lv10 cap are distinct", () => {
  const input = request();
  Object.assign(input.deckConfig.characters[0], { awakening: { formCode: "4" } });
  const unknown = calculateNormalAttackFromRequest(input).result;
  Object.assign(input.deckConfig.characters[0], { awakening: { formCode: "4", level: 9 } });
  const nine = calculateNormalAttackFromRequest(input).result;
  Object.assign(input.deckConfig.characters[0], { awakening: { formCode: "4", level: 10 } });
  const ten = calculateNormalAttackFromRequest(input).result;
  assert.equal(unknown.bodyDamageAttenuation.postAttenuationPercent, 0);
  assert.equal(nine.bodyDamageAttenuation.postAttenuationPercent, 5);
  assert.equal(nine.bodyDamageAttenuation.damageCapUpPercent, 0);
  assert.equal(ten.bodyDamageAttenuation.damageCapUpPercent, 5);
});

test("unsupported character or active random critical LB is rejected rather than silently ignored", () => {
  assert.throws(() => calculateNormalAttackFromRequest(request("unknown")), /no supported/);
  const input = request();
  Object.assign(input.deckConfig.characters[0], { limitBonuses: { criticalLevels: [3] } });
  assert.throws(() => calculateNormalAttackFromRequest(input), /critical LB/);
  assert.throws(() => calculateNormalAttackFromRequest({ ...request(), attacker: { characterSlot: 4 } }));
  assert.throws(() => importCharacterLimitBonuses({ bonus_list: [{ name: "クリティカル確率", current_level: 4 }] }));
});

test("artifact conditional amplification uses the character's current HP; flat displayed stats are not added twice", () => {
  const input = request();
  Object.assign(input.deckConfig.characters[0], { artifact: { skills: [
    { skillId: "30001", name: "攻撃力", effectValue: "+1320" },
    { skillId: "30231", name: "HPが100%の時、与ダメージUP", effectValue: "+2.2%" },
  ] } });
  const full = calculateNormalAttackFromRequest(input).result;
  const half = calculateNormalAttackFromRequest({ ...input, attacker: { characterSlot: 1, currentHpPercent: 50 } }).result;
  assert.equal(full.attackPower.baseAttack, 1000);
  assert.equal(full.bodyDamageAttenuation.postAttenuationPercent, 2.2);
  assert.equal(half.bodyDamageAttenuation.postAttenuationPercent, 0);
});

test("artifact random outcomes must be supplied and affect normal ATK and cap only while active", () => {
  const input = request();
  Object.assign(input.deckConfig.characters[0], { artifact: { skills: [
    { skillId: "50211", name: "バトル開始時に自分に一定個数ランダムな強化効果", effectValue: "4個" },
  ] } });
  assert.throws(() => calculateNormalAttackFromRequest(input), /observed outcomes/);
  const active = calculateNormalAttackFromRequest({ ...input, attacker: { characterSlot: 1, artifactStartBuffs: { attackUp: true, damageCapUp: true } } }).result;
  const expired = calculateNormalAttackFromRequest({ ...input, attacker: { characterSlot: 1, artifactStartBuffs: { attackUp: false, damageCapUp: false } } }).result;
  assert.equal(active.baseDamage.articleTrace?.prePostCapDamage, 225);
  assert.equal(active.baseDamage.stages.find(s => s.stage === "normal-weapon-skill")?.totalPercent, 50);
  assert.equal(active.bodyDamageAttenuation.damageCapUpPercent, 10);
  assert.equal(expired.baseDamage.articleTrace?.prePostCapDamage, 150);
  assert.equal(expired.bodyDamageAttenuation.damageCapUpPercent, 0);
});

test("normal artifact supplemental damage stacks per split hit; unknown skills stay unresolved", () => {
  const input = request("3040456000");
  Object.assign(input.deckConfig.characters[0], { artifact: { skills: [
    { skillId: "30161", name: "通常攻撃の与ダメージ上昇", effectValue: "+8800" },
    { skillId: "99999", name: "未対応効果", effectValue: "+10%" },
  ] } });
  const result = calculateNormalAttackFromRequest({ ...input, battleEffects: { normalAttackSupplementalDamage: 5000 } }).result;
  assert.equal(result.bodyDamageAttenuation.supplementalDamagePerHit, 13_800);
  assert.equal(result.bodyDamageDistribution.minimumDamage, 13_850);
  assert.ok(result.attacker?.unresolvedInputs.includes("artifact-skill-99999"));
});

test("Divine Stamp Book is an explicit Perpetuity-frame input for Cidala and does not change others", () => {
  const input = { ...request("3040512000"), attacker: { characterSlot: 1, coupledConfectionActive: false } };
  const withStamp = calculateNormalAttackFromRequest({ ...input, modifiers: { divineStampBookEnabled: true } }).result;
  const without = calculateNormalAttackFromRequest({ ...input, modifiers: { divineStampBookEnabled: false } }).result;
  assert.equal(withStamp.normalAttackSupport.perpetuityAttackPercent, 10);
  assert.equal(without.normalAttackSupport.perpetuityAttackPercent, 0);
  assert.equal(calculateNormalAttackFromRequest({ ...request(), modifiers: { divineStampBookEnabled: true } }).result.normalAttackSupport.perpetuityAttackPercent, 0);
});
