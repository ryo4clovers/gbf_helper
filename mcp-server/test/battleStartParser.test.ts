import { test } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { parseBattleStartResponse } from "../src/calculator/battleStartParser.ts";

function makeBattleStartResponse() {
  return {
    user_id: "discard-this-account-identifier",
    raid_id: 999999,
    quest_id: "30001",
    turn: 1,
    multi: 0,
    is_trialbattle: true,
    battle: { total: "1", count: 1 },
    boss: {
      param: [
        {
          number: "1",
          enemy_id: "9900001",
          name: { ja: "テスト敵", en: "Test Enemy" },
          Lv: "100",
          attr: "2",
          attribute: "水",
          hp: "5000000",
          hpmax: 5000000,
          alive: 1,
          recast: "2",
          recastmax: 3,
          modeflag: "1",
          modegauge: 25,
        },
      ],
    },
    enemy_passive_effect: [],
    field_effect: [{ id: "test" }],
    supporter: {
      id: "discard-this-support-instance-id",
      image_id: "2040090000_04",
      name: "ハデス",
      attribute: "6",
      protection_name: "ハデスの加護",
      protection: "闇属性用加護<br>追加説明",
      friend: true,
    },
    ignored_future_field: true,
  };
}

test("parseBattleStartResponse extracts enemy state and normalizes numeric strings", () => {
  const result = parseBattleStartResponse(makeBattleStartResponse());

  assert.equal(result.questId, "30001");
  assert.equal(result.isMultiBattle, false);
  assert.equal(result.isTrialBattle, true);
  assert.equal(result.enemies.length, 1);
  assert.equal(result.enemies[0].enemyId, "9900001");
  assert.equal(result.enemies[0].nameJp, "テスト敵");
  assert.equal(result.enemies[0].maxHp, 5000000);
  assert.equal(result.enemies[0].hasModeGauge, true);
  assert.equal(result.enemies[0].defense, undefined);
  assert.equal(result.fieldEffectCount, 1);
  assert.deepEqual(result.supportSummon, {
    masterId: "2040090000",
    name: "ハデス",
    elementCode: "6",
    auraName: "ハデスの加護",
    auraDescription: "闇属性用加護 追加説明",
    isFriend: true,
  });
});

test("parseBattleStartResponse does not retain account or raid-instance identifiers", () => {
  const result = parseBattleStartResponse(makeBattleStartResponse());
  assert.equal("userId" in result, false);
  assert.equal("raidId" in result, false);
  assert.equal("id" in (result.supportSummon ?? {}), false);
});

test("parseBattleStartResponse rejects a response without boss parameters", () => {
  assert.throws(() => parseBattleStartResponse({ boss: {} }), ZodError);
});

test("parseBattleStartResponse rejects an enemy without a definition ID", () => {
  const input = makeBattleStartResponse();
  delete (input.boss.param[0] as { enemy_id?: string }).enemy_id;
  assert.throws(() => parseBattleStartResponse(input), /enemy_id is required/);
});
