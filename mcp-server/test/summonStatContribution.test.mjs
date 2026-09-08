import { test } from "node:test";
import assert from "node:assert/strict";
import { rebaseProtagonistForSummonChange } from "../web/summon-stat-contribution.js";

function makeConfig(summons) {
  return {
    protagonist: {
      attackOverride: 22_801,
      hpOverride: 4_877,
      masterBonusAttackPercent: 24,
      masterBonusHpPercent: 20,
    },
    summons,
  };
}

const agni = { position: "main", attackOverride: 4_157, hpOverride: 1_414 };
const wilnas = { position: "grid", attackOverride: 3_324, hpOverride: 1_093 };

test("normal sub summon stats rebase the imported protagonist display values", () => {
  const config = makeConfig([agni, wilnas]);
  rebaseProtagonistForSummonChange(config, [agni]);

  assert.equal(config.protagonist.attackOverride, 26_923);
  assert.equal(config.protagonist.hpOverride, 6_188);
});

test("zero-star Wilnas uses the separately observed attack and HP rounding", () => {
  const zeroStarWilnas = { position: "grid", attackOverride: 399, hpOverride: 127 };
  const config = makeConfig([agni, zeroStarWilnas]);
  rebaseProtagonistForSummonChange(config, [agni]);

  assert.equal(config.protagonist.attackOverride, 23_296);
  assert.equal(config.protagonist.hpOverride, 5_029);
});

test("sub-aura summons do not change protagonist display stats", () => {
  const subAuraWilnas = { ...wilnas, position: "sub" };
  const config = makeConfig([agni, subAuraWilnas]);
  rebaseProtagonistForSummonChange(config, [agni]);

  assert.equal(config.protagonist.attackOverride, 22_801);
  assert.equal(config.protagonist.hpOverride, 4_877);
});

test("removing a normal sub summon reverses the previous adjustment", () => {
  const config = makeConfig([agni, wilnas]);
  rebaseProtagonistForSummonChange(config, [agni]);
  const previousSummons = [...config.summons];
  config.summons = [agni];
  rebaseProtagonistForSummonChange(config, previousSummons);

  assert.equal(config.protagonist.attackOverride, 22_801);
  assert.equal(config.protagonist.hpOverride, 4_877);
});

test("missing account bonuses leave imported display stats unchanged", () => {
  const config = makeConfig([agni, wilnas]);
  delete config.protagonist.masterBonusAttackPercent;
  delete config.protagonist.masterBonusHpPercent;
  rebaseProtagonistForSummonChange(config, [agni]);

  assert.equal(config.protagonist.attackOverride, 22_801);
  assert.equal(config.protagonist.hpOverride, 4_877);
});
