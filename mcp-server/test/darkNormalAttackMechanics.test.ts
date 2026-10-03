import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { importProtagonistLimitBonuses } from "../src/calculator/protagonistLimitBonusImport.ts";
import { applyNormalAttackHitStages } from "../src/calculator/pursuitDamageCalculator.ts";
import { resolveEffectiveWeaponSkillEffects } from "../src/calculator/weaponEffectResolver.ts";
import { compareRecordedNormalAttacks } from "../src/calculator/recordedNormalAttackComparison.ts";
import { convertDeckResponseToCalculatorDeckConfig } from "../src/calculator/calculatorDeckConfig.ts";
import { calculateNormalAttackPower } from "../src/calculator/normalAttackPowerCalculator.ts";
import { PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES } from "../src/calculator/damageAttenuationCalculator.ts";
import { resolveBattleDamageEffects } from "../src/calculator/battleDamageEffects.ts";
import { calculateNormalAttackDamage } from "../src/calculator/normalAttackDamageCalculator.ts";
import type { CalculatorDeckConfig, DeckWeapon, SummonAuraEffectDefinition } from "../src/calculator/types.ts";

function config(): CalculatorDeckConfig {
  const weapons = [["1040315100",250,1],["1040314300",150,15],["1040314300",150,15],
    ["1040817900",200,1],["1040918100",150,15],["1040918100",150,15],
    ["1040911000",250,25],["1040916700",150,15],["1040916700",150,15],["1040014300",150,15]] as const;
  return { schemaVersion: 1, format: "gbf-helper-calculator-deck", protagonist: {
    jobId: "190501", jobLevel: 50, elementCode: "6", attackOverride: 80_000, hpOverride: 2_000,
    masterBonusDamageCapPercent: 1, nonClassVDamageCapPercent: 3, nonClassVNormalAttackDamagePercent: 3,
    otherLimitBonusLevels: { "36": 3, "39": 3, "118": 3 },
  }, weapons: weapons.map(([weaponId,level,skillLevel],index) => ({slot:index+1,position:index===0?"main":"grid",weaponId,level,skillLevel})),
    summons: [
      {slot:1,position:"main",summonId:"2040448000",uncapLevel:4},
      {slot:2,position:"grid",summonId:"2040315000",uncapLevel:5},
      {slot:3,position:"grid",summonId:"2040327000",uncapLevel:4},
      {slot:4,position:"grid",summonId:"2040450000",uncapLevel:5},
      {slot:1,position:"sub",summonId:"2040441000",uncapLevel:3},
      {slot:2,position:"sub",summonId:"2040418000",uncapLevel:4},
    ], characters: [
      {slot:1,position:"front",characterId:"3040611000",attackOverride:1,hpOverride:1},
      {slot:4,position:"back",characterId:"3040571000",attackOverride:1,hpOverride:1},
    ] };
}
function calculate(deckConfig = config(), modifiers = {}, extra = {}, diagnostics = {}) {
  return calculateNormalAttackFromRequest({schemaVersion:1,deckConfig,
    supportSummon:{summonId:"2040090000"},enemy:{elementCode:"5",defense:10,maxHp:10_000_000},
    modifiers:{damageCapPercent:3,normalAttackDamageCapPercent:5,...modifiers},...extra}, diagnostics).result;
}

test("imports only LB allocations, maps HP II to 103, and refuses malformed allocations", () => {
  const imported = importProtagonistLimitBonuses({user_id:"private",bonus_list:[
    {id:"1",current_level:"3",name:"private"},{id:"103",current_level:2},{id:"35",current_level:1},{id:"118",current_level:3},
  ]});
  assert.equal(imported.attackLimitBonusLevel,3);
  assert.equal(imported.hp2LimitBonusLevel,2);
  assert.deepEqual(imported.otherLimitBonusLevels,{"35":1,"118":3});
  assert.ok(!JSON.stringify(imported).includes("private"));
  assert.throws(()=>importProtagonistLimitBonuses({bonus_list:[{id:1,current_level:3},{id:"1",current_level:0}]}),/Duplicate/);
  assert.throws(()=>importProtagonistLimitBonuses({bonus_list:[{id:1,current_level:4}]}));
  assert.throws(()=>importProtagonistLimitBonuses({bonus_list:[{id:1,current_level:true}]}));
});

