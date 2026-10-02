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
function calculate(deckConfig = config(), modifiers = {}, extra = {}) {
  return calculateNormalAttackFromRequest({schemaVersion:1,deckConfig,
    supportSummon:{summonId:"2040090000"},enemy:{elementCode:"5",defense:10,maxHp:10_000_000},
    modifiers:{damageCapPercent:3,normalAttackDamageCapPercent:5,...modifiers},...extra}).result;
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
