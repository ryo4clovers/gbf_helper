import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateBattleActions, type BattleActionState } from "../src/calculator/battleActionGenerator.ts";
import { calculateBattleTurn } from "../src/calculator/battleTurn.ts";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { consumeFighterOriginGauge } from "../src/calculator/fighterOriginState.ts";
import { createInitialBattleState, applyGeneratedTurn } from "../web/battle-state.js";
import { buildBattleTurnRequest } from "../web/battle-turn-client.js";
import { resolveFighterOriginIncoming } from "../web/fighter-origin-reactions.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/fighter-origin-observations.json", import.meta.url), "utf8"));
function deck(): any {
  return {schemaVersion:1, format:"gbf-helper-calculator-deck",
    protagonist:{elementCode:"6",jobId:"100501",jobLevel:50,attackOverride:50000,hpOverride:10000,completedJobIds:["250201"]},
    weapons:[{slot:1,position:"main",weaponId:"1040014300",level:150,uncapLevel:4,skillLevel:15}],
    characters:[{slot:1,position:"front",characterId:"3040456000",level:80,attackOverride:40000,hpOverride:10000}],summons:[]};
}
function planRequest(deckConfig = deck()) {
  return {schemaVersion:1,deckConfig,turns:1,secondsPerTurn:15,chargeAttack:false,manualAbilities:false,multiattack:{mode:"minimum",seed:1}};
}

test("all 41 observed turns reproduce action shape, Spirit transitions and gauge with controlled swings/ally CA readiness", () => {
  let state: BattleActionState | undefined;
  let gauge = fixture.noAbilities.initialGauge;
  const config = deck(), original = structuredClone(config);
  for (const observed of fixture.noAbilities.turns) {
    assert.equal(gauge, observed.gaugeBefore);
    const result = generateBattleActions({...planRequest(config),turns:observed.turn}, {
      state, protagonistCharge:{enabled:true,gauge},
      ilsaCharge:{enabled:true,gauge:observed.allyCharge?100:0},
      resolveAttackCount:position=>position===0?observed.attackCount:3,
    }).turns[0];
    const own = result.events.find(e=>e.actorPosition===0 && (e.kind==="normal" || e.kind==="charge-attack"))!;
    assert.equal(own.calculationPatch.fighterSpiritLevel, observed.levelBefore);
    assert.equal(own.kind, observed.kind==="charge"?"charge-attack":"normal");
    if (own.kind==="normal") {
      assert.equal(own.attackCount, observed.attackCount);
      assert.deepEqual(Array(own.attackCount).fill(own.splitCount),observed.swingHitCounts);
      assert.equal(own.bodyHitCount,observed.swingHitCounts.reduce((a:number,b:number)=>a+b,0));
    }
    const updates=result.events.filter(e=>e.kind==="effect" && e.effect==="charge-ready" && e.actorPosition===0).map(e=>e.kind==="effect"?e.value:NaN);
    assert.deepEqual(updates,observed.gaugeUpdates,`turn ${observed.turn}`);
    assert.equal(result.endState.fighterOrigin!.level,observed.levelAfter);
    assert.equal(result.endState.fighterOrigin!.consumedGaugeRemainder,0);
    const messageIndex=result.events.findIndex(e=>e.kind==="effect" && e.effect==="fighter-spirit-level");
    if(observed.levelUpdateAfterParty) {
      const lastAction=Math.max(...result.events.map((e,i)=>e.kind==="normal"||e.kind==="charge-attack"?i:-1));
      assert.ok(messageIndex>lastAction);
    } else assert.equal(messageIndex,-1);
    state=result.endState; gauge=updates.at(-1)!;
  }
  assert.deepEqual(config,original);
});