test("preserves master bonuses through offline conversion and excludes conditional bonuses for Class V", () => {
  const deckConfig = convertDeckResponseToCalculatorDeckConfig({deck:{npc:{},pc:{
    param:{attribute:6,attack:8000,hp:1000},weapons:{},summons:{},sub_summons:{},
    job:{master:{id:"190501",weapon1:3,weapon2:4},param:{level:50},bonue:{master_bonus:[
      {type:"passive_damage_limit_up_plus",param:1},
      {type:"my_job_class_if:passive_damage_limit_up_plus",param:3},
      {type:"my_job_class_if:final_attack_rise_plus",param:3},
    ]}},
  }}});
  assert.equal(deckConfig.protagonist.masterBonusDamageCapPercent,1);
  assert.equal(calculate(deckConfig).bodyDamageAttenuation.damageCapUpPercent,22); // 8 memorial + 4 master + 10 axe support
  deckConfig.protagonist.jobId="100401";
  assert.equal(calculate(deckConfig).bodyDamageAttenuation.damageCapUpPercent,9);
  assert.equal(calculate(deckConfig).baseDamage.articleTrace?.postCapDamagePercent,0);
  const original=config();
  assert.equal(calculate(original).baseDamage.articleTrace?.postCapDamagePercent,
    calculate(original,{jobNormalAttackDamagePercent:3}).baseDamage.articleTrace?.postCapDamagePercent);
});

test("matches dark frame totals and applies HP/max-HP conditions to summon supplemental damage", () => {
  const result=calculate();
  assert.equal(result.attackPower.totalEffectiveNormalAttackPercent,366.6);
  assert.equal(result.attackPower.totalElementalSummonAuraPercent,220);
  assert.equal(result.bodyDamageAttenuation.damageCapUpPercent,95);
  assert.equal(result.normalAttackSkillFrames.damageCap.rawPercent,30);
  assert.equal(result.normalAttackSkillFrames.damageCap.effectivePercent,20);
  assert.equal(result.normalAttackSkillFrames.defenseIgnore.effectivePercent,15.6);
  assert.equal(result.bodyDamageAttenuation.randomTargetHitCount,2);
  assert.equal(result.bodyDamageAttenuation.supplementalDamagePerHit,300_000);
  assert.equal(calculate(config(),{},{protagonistCurrentHpPercent:79}).summonDamageEffects.supplementalDamage,0);
  assert.equal(calculate(config(),{},{enemy:{elementCode:"5",defense:10,maxHp:10_000}}).summonDamageEffects.supplementalDamage,100);
  const withoutKoku=config();withoutKoku.characters=withoutKoku.characters.filter(c=>c.characterId!=="3040571000");
  assert.equal(calculate(withoutKoku).attackPower.totalElementalSummonAuraPercent,200);
  const lowerUncap=config();lowerUncap.summons.find(s=>s.summonId==="2040450000")!.uncapLevel=4;
  assert.equal(calculate(lowerUncap).attackPower.totalElementalSummonAuraPercent,200);
});

test("does not add normal and magna boosts together to reach the 280% condition", () => {
  const weapon: DeckWeapon={slot:1,position:"main",instanceId:"synthetic",masterId:"synthetic",skills:[
    {sourceKey:"skill1",id:"boosts",name:"闇スキル",effects:[
      {kind:"normal-skill-boost",elementCode:"6",boostGroup:"normal",targetSkillNamePrefixes:["闇"],amountPercent:140},
      {kind:"normal-skill-boost",elementCode:"6",boostGroup:"magna",targetSkillNamePrefixes:["闇"],amountPercent:140},
      {kind:"normal-only-damage-cap-up",elementCode:"6",amountPercent:10,activationCondition:{kind:"skill-boost-range",boostGroup:"any",targetSkillNamePrefixes:["闇"],minimumPercent:280}},
    ]},
  ]};
  assert.ok(!resolveEffectiveWeaponSkillEffects([weapon],[]).effects.some(e=>e.kind==="normal-only-damage-cap-up"));
  weapon.skills[0].effects![0].amountPercent=280;
  assert.ok(resolveEffectiveWeaponSkillEffects([weapon],[]).effects.some(e=>e.kind==="normal-only-damage-cap-up"));
});

