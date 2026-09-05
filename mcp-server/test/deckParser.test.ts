import { test } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { parseDeckResponse } from "../src/calculator/deckParser.ts";

function makeDeckResponse() {
  return {
    ignored_root_field: "allowed",
    deck: {
      group_name: "テストグループ",
      name: "匿名テスト編成",
      order_no: 2,
      priority: "3",
      ignored_deck_field: true,
      npc: {
        1: {
          master: { id: "3040001000", name: "テストキャラ", attribute: "1", rarity: "4" },
          param: { id: 9001, level: "80", attack: "7000", hp: 1200 },
        },
        2: { master: null, param: null },
      },
      pc: {
        param: { id: 1, attack: 10000, hp: "2000", attribute: 1 },
        job: {
          master: {
            id: 1001,
            name: "テストジョブ",
            class: 4,
            type: "1",
            weapon1: "1",
            weapon2: 2,
            da_odds: "7",
            ta_odds: 3,
          },
          param: { level: "20", master_level: 30, perfection_proof_level: "6" },
          bonue: {
            master_bonus: [
              { type: "attack_up", name: "攻撃力", param: 24 },
              {
                type: "my_job_class_if:final_attack_rise_plus",
                name: "Class.V以外のジョブの時、通常攻撃の与ダメージUP",
                param: "3",
              },
            ],
          },
        },
        weapons: {
          1: {
            master: {
              id: "1040001000",
              name: "テスト武器",
              attribute: "1",
              kind: "1",
              rarity: "4",
              series_id: 10,
            },
            param: {
              id: 8001,
              level: "150",
              attack: "2500",
              hp: 250,
              bonus_attack: "99",
              bonus_hp: 99,
            },
            skill1: {
              skill_id: 101,
              name: "テストスキル",
              comment: "テスト効果",
              level: { release_level: "1" },
            },
            skill2: {
              id: 102,
              name: "説明形式テストスキル",
              description: "description形式の効果説明",
            },
          },
          2: { master: null, param: null },
        },
        summons: {
          1: {
            master: { id: "2040001000", name: "テスト召喚石", attribute: "1", rarity: "4" },
            param: { id: "7001", level: "150", attack: "2000", hp: 800 },
          },
        },
        sub_summons: {
          1: { master: null, param: null },
        },
        damage_info: {
          assumed_advantage_damage_attribute: 4,
          assumed_normal_damage_attribute: "1",
          assumed_advantage_damage: "4139",
          assumed_normal_damage: 2741,
          hp: "3504",
          effect_value_info: [
            { icon_img: "01_icon_might_01.png", value: "15.6％", is_max: false },
            { icon_img: "01_icon_fire_concurrent_attack.png", value: "5.85％", is_max: "0" },
            { icon_img: "unknown.png", value: "MAX", is_max: true },
          ],
          weapon_skill_enhance_param: {
            weapon_skill_enhance: "30",
            weapon_skill_enhance_magna: 0,
            weapon_skill_enhance_evil: "0",
          },
        },
      },
    },
  };
}

test("parseDeckResponse normalizes numeric strings and removes empty slots", () => {
  const result = parseDeckResponse(makeDeckResponse());

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.priority, 3);
  assert.equal(result.protagonist.attack, 10000);
  assert.equal(result.protagonist.job?.masterId, "1001");
  assert.deepEqual(result.protagonist.job?.weaponKindCodes, ["1", "2"]);
  assert.deepEqual(result.protagonist.job?.damageModifiers, [
    {
      stage: "normal-attack-damage",
      amountPercent: 3,
      sourceType: "job-master-bonus",
      sourceId: "my_job_class_if:final_attack_rise_plus",
      sourceName: "Class.V以外のジョブの時、通常攻撃の与ダメージUP",
      condition: "non-class-v",
      verificationStatus: "下書き",
    },
  ]);

  assert.equal(result.characters.length, 1);
  assert.equal(result.characters[0].position, "front");
  assert.equal(result.characters[0].instanceId, "9001");

  assert.equal(result.weapons.length, 1);
  assert.equal(result.weapons[0].position, "main");
  assert.equal(result.weapons[0].attack, 2500);
  assert.equal(result.weapons[0].skills[0].id, "101");
  assert.equal(result.weapons[0].skills[0].description, "テスト効果");
  assert.equal(result.weapons[0].skills[0].releaseLevel, 1);
  assert.equal(result.weapons[0].skills[1].description, "description形式の効果説明");

  assert.equal(result.summons.length, 1);
  assert.equal(result.summons[0].position, "main");

  assert.equal(result.displayedDamageInfo?.assumedNormalDamage, 2741);
  assert.equal(result.displayedDamageInfo?.assumedNormalElementCode, "1");
  assert.equal(result.displayedDamageInfo?.assumedAdvantageDamage, 4139);
  assert.deepEqual(
    result.displayedDamageInfo?.effectValues.map((effect) => [
      effect.icon,
      effect.valueText,
      effect.percentage,
      effect.isMax,
    ]),
    [
      ["01_icon_might_01.png", "15.6％", 15.6, false],
      ["01_icon_fire_concurrent_attack.png", "5.85％", 5.85, false],
      ["unknown.png", "MAX", undefined, true],
    ],
  );
  assert.deepEqual(result.displayedDamageInfo?.weaponSkillEnhancement, {
    normal: 30,
    magna: 0,
    evil: 0,
  });
});

test("identifies a zero-instance main weapon as the job fallback", () => {
  const input = makeDeckResponse();
  Reflect.set(input.deck.pc.weapons[1].param, "id", 0);

  const result = parseDeckResponse(input);

  assert.equal(result.weapons[0].instanceId, "0");
  assert.equal(result.weapons[0].isJobFallback, true);
});

test("parseDeckResponse rejects a response without the deck shape", () => {
  assert.throws(() => parseDeckResponse({ deck: {} }), ZodError);
});

test("parseDeckResponse rejects a malformed populated equipment slot", () => {
  const input = makeDeckResponse();
  input.deck.pc.weapons[1].param.attack = "not-a-number";
  assert.throws(() => parseDeckResponse(input), /param\.attack must be a finite number/);
});

test("parseDeckResponse does not retain protagonist instance identifiers", () => {
  const result = parseDeckResponse(makeDeckResponse());
  assert.equal("id" in result.protagonist, false);
});
