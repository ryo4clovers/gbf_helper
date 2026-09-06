import { test } from "node:test";
import assert from "node:assert/strict";
import {
  convertDeckResponseToCalculatorDeckConfig,
  parseCalculatorDeckConfig,
} from "../src/calculator/calculatorDeckConfig.ts";

test("parses a user-authored calculator deck and normalizes IDs and numeric strings", () => {
  const result = parseCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    name: " 手動編成 ",
    protagonist: { elementCode: 1, jobId: 110001, attackOverride: "16255" },
    weapons: [
      { slot: "1", position: "main", weaponId: 1010000400, level: "1", skillLevel: 1 },
    ],
    summons: [],
    characters: [],
  });

  assert.equal(result.name, "手動編成");
  assert.equal(result.protagonist.elementCode, "1");
  assert.equal(result.protagonist.jobId, "110001");
  assert.equal(result.protagonist.attackOverride, 16255);
  assert.equal(result.weapons[0].slot, 1);
  assert.equal(result.weapons[0].weaponId, "1010000400");
});

test("converts a game response without retaining instance IDs or displayed calculation results", () => {
  const result = convertDeckResponseToCalculatorDeckConfig({
    private_user_id: "private-account",
    deck: {
      name: "インポート編成",
      npc: {
        1: {
          master: { id: "3040001000", name: "テストキャラ", attribute: "1", rarity: "4" },
          param: {
            id: "private-character-instance",
            level: "80",
            evolution: "4",
            quality: "99",
            attack: "7000",
            hp: "1200",
          },
        },
      },
      pc: {
        param: { id: "private-protagonist", attack: "16255", hp: 3504, attribute: 1 },
        job: {
          master: { id: "110001", name: "ナイト", weapon1: "1", weapon2: "3" },
          param: { level: "20", master_level: 1, perfection_proof_level: "0" },
        },
        weapons: {
          1: {
            master: { id: "1010000400", name: "ブロンズソード", attribute: "1" },
            param: {
              id: "private-weapon-instance",
              level: "1",
              skill_level: "1",
              evolution: 0,
              quality: "0",
              attack: "70",
              hp: "6",
              arousal: { is_arousal_weapon: false },
            },
          },
        },
        summons: {
          1: {
            master: { id: "2030051000", name: "シルフィードベル", attribute: "4" },
            param: {
              id: "private-summon-instance",
              level: "75",
              evolution: "3",
              quality: 0,
              attack: "865",
              hp: "433",
            },
          },
        },
        sub_summons: {},
        damage_info: { assumed_normal_damage: 2741, effect_value_info: [] },
      },
    },
  });

  assert.deepEqual(result, {
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    name: "インポート編成",
    protagonist: {
      elementCode: "1",
      jobId: "110001",
      jobNameHint: "ナイト",
      jobLevel: 20,
      masterLevel: 1,
      perfectionProofLevel: 0,
      attackOverride: 16255,
      hpOverride: 3504,
    },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1010000400",
        nameHint: "ブロンズソード",
        level: 1,
        skillLevel: 1,
        uncapLevel: 0,
        plusMark: 0,
        attackOverride: 70,
        hpOverride: 6,
      },
    ],
    summons: [
      {
        slot: 1,
        position: "main",
        summonId: "2030051000",
        nameHint: "シルフィードベル",
        level: 75,
        uncapLevel: 3,
        plusMark: 0,
        attackOverride: 865,
        hpOverride: 433,
      },
    ],
    characters: [
      {
        slot: 1,
        position: "front",
        characterId: "3040001000",
        nameHint: "テストキャラ",
        level: 80,
        uncapLevel: 4,
        plusMark: 99,
        attackOverride: 7000,
        hpOverride: 1200,
      },
    ],
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /private-/);
  assert.equal("displayedDamageInfo" in result, false);
});

test("marks a zero-instance main weapon as a job fallback", () => {
  const result = convertDeckResponseToCalculatorDeckConfig({
    deck: {
      npc: {},
      pc: {
        param: { attack: 1000, hp: 100, attribute: 1 },
        job: {
          master: { id: "100501", name: "ファイター・オリジン", weapon1: "1", weapon2: "4" },
          param: { level: 50, master_level: 1, perfection_proof_level: 0 },
        },
        weapons: {
          1: {
            master: { id: "1010000400", name: "ブロンズソード", attribute: "1", kind: "1" },
            param: { id: 0, level: 1, attack: 70, hp: 6 },
          },
        },
        summons: {},
        sub_summons: {},
      },
    },
  });

  assert.equal(result.weapons[0].isJobFallback, true);
  assert.equal(result.protagonist.jobId, "100501");
  assert.equal(result.protagonist.jobNameHint, "ファイター・オリジン");
  assert.equal(result.protagonist.jobLevel, 50);
  assert.equal(result.weapons[0].weaponId, "1010000400");
  assert.equal(result.weapons[0].attackOverride, 70);
  assert.equal(JSON.stringify(result).includes('"instanceId"'), false);
});

test("rejects a job fallback outside main slot 1", () => {
  assert.throws(
    () =>
      parseCalculatorDeckConfig({
        schemaVersion: 1,
        format: "gbf-helper-calculator-deck",
        protagonist: {},
        weapons: [{ slot: 2, position: "grid", weaponId: "1010000400", isJobFallback: true }],
        summons: [],
        characters: [],
      }),
    /job fallback weapon is only allowed in main slot 1/,
  );
});

test("rejects duplicate slots and multiple main weapons", () => {
  assert.throws(
    () =>
      parseCalculatorDeckConfig({
        schemaVersion: 1,
        format: "gbf-helper-calculator-deck",
        protagonist: {},
        weapons: [
          { slot: 1, position: "main", weaponId: "1" },
          { slot: 1, position: "main", weaponId: "2" },
        ],
      }),
    /duplicate weapon slot|only one main weapon/,
  );
});

test("rejects unknown fields to catch mistakes in hand-authored JSON", () => {
  assert.throws(
    () =>
      parseCalculatorDeckConfig({
        schemaVersion: 1,
        format: "gbf-helper-calculator-deck",
        protagonist: { attackOveride: 10000 },
      }),
    /unrecognized/i,
  );
});

test("accepts equipment plus marks from 0 through 99", () => {
  const result = parseCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: {},
    weapons: [{ slot: 1, position: "main", weaponId: "weapon", plusMark: 99 }],
    summons: [{ slot: 1, position: "main", summonId: "summon", plusMark: 0 }],
  });

  assert.equal(result.weapons[0].plusMark, 99);
  assert.equal(result.summons[0].plusMark, 0);
});

test("rejects weapon and summon plus marks above 99", () => {
  for (const equipment of [
    { weapons: [{ slot: 1, position: "main", weaponId: "weapon", plusMark: 100 }] },
    { summons: [{ slot: 1, position: "main", summonId: "summon", plusMark: 100 }] },
  ]) {
    assert.throws(
      () =>
        parseCalculatorDeckConfig({
          schemaVersion: 1,
          format: "gbf-helper-calculator-deck",
          protagonist: {},
          ...equipment,
        }),
      /less than or equal to 99/i,
    );
  }
});