test("minimum/sample guarantee DA, retaining TA rolls; Spirit split reaches the common single-hit calculation", () => {
  const config=deck();config.characters=[];
  for(const mode of ["minimum","sample"]){
    const multiattack=mode==="sample"?{mode,seed:1,rates:{protagonist:{doubleAttackRatePercent:0,tripleAttackRatePercent:0},cidala:{doubleAttackRatePercent:0,tripleAttackRatePercent:0},sariel:{doubleAttackRatePercent:0,tripleAttackRatePercent:0}}}:{mode,seed:1};
    const own=generateBattleActions({...planRequest(config),multiattack}).turns[0].events[0];
    assert.ok(own.kind==="normal");assert.equal(own.attackCount,2);
  }
  const calculation:any={schemaVersion:1,deckConfig:config,enemy:{elementCode:"5",defense:10},fighterSpiritLevel:4};
  const result=calculateNormalAttackFromRequest(calculation);
  assert.equal(result.result.bodyDamageAttenuation.randomTargetHitCount,2);
  assert.equal(result.result.multiattackRates!.doubleAttackRatePercent,100);
  assert.ok(result.warnings?.some(w=>w.includes("未対応")));
  calculation.fighterSpiritLevel=3;
  assert.equal(calculateNormalAttackFromRequest(calculation).result.bodyDamageAttenuation.randomTargetHitCount,1);
  calculation.deckConfig.protagonist.jobId="110001";calculation.deckConfig.protagonist.jobLevel=20;
  calculation.fighterSpiritLevel=5;
  const other=calculateNormalAttackFromRequest(calculation);
  assert.equal(other.result.bodyDamageAttenuation.randomTargetHitCount,1);
  assert.equal(other.result.multiattackRates!.guaranteedMinimumAttackCount,1);
});

test("effect-text boundaries keep residual consumption and lower-level cap; observations do not validate fractional spends", () => {
  assert.deepEqual(consumeFighterOriginGauge({level:0,consumedGaugeRemainder:60},40,50),{level:1,consumedGaugeRemainder:0});
  assert.deepEqual(consumeFighterOriginGauge({level:2,consumedGaugeRemainder:0},250,39),{level:3,consumedGaugeRemainder:50});
  assert.deepEqual(consumeFighterOriginGauge({level:5,consumedGaugeRemainder:0},100,50),{level:5,consumedGaugeRemainder:0});
  assert.throws(()=>consumeFighterOriginGauge({level:0,consumedGaugeRemainder:0},-1,50));
  const config=deck();config.protagonist.jobLevel=39;
  assert.throws(()=>calculateNormalAttackFromRequest({schemaVersion:1,deckConfig:config,enemy:{elementCode:"5",defense:10},fighterSpiritLevel:4}),/上限は3/);
});

test("API and Web retain the post-CA Spirit state and clear stale single-hit level selection", () => {
  const config=deck();config.characters=[];
  const setup:any={enemyMaxHp:1e9,request:{schemaVersion:1,deckConfig:config,enemy:{elementCode:"5",defense:10},fighterSpiritLevel:5}};
  let web=createInitialBattleState(setup);web.party[0].charge=100;
  const before=structuredClone(web);
  const request=buildBattleTurnRequest(setup,web,"downside",{secondsPerTurn:15,characters:{}},undefined,true);
  assert.equal(request.calculation.fighterSpiritLevel,undefined);
  const response=calculateBattleTurn(request);
  assert.equal(response.endState.fighterOrigin!.level,1);
  const ca=response.events.find(e=>e.kind==="charge-attack")!;
  assert.ok(ca.kind==="charge-attack");assert.equal(ca.calculationPatch.fighterSpiritLevel,0);
  const effects=response.events.filter(e=>e.kind==="effect");
  web=applyGeneratedTurn(web,response,effects);
  assert.deepEqual(before.party[0].charge,100);assert.equal(web.party[0].charge,0);
  assert.equal(web.actionState.fighterOrigin.level,1);
  const next=calculateBattleTurn(buildBattleTurnRequest(setup,web,"downside",{secondsPerTurn:15,characters:{}},undefined,true));
  const normal=next.events.find(e=>e.kind==="normal")!;
  assert.ok(normal.kind==="normal");assert.equal(normal.attackCount,2);
  assert.equal(normal.calculationPatch.fighterSpiritLevel,1);
  assert.equal(normal.calculation.bodyDamageAttenuation.randomTargetHitCount,1);
  assert.ok(next.warnings.some(w=>w.includes("オリファイ")));
});

test("normal gauge completion is explicit, additive per swing and independent of split hits", () => {
  const config=deck();config.characters=[];
  const calculate=(completed:string[]|undefined,level:number)=>{
    config.protagonist.completedJobIds=completed;
    return calculateBattleTurn({calculation:{schemaVersion:1,deckConfig:config,enemy:{elementCode:"5",defense:10}},
      state:{turn:2,protagonistHitCount:0,mythicalLancerLevel:0,otherSelfReady:false,chocolateStacks:0,chocolateExpiresAt:0,deathSentenceExpiresOnTurn:0,fighterOrigin:{level,consumedGaugeRemainder:0}},
      protagonistCharge:{enabled:false,gauge:0},mode:"downside",secondsPerTurn:15,characters:[]});
  };
  const gauge=(r:ReturnType<typeof calculate>)=>r.events.find(e=>e.kind==="effect"&&e.effect==="charge-ready");
  assert.equal((gauge(calculate(["250201"],4)) as any).value,24);
  assert.equal((gauge(calculate([],4)) as any).value,22);
  const unknown=calculate(undefined,0);
  assert.equal((gauge(unknown) as any).value,22);
  assert.ok(unknown.warnings.some(w=>w.includes("未指定")));
});