test("attenuates before splitting and adds supplemental damage once per Flurry hit", () => {
  const stages={profile:PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES.normalAttack,damageCapUpPercent:0,
    postAttenuationPercent:50,randomTargetHitCount:2,supplementalDamagePerHit:30_000,criticalDamageBonusPercent:0};
  // 500k -> 300k + 100k*0.8 + 100k*0.6 = 440k; split, then 20% pursuit and 50% amplification.
  assert.equal(applyNormalAttackHitStages(500_000,20,stages),96_000);
});

test("Ereshkigal's level-210 cap requires its main-weapon condition", () => {
  const lower=config();lower.weapons[0].level=209;
  assert.equal(calculate(lower).normalAttackSkillFrames.damageCap.rawPercent,10);
  lower.weapons[0].level=210;
  assert.equal(calculate(lower).normalAttackSkillFrames.damageCap.rawPercent,30);
  const weapon: DeckWeapon={slot:1,position:"grid",instanceId:"synthetic",masterId:"synthetic",level:250,skills:[{
    sourceKey:"skill1",id:"main",name:"main",effects:[{kind:"normal-only-damage-dealt-up",amountPercent:30,mainWeaponOnly:true}],
  }]};
  assert.equal(resolveEffectiveWeaponSkillEffects([weapon],[]).effects.length,0);
});

test("destruction pursuit excludes ship, furnace, and elemental attack bonuses while battle level remains explicit", () => {
  const initial=calculate();
  const modified=calculate(config(),{shipAttackPercent:10,furnaceAttackPercent:10,elementAttackPercent:100});
  assert.equal(initial.protagonistNormalAttackSupport.initialMythicalLancerLevel,3);
  assert.equal(initial.destructionPursuitDamage?.baseDamage,modified.destructionPursuitDamage?.baseDamage);
  assert.notEqual(initial.baseDamage.articleTrace?.prePostCapDamage,modified.baseDamage.articleTrace?.prePostCapDamage);
  assert.equal(initial.totalDamageDistribution.componentCount,3);
  assert.equal(calculate(config(),{},{mythicalLancerLevel:5}).protagonistNormalAttackSupport.perpetuityAttackPercent,30);
  assert.throws(()=>calculate(config(),{},{mythicalLancerLevel:6}));
});

test("keeps strongest elemental aura in a shared group and ignores main-only auras on sub stones", () => {
  const aura=(amountPercent:number,activation:"main-only"|"sub-only"):SummonAuraEffectDefinition =>
    ({kind:"elemental-attack-up",elementCode:"6",amountPercent,activation,stackingGroup:"same",description:"synthetic"});
  const result=calculateNormalAttackPower({schemaVersion:1,protagonist:{attack:1,elementCode:"6"},weapons:[],characters:[],summons:[
    {slot:1,position:"main",instanceId:"synthetic",masterId:"a",aura:{name:"test",description:"test",effects:[aura(30,"main-only")],verificationStatus:"下書き",source:"synthetic"}},
    {slot:2,position:"grid",instanceId:"synthetic",masterId:"b",aura:{name:"test",description:"test",effects:[aura(20,"sub-only"),aura(200,"main-only")],verificationStatus:"下書き",source:"synthetic"}},
  ]});
  assert.equal(result.totalElementalSummonAuraPercent,30);
});

