import { test } from "node:test";
import assert from "node:assert/strict";
import { parseActionResultResponse } from "../src/calculator/actionResultParser.ts";

const baseStatus = { turn: "1", enemy_passive_effect: [] };

test("parses an ability damage event without treating split as hit damage", () => {
  const result = parseActionResultResponse({
    scenario: [
      { cmd: "ability", name: "テストアビリティ" },
      {
        cmd: "damage",
        list: [{ pos: 0, value: "1234", hp: 8766, split: ["1", "2", "3", "4"], critical: 0 }],
      },
      { cmd: "boss_gauge", pos: 0, hp: "8766", attr: 2 },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "ability");
  assert.equal(result.actionName, "テストアビリティ");
  assert.equal(result.damage.length, 1);
  assert.equal(result.damage[0].value, 1234);
  assert.equal(result.totalDamage, 1234);
  assert.equal("split" in result.damage[0], false);
  assert.equal(result.enemyGaugeEvents[0].hp, 8766);
});

test("flattens the nested normal attack damage arrays", () => {
  const result = parseActionResultResponse({
    scenario: [
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 1,
        damage: [
          [
            {
              pos: 0,
              value: 500,
              hp: 9500,
              color: "1",
              attack_count: 0,
              concurrent_attack_count: 0,
              miss: false,
              guard: "0",
            },
          ],
        ],
      },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "normal-attack");
  assert.equal(result.damage[0].sourceCommand, "attack");
  assert.equal(result.damage[0].guarded, false);
  assert.equal(result.damage[0].normalAttackCount, 1);
  assert.equal(result.damage[0].hitIndex, 0);
  assert.equal(result.damage[0].concurrentIndex, 0);
  assert.equal(result.damage[0].elementCode, "1");
  assert.equal(result.damage[0].randomAttack, undefined);
});

test("parses numbered later-swing objects and normal-attack packet metadata", () => {
  const result = parseActionResultResponse({
    scenario: [
      {
        cmd: "attack",
        pos: 1,
        total_attack_num: "2",
        damage: [[{ pos: 0, value: 500, color: 1, attack_count: 0, concurrent_attack_count: 0 }]],
      },
      {
        cmd: "attack",
        pos: 1,
        total_attack_num: 2,
        damage: {
          "1": [
            {
              pos: 0,
              value: "600",
              color: 98,
              attack_count: "1",
              concurrent_attack_count: "2",
              is_random_attack: true,
            },
          ],
        },
      },
    ],
    status: baseStatus,
  });

  assert.equal(result.damage.length, 2);
  assert.deepEqual(
    result.damage.map((damage) => [
      damage.sourcePosition,
      damage.hitIndex,
      damage.concurrentIndex,
      damage.normalAttackCount,
      damage.elementCode,
      damage.randomAttack,
      damage.value,
    ]),
    [
      [1, 0, 0, 2, "1", undefined, 500],
      [1, 1, 2, 2, "98", true, 600],
    ],
  );
});

test("parses a normal attack without bonus damage as two distinct DA swings", () => {
  const result = parseActionResultResponse({
    scenario: [
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 2,
        damage: [
          [
            {
              attack_count: 0,
              concurrent_attack_count: 0,
              pos: 0,
              value: 1529,
              color: "1",
            },
          ],
        ],
      },
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 2,
        damage: {
          "1": [
            {
              attack_count: 1,
              concurrent_attack_count: 0,
              pos: 0,
              value: 1648,
              color: "1",
            },
          ],
        },
      },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "normal-attack");
  assert.equal(result.totalDamage, 3177);
  assert.deepEqual(
    result.damage.map((damage) => [
      damage.hitIndex,
      damage.concurrentIndex,
      damage.normalAttackCount,
      damage.elementCode,
      damage.value,
    ]),
    [
      [0, 0, 2, "1", 1529],
      [1, 0, 2, "1", 1648],
    ],
  );
});

test("parses a normal attack without bonus damage as three distinct TA swings", () => {
  const result = parseActionResultResponse({
    scenario: [
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 3,
        damage: [
          [
            {
              attack_count: 0,
              concurrent_attack_count: 0,
              pos: 0,
              value: 1566,
              color: "1",
            },
          ],
        ],
      },
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 3,
        damage: {
          "1": [
            {
              attack_count: 1,
              concurrent_attack_count: 0,
              pos: 0,
              value: 1582,
              color: "1",
            },
          ],
        },
      },
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 3,
        damage: {
          "2": [
            {
              attack_count: 2,
              concurrent_attack_count: 0,
              pos: 0,
              value: 1620,
              color: "1",
            },
          ],
        },
      },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "normal-attack");
  assert.equal(result.totalDamage, 4768);
  assert.deepEqual(
    result.damage.map((damage) => [
      damage.hitIndex,
      damage.concurrentIndex,
      damage.normalAttackCount,
      damage.elementCode,
      damage.value,
    ]),
    [
      [0, 0, 3, "1", 1566],
      [1, 0, 3, "1", 1582],
      [2, 0, 3, "1", 1620],
    ],
  );
});

test("parses a bonus-damage SA as concurrent components of the same swing", () => {
  const result = parseActionResultResponse({
    scenario: [
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 1,
        damage: [
          [
            {
              attack_count: 0,
              concurrent_attack_count: 0,
              pos: 0,
              value: 2862,
              color: "1",
            },
            {
              attack_count: 0,
              concurrent_attack_count: 1,
              pos: 0,
              value: 159,
              color: 1,
            },
          ],
        ],
      },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "normal-attack");
  assert.equal(result.totalDamage, 3021);
  assert.deepEqual(
    result.damage.map((damage) => [
      damage.hitIndex,
      damage.concurrentIndex,
      damage.normalAttackCount,
      damage.elementCode,
      damage.value,
    ]),
    [
      [0, 0, 1, "1", 2862],
      [0, 1, 1, "1", 159],
    ],
  );
});

test("parses bonus damage independently for each DA swing", () => {
  const result = parseActionResultResponse({
    scenario: [
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 2,
        damage: [
          [
            {
              attack_count: 0,
              concurrent_attack_count: 0,
              pos: 0,
              value: 2853,
              color: "1",
            },
            {
              attack_count: 0,
              concurrent_attack_count: 1,
              pos: 0,
              value: 160,
              color: 1,
            },
          ],
        ],
      },
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 2,
        damage: {
          "1": [
            {
              attack_count: 1,
              concurrent_attack_count: 0,
              pos: 0,
              value: 2823,
              color: "1",
            },
            {
              attack_count: 1,
              concurrent_attack_count: 1,
              pos: 0,
              value: 164,
              color: 1,
            },
          ],
        },
      },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "normal-attack");
  assert.equal(result.totalDamage, 6000);
  assert.deepEqual(
    result.damage.map((damage) => [damage.hitIndex, damage.concurrentIndex, damage.elementCode, damage.value]),
    [
      [0, 0, "1", 2853],
      [0, 1, "1", 160],
      [1, 0, "1", 2823],
      [1, 1, "1", 164],
    ],
  );
  assert.ok(result.damage.every((damage) => damage.normalAttackCount === 2));
});

test("parses bonus damage independently for each TA swing", () => {
  const result = parseActionResultResponse({
    scenario: [
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 3,
        damage: [
          [
            {
              attack_count: 0,
              concurrent_attack_count: 0,
              pos: 0,
              value: 2834,
              color: "1",
            },
            {
              attack_count: 0,
              concurrent_attack_count: 1,
              pos: 0,
              value: 165,
              color: 1,
            },
          ],
        ],
      },
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 3,
        damage: {
          "1": [
            {
              attack_count: 1,
              concurrent_attack_count: 0,
              pos: 0,
              value: 2823,
              color: "1",
            },
            {
              attack_count: 1,
              concurrent_attack_count: 1,
              pos: 0,
              value: 153,
              color: 1,
            },
          ],
        },
      },
      {
        cmd: "attack",
        pos: 0,
        total_attack_num: 3,
        damage: {
          "2": [
            {
              attack_count: 2,
              concurrent_attack_count: 0,
              pos: 0,
              value: 2878,
              color: "1",
            },
            {
              attack_count: 2,
              concurrent_attack_count: 1,
              pos: 0,
              value: 168,
              color: 1,
            },
          ],
        },
      },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "normal-attack");
  assert.equal(result.totalDamage, 9021);
  assert.deepEqual(
    result.damage.map((damage) => [damage.hitIndex, damage.concurrentIndex, damage.elementCode, damage.value]),
    [
      [0, 0, "1", 2834],
      [0, 1, "1", 165],
      [1, 0, "1", 2823],
      [1, 1, "1", 153],
      [2, 0, "1", 2878],
      [2, 1, "1", 168],
    ],
  );
  assert.ok(result.damage.every((damage) => damage.normalAttackCount === 3));
});

test("extracts summon damage while retaining additional damage events", () => {
  const result = parseActionResultResponse({
    scenario: [
      [{ cmd: "summon", name: { ja: "テスト召喚" }, list: [] }],
      { cmd: "summon", list: [{ damage: [{ pos: 0, value: "9000", hp: "1000" }] }] },
      { cmd: "damage", list: [{ pos: 0, value: 100, hp: 900 }] },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "summon");
  assert.equal(result.actionName, "テスト召喚");
  assert.deepEqual(
    result.damage.map((damage) => [damage.sourceCommand, damage.value]),
    [
      ["summon", 9000],
      ["damage", 100],
    ],
  );
  assert.equal(result.totalDamage, 9100);
});

test("parses loop_damage as individual ordered hits", () => {
  const result = parseActionResultResponse({
    scenario: [
      { cmd: "ability", name: "多段テスト" },
      {
        cmd: "loop_damage",
        list: [
          [
            { pos: 0, value: "100", hp: 900, attack_num: 0, split: ["1", "0", "0"] },
            { pos: 0, value: 200, hp: "700", attack_num: "1", split: ["2", "0", "0"] },
          ],
        ],
        total: [{ pos: 0, split: ["3", "0", "0"], count: 0 }],
      },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "ability");
  assert.equal(result.damage.length, 2);
  assert.deepEqual(
    result.damage.map((damage) => [damage.sourceCommand, damage.hitIndex, damage.value]),
    [
      ["loop-damage", 0, 100],
      ["loop-damage", 1, 200],
    ],
  );
  assert.equal(result.totalDamage, 300);
});

test("rejects malformed damage values", () => {
  assert.throws(
    () =>
      parseActionResultResponse({
        scenario: [{ cmd: "damage", list: [{ value: "invalid" }] }],
        status: baseStatus,
      }),
    /value must be a finite number/,
  );
});

test("parses non-damaging buff condition snapshots without retaining personal IDs", () => {
  const result = parseActionResultResponse({
    scenario: [
      { cmd: "ability", name: "防御テスト" },
      {
        cmd: "condition",
        to: "player",
        pos: 0,
        condition: {
          buff: [
            {
              status: "1019_0_50",
              personal_buff_user_id: "discard-this-account-identifier",
              display_priority: "2",
            },
          ],
          debuff: [],
          num: 0,
        },
      },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "ability");
  assert.equal(result.damage.length, 0);
  assert.equal(result.totalDamage, 0);
  assert.equal(result.conditionEvents.length, 1);
  assert.deepEqual(result.conditionEvents[0].effects[0], {
    kind: "buff",
    statusId: "1019_0_50",
    baseId: "1019",
    parameters: ["0", "50"],
    displayPriority: 2,
  });
  assert.equal("personalBuffUserId" in result.conditionEvents[0].effects[0], false);
});

test("parses a recovery-item result and player charge gauge update", () => {
  const result = parseActionResultResponse({
    scenario: [
      { cmd: "rematch", potion: { count: "1", limit_remain: 0 } },
      { cmd: "recast", to: "player", pos: 0, value: "100", split: ["1", "0", "0"] },
      { cmd: "recast", to: "boss", pos: 0, value: 2, max: "3" },
      { cmd: "condition", to: "player", pos: 0, condition: { buff: [], debuff: [], num: 0 } },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "recovery-item");
  assert.equal(result.totalDamage, 0);
  assert.deepEqual(result.recoveryEvents[0], {
    sequence: 0,
    sourceCommand: "rematch",
    itemCount: 1,
    itemLimitRemaining: 0,
  });
  assert.deepEqual(
    result.resourceEvents.map((event) => [event.kind, event.value, event.maxValue]),
    [
      ["charge-gauge", 100, undefined],
      ["charge-diamonds", 2, 3],
    ],
  );
});

test("parses charge-attack hits, gauge consumption, and separate healing", () => {
  const result = parseActionResultResponse({
    scenario: [
      {
        cmd: "special",
        name: "二段奥義テスト",
        list: [
          { damage: [{ pos: 0, value: "1200", hp: 8800, split: ["1", "2", "0", "0"] }] },
          { damage: [{ pos: 0, value: 1300, hp: "7500", split: ["1", "3", "0", "0"] }] },
        ],
        total: [{ pos: 0, split: ["2", "5", "0", "0"] }],
      },
      { cmd: "recast", to: "player", pos: 0, value: 0 },
      { cmd: "chain_burst_gauge", value: "10" },
      { cmd: "heal", to: "boss", kind: "test-heal", list: [{ pos: 0, value: "500", hp: 8000 }] },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "charge-attack");
  assert.equal(result.actionName, "二段奥義テスト");
  assert.deepEqual(result.damage.map((damage) => damage.value), [1200, 1300]);
  assert.deepEqual(result.damage.map((damage) => damage.hitIndex), [0, 1]);
  assert.equal(result.totalDamage, 2500);
  assert.deepEqual(
    result.resourceEvents.map((event) => [event.kind, event.value]),
    [
      ["charge-gauge", 0],
      ["chain-burst-gauge", 10],
    ],
  );
  assert.deepEqual(result.healing[0], {
    sequence: 3,
    target: "boss",
    targetPosition: 0,
    value: 500,
    resultingHp: 8000,
    sourceKind: "test-heal",
  });
});

test("classifies a turn containing normal attacks and charge attacks as mixed", () => {
  const result = parseActionResultResponse({
    scenario: [{ cmd: "attack", damage: [] }, { cmd: "special", list: [] }],
    status: baseStatus,
  });
  assert.equal(result.actionKind, "mixed-attack");
});

test("parses party charge attacks and identifies chain burst damage", () => {
  const result = parseActionResultResponse({
    scenario: [
      {
        cmd: "special",
        pos: 0,
        name: "主人公奥義",
        list: [{ damage: [{ pos: 0, attr: 1, value: 1000 }] }],
      },
      {
        cmd: "special_npc",
        pos: 1,
        name: "仲間奥義",
        list: [
          { damage: [{ pos: 0, attr: 1, value: 2000 }, { pos: 0, attr: 98, value: 200 }] },
        ],
      },
      { cmd: "chain_cutin", chain_num: "2", global: { private_character_id: "discard" } },
      { cmd: "effect", name: "チェインテスト", kind: "burst_test", list: [] },
      { cmd: "damage", to: "boss", list: [{ pos: 0, value: "5000" }] },
      { cmd: "damage", to: "boss", list: [{ pos: 0, value: 100 }] },
    ],
    status: baseStatus,
  });

  assert.equal(result.actionKind, "charge-attack");
  assert.deepEqual(
    result.damage.slice(0, 3).map((damage) => [
      damage.sourcePosition,
      damage.sourceName,
      damage.elementCode,
      damage.value,
    ]),
    [
      [0, "主人公奥義", "1", 1000],
      [1, "仲間奥義", "1", 2000],
      [1, "仲間奥義", "98", 200],
    ],
  );
  assert.equal(result.damage[3].sourceCommand, "chain-burst");
  assert.equal(result.damage[1].hitIndex, 0);
  assert.equal(result.damage[2].hitIndex, 0);
  assert.equal(result.damage[4].sourceCommand, "damage");
  assert.deepEqual(result.chainBursts[0], {
    sequence: 2,
    memberCount: 2,
    name: "チェインテスト",
    effectKind: "burst_test",
    damageSequence: 4,
    totalDamage: 5000,
  });
});
