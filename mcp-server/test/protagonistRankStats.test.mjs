import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateProtagonistRankBaseStats,
  rebaseProtagonistForRankChange,
} from "../web/summon-stat-contribution.js";

test("returns the provisional Rank base-stat breakpoints", () => {
  assert.deepEqual(calculateProtagonistRankBaseStats(1), {
    rank: 1, attack: 1_000, hp: 600, verificationStatus: "下書き",
  });
  assert.equal(calculateProtagonistRankBaseStats(100).attack, 5_000);
  assert.equal(calculateProtagonistRankBaseStats(100).hp, 1_400);
  assert.equal(calculateProtagonistRankBaseStats(175).attack, 6_500);
  assert.equal(calculateProtagonistRankBaseStats(190).hp, 1_730);
  assert.equal(calculateProtagonistRankBaseStats(425).attack, 7_825);
  assert.equal(calculateProtagonistRankBaseStats(425).hp, 1_964);
});

test("rebases observed protagonist stats by the scaled Rank delta", () => {
  const config = {
    protagonist: {
      rank: 376,
      attackOverride: 22_801,
      hpOverride: 4_877,
      masterBonusAttackPercent: 24,
      masterBonusHpPercent: 20,
    },
  };
  rebaseProtagonistForRankChange(config, 375);
  assert.equal(config.protagonist.attackOverride, 22_807);
  assert.equal(config.protagonist.hpOverride, 4_878);

  config.protagonist.rank = 375;
  rebaseProtagonistForRankChange(config, 376);
  assert.equal(config.protagonist.attackOverride, 22_801);
  assert.equal(config.protagonist.hpOverride, 4_877);
});

test("rejects unsupported Rank values and leaves an unanchored snapshot unchanged", () => {
  assert.throws(() => calculateProtagonistRankBaseStats(0), /1〜425/);
  assert.throws(() => calculateProtagonistRankBaseStats(426), /1〜425/);
  const config = { protagonist: { rank: 100, attackOverride: 10_000, hpOverride: 2_000 } };
  rebaseProtagonistForRankChange(config, undefined);
  assert.equal(config.protagonist.attackOverride, 10_000);
  assert.equal(config.protagonist.hpOverride, 2_000);
});