test("comparison reports exact candidates and unsupported components without fitting the observation", () => {
  const result=calculate();
  const damage=result.guaranteedCriticalBodyDamageDistribution!.minimumDamage;
  const comparison=compareRecordedNormalAttacks(result,[
    {turn:1,kind:"normal",actorPosition:0,targetSide:"enemy",targetPosition:0,value:damage,concurrentAttackIndex:0,elementCode:"6"},
    {turn:1,kind:"normal",actorPosition:0,targetSide:"enemy",targetPosition:0,value:42,concurrentAttackIndex:2,elementCode:"1"},
  ],"6");
  assert.deepEqual(comparison.observations[0].exactCandidateMultipliers,[0.95]);
  assert.equal(comparison.observations[1].component,"unsupported");
  assert.equal(comparison.observations[1].nearestPredictedDamage,undefined);
});

test("caps ordinary DEF DOWN before adding beyond-cap DOWN and applies weapon defense ignore multiplicatively", () => {
  const result = calculate(config(), {}, { battleEffects: {
    enemyDefenseDownPercent: 70, enemyDefenseDownBeyondCapPercent: 10,
    enemySupplementalDamage: 18_000, supportSkillSupplementalDamage: 30_000,
  } });
  assert.equal(result.baseDamage.defenseIgnore?.defenseAfterDebuffs, 4);
  assert.equal(result.baseDamage.defenseIgnore?.effectiveDefense, 4 * (1 - 0.156));
  // Lancer and Sariel share Support Skill B: 30k remains 30k, plus Cidala's independent 18k.
  assert.equal(result.bodyDamageAttenuation.supplementalDamagePerHit, 318_000);
  assert.equal(resolveBattleDamageEffects({ supportSkillSupplementalDamage: 40_000 }, 30_000).supportSkillSupplementalDamage, 40_000);
  assert.equal(resolveBattleDamageEffects({ supportSkillSupplementalDamage: 30_000 }, 0).supportSkillSupplementalDamage, 30_000);
  assert.throws(() => calculate(config(), {}, { battleEffects: { enemyDefenseDownPercent: 50, enemyDefenseDownBeyondCapPercent: 50 } }), /below 100/);
  assert.throws(() => calculate(config(), {}, { battleEffects: { enemySupplementalDamage: -1 } }));
  assert.throws(() => calculate(config(), {}, { battleEffects: { unknown: 1 } }));
});

test("rounds the amplified split before pursuit scaling only in the explicit Flurry rounding model", () => {
  const stages = { profile: PROVISIONAL_STANDARD_DAMAGE_ATTENUATION_PROFILES.normalAttack, damageCapUpPercent: 0,
    postAttenuationPercent: 50, randomTargetHitCount: 2, supplementalDamagePerHit: 100, criticalDamageBonusPercent: 0 };
  // 101 / 2 * 1.5 = 75.75; ceil to 76, then 20% pursuit and independent flat 100.
  assert.equal(applyNormalAttackHitStages(101, 20, { ...stages, beforePursuitRounding: "ceil" }), 115.2);
  assert.equal(applyNormalAttackHitStages(101, 20, stages), 115.15);
  const result = calculate();
  assert.equal(result.bodyDamageDistribution.nominalPreparation, "ceil");
  assert.equal(result.guaranteedCriticalBodyDamageDistribution?.nominalPreparation, "ceil");
  assert.equal(result.pursuitDamage?.stages?.beforePursuitRounding, "ceil");
  assert.equal(result.destructionPursuitDamage?.stages?.beforePursuitRounding, undefined);
  const ordinary = config(); ordinary.protagonist.jobId = "100401";
  assert.equal(calculate(ordinary).bodyDamageDistribution.nominalPreparation, "none");
});

test("destruction rounding diagnostics preserve the production calculation and report all four draft hypotheses", () => {
  const original = calculate();
  const diagnosed = calculate(config(), {}, {}, { compareDestructionPursuitRounding: true });
  const { destructionPursuitRoundingCandidates: candidates, ...rest } = diagnosed;
  assert.deepEqual(rest, original);
  assert.equal(original.destructionPursuitRoundingCandidates, undefined);
  assert.deepEqual(candidates!.map(candidate => candidate.model), ["legacy-pre-random-ceil", "parent-ceil",
    "normal-skill-ceil-and-parent-ceil", "ex-skill-ceil-and-parent-ceil"]);
  assert.ok(candidates!.every(candidate => candidate.verificationStatus === "下書き"));
  assert.deepEqual(candidates![0].pursuitDamage, original.destructionPursuitDamage);
  assert.ok(candidates!.slice(1).every(candidate => candidate.pursuitDamage.damageDistribution.nominalPreparation === "none"
    && candidate.pursuitDamage.stages?.beforePursuitRounding === "ceil"));
  assert.throws(() => calculate(config(), {}, { compareDestructionPursuitRounding: true }), /Unrecognized/);
});

