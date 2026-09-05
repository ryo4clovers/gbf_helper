import { test } from "node:test";
import assert from "node:assert/strict";
import { createDamageCalculationInput } from "../src/calculator/calculationInput.ts";

const deckResponse = {
  deck: {
    npc: {},
    pc: {
      param: { attack: "1000", hp: "100", attribute: "1" },
      weapons: {},
      summons: {},
      sub_summons: {},
    },
  },
};

const battleStartResponse = {
  boss: {
    param: [{ number: 1, enemy_id: "99", hp: "10000", hpmax: "10000", attr: "2" }],
  },
};

test("createDamageCalculationInput combines normalized deck and battle inputs", () => {
  const result = createDamageCalculationInput(deckResponse, battleStartResponse, 1);
  assert.equal(result.deck.protagonist.attack, 1000);
  assert.equal(result.battle.enemies[0].enemyId, "99");
  assert.equal(result.targetEnemySlot, 1);
});

test("createDamageCalculationInput rejects an unknown target slot", () => {
  assert.throws(
    () => createDamageCalculationInput(deckResponse, battleStartResponse, 2),
    /target enemy slot 2 was not found/,
  );
});

test("adds an explicit enemy defense override with provenance", () => {
  const result = createDamageCalculationInput(deckResponse, battleStartResponse, 1, {
    enemyDefenseOverride: 10,
  });
  assert.equal(result.battle.enemies[0].defense, 10);
  assert.equal(result.battle.enemies[0].defenseSource, "user-override");
});

test("rejects invalid enemy defense overrides", () => {
  assert.throws(
    () =>
      createDamageCalculationInput(deckResponse, battleStartResponse, 1, {
        enemyDefenseOverride: 0,
      }),
    /finite positive/,
  );
});

test("normalizes account bonuses and keeps crew stages separate", () => {
  const result = createDamageCalculationInput(deckResponse, battleStartResponse, 1, {
    accountBonusResponse: [
      {
        item: [
          {
            item_id: "9013",
            name: "シグナム・へレディス",
            set_flg: "1",
            comment: "全属性攻撃力が3％UPする。",
          },
        ],
      },
    ],
    crewModifiers: { shipAttackPercent: 10, furnaceAttackPercent: 10 },
  });

  assert.equal(result.accountBonuses?.modifiers[0].stage, "elemental-attack");
  assert.deepEqual(result.crewModifiers, { shipAttackPercent: 10, furnaceAttackPercent: 10 });
});

test("rejects invalid crew percentages", () => {
  assert.throws(
    () =>
      createDamageCalculationInput(deckResponse, battleStartResponse, 1, {
        crewModifiers: { shipAttackPercent: -1 },
      }),
    /crewModifiers.shipAttackPercent/,
  );
});