test("39 incoming turns reproduce HP gating and 13 counter actions/+5; observed incoming gauge deltas are explicit inputs", () => {
  assert.equal(fixture.incomingNoAbilities.turns.length,39);
  let count=0;
  for(const row of fixture.incomingNoAbilities.turns){
    const r=resolveFighterOriginIncoming({level:row.levelAfterParty,hpBefore:row.hpBefore,hpAfter:row.hpAfter,
      maxHp:row.maxHp,chargeBefore:row.gaugeAfterParty,incomingChargeGain:row.observedIncomingGaugeDelta});
    assert.equal(r.counterActions,row.counterActions,`turn ${row.turn}`);
    assert.equal(r.chargeAfterCounter,row.incomingGaugeUpdates.at(-1)??row.gaugeAfterParty);
    assert.equal(r.turnEndThresholdReached,false);
    if(row.counterActions){assert.equal(row.counterAfterIncoming,true);assert.deepEqual(row.counterComponentCounts,[2]);}
    count+=r.counterActions;
  }
  assert.equal(count,13);
  const unknown=resolveFighterOriginIncoming({level:5,hpBefore:10000,hpAfter:9400,maxHp:10000,chargeBefore:24});
  assert.equal(unknown.chargeAfterIncoming,24);assert.equal(unknown.chargeAfterCounter,29);
  assert.ok(unknown.warnings.some(w=>w.includes("被弾ゲージ")));
  const shield=resolveFighterOriginIncoming({level:5,hpBefore:10000,hpAfter:10000,maxHp:10000,chargeBefore:24,incomingChargeGain:4});
  assert.equal(shield.counterActions,0);assert.equal(shield.chargeAfterCounter,24);
  const threshold=resolveFighterOriginIncoming({level:5,hpBefore:10000,hpAfter:9000,maxHp:10000,chargeBefore:0});
  assert.equal(threshold.turnEndThresholdReached,true);assert.ok(threshold.warnings.some(w=>w.includes("未適用")));
});

test("API and Web share partial barrier-aware incoming reactions and never manufacture counter damage", () => {
  const config=deck();config.characters=[];
  const actionState={turn:24,protagonistHitCount:0,mythicalLancerLevel:0,otherSelfReady:false,chocolateStacks:0,chocolateExpiresAt:0,deathSentenceExpiresOnTurn:0,
    fighterOrigin:{level:5,consumedGaugeRemainder:0}};
  const base:any={calculation:{schemaVersion:1,deckConfig:config,enemy:{elementCode:"5",defense:10}},state:actionState,
    protagonistCharge:{enabled:false,gauge:0},mode:"downside",secondsPerTurn:15,characters:[]};
  const api=calculateBattleTurn({...base,protagonistIncoming:{hpBefore:9952,hpAfter:9297,maxHp:19472,incomingChargeGain:4}});
  assert.equal(api.incomingReaction!.chargeAfterCounter,33);
  assert.equal(api.incomingReaction!.counterActions,1);
  assert.equal(api.incomingReaction!.counterDamageSupported,false);
  const generated=calculateBattleTurn(base);
  const setup:any={enemyMaxHp:1e9,protagonistMaxHp:19472,request:base.calculation};
  const web=createInitialBattleState(setup);web.actionState=actionState;web.party[0].hp=9952;
  web.party[0].shield={amount:105,expiresOnTurn:30};web.enemy.attacks=true;web.turn=24;
  const after=applyGeneratedTurn(web,generated,generated.events.filter(e=>e.kind==="effect"),{enemyAttack:{damage:760,incomingChargeGain:4}});
  assert.equal(after.party[0].hp,9297);assert.equal(after.party[0].charge,33);
  assert.equal(after.enemy.hp,web.enemy.hp);
  assert.equal(after.events.filter(e=>e.note?.includes("カウンター1行動")).length,1);
  assert.ok(after.warnings.some(w=>w.includes("カウンターダメージ")));
  assert.equal(web.party[0].hp,9952);
  assert.throws(()=>calculateBattleTurn({...base,protagonistIncoming:{hpBefore:1,hpAfter:2,maxHp:1}}),/Invalid/);
});