test("diagnostic tables distinguish different upstream rounding positions without using observed damage", () => {
  const low = config(); low.protagonist.attackOverride = 101;
  const diagnosed = calculate(low, {}, { enemy: { elementCode: "5", defense: 1 } }, { compareDestructionPursuitRounding: true });
  const packets = [{ turn: 5, kind: "normal" as const, actorPosition: 0, targetSide: "enemy" as const,
    targetPosition: 0, value: 1, concurrentAttackIndex: 2, elementCode: "98" }];
  const first = compareRecordedNormalAttacks(diagnosed, packets, "6").destructionRoundingComparison!;
  const pair = first.pairwise.find(pair => pair.left === "normal-skill-ceil-and-parent-ceil" && pair.right === "ex-skill-ceil-and-parent-ceil")!;
  assert.equal(pair.comparedMultiplierCount, 101);
  assert.ok(pair.differingMultiplierCount > 0);
  const predicted = first.candidates[2].patterns[0].damage;
  const second = compareRecordedNormalAttacks(diagnosed, [{ ...packets[0], value: predicted }], "6").destructionRoundingComparison!;
  assert.deepEqual(first.pairwise, second.pairwise);
  assert.deepEqual(first.candidates.map(c => c.patterns), second.candidates.map(c => c.patterns));
  assert.deepEqual(second.candidates[2].observations[0].exactCandidateMultipliers,
    second.candidates[2].patterns.filter(p => p.damage === predicted).map(p => p.multiplier));
  assert.equal(second.candidates[2].components[0].exactMatchCount, 1);
  assert.equal(first.candidates[2].components[0].exactMatchCount, 0);
});

test("rounding diagnostics identify equivalent hypotheses and omit diagnostics for decks without destruction pursuit", () => {
  // A synthetic resolved destruction effect with no attack-skill multipliers makes both upstream ceilings identical.
  const result = calculateNormalAttackDamage({ schemaVersion: 1, targetEnemySlot: 1,
    deck: { schemaVersion: 1, protagonist: { attack: 101, elementCode: "6" }, weapons: [], summons: [], characters: [],
      effectiveWeaponSkillEffects: [{ sourceWeaponSlot: 1, sourceWeaponId: "synthetic", sourceSkillId: "synthetic",
        sourceSkillName: "synthetic", kind: "destruction-pursuit", baseAmountPercent: 20, effectiveAmountPercent: 20,
        verificationStatus: "下書き", appliedModifiers: [] }] },
    battle: { schemaVersion: 1, enemies: [{ slot: 1, enemyId: "synthetic", elementCode: "5", defense: 10 }],
      enemyPassiveEffectCount: 0, fieldEffectCount: 0 } }, { compareDestructionPursuitRounding: true });
  const comparison = compareRecordedNormalAttacks(result, [], "6").destructionRoundingComparison!;
  const pair = comparison.pairwise.find(pair => pair.left === "normal-skill-ceil-and-parent-ceil" && pair.right === "ex-skill-ceil-and-parent-ceil")!;
  assert.equal(pair.differingMultiplierCount, 0);
  assert.equal(pair.leftOnlyDamageCount, 0);
  assert.equal(pair.rightOnlyDamageCount, 0);
  assert.ok(comparison.candidates.every(c => c.components.length === 0));
  const low = config(); low.weapons = [];
  assert.equal(calculate(low, {}, {}, { compareDestructionPursuitRounding: true }).destructionPursuitRoundingCandidates, undefined);
});
