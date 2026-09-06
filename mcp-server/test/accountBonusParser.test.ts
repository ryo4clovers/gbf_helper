import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAccountBonusResponse } from "../src/calculator/accountBonusParser.ts";

const response = [
  {
    category_id: "5",
    is_active: true,
    item: [
      {
        item_id: "9013",
        name: "シグナム・へレディス",
        set_flg: "1",
        comment: "全属性攻撃力が3％UPする。",
      },
      {
        item_id: "9014",
        name: "オプリメル・フラゴル",
        set_flg: "1",
        comment: "全属性キャラのダメージ上限が3％UPする。",
      },
      {
        item_id: "9015",
        name: "シンボルム・アミキティアエ",
        set_flg: "1",
        effective_acquired_bonus: {
          current_bonus: { name: "与ダメージ", value: 3.6 },
        },
      },
    ],
  },
  {
    category_id: "6",
    // Deliberately false: category UI state must not disable acquired effects.
    is_active: false,
    item: [
      {
        item_id: "1001",
        name: "祝融の玲瓏佩",
        set_flg: "1",
        effective_acquired_bonus: [
          { name: "火属性攻撃力", detail: "＋10％" },
          { name: "対風属性与ダメージ", detail: "＋5％" },
          { name: "通常攻撃ダメージ上限", detail: "＋5％" },
          { name: "防御力", detail: "＋10％" },
        ],
      },
    ],
  },
];

test("normalizes supported acquired-item damage modifiers without inventory data", () => {
  const result = parseAccountBonusResponse(response);

  assert.deepEqual(
    result.modifiers.map((modifier) => [
      modifier.sourceId,
      modifier.stage,
      modifier.amountPercent,
      modifier.elementCode,
      modifier.targetElementCode,
    ]),
    [
      ["9013", "elemental-attack", 3, undefined, undefined],
      ["9014", "damage-cap", 3, undefined, undefined],
      ["9015", "damage-dealt", 3.6, undefined, undefined],
      ["1001", "elemental-attack", 10, "1", undefined],
      ["1001", "target-element-damage", 5, "1", "4"],
      ["1001", "normal-attack-damage-cap", 5, "1", undefined],
    ],
  );
  assert.equal(JSON.stringify(result).includes("possession"), false);
});

test("skips items that have not been acquired", () => {
  const result = parseAccountBonusResponse([
    {
      item: [
        {
          item_id: "9013",
          name: "シグナム・へレディス",
          set_flg: "0",
          comment: "全属性攻撃力が3％UPする。",
        },
      ],
    },
  ]);
  assert.equal(result.modifiers.length, 0);
  assert.equal(result.issues.length, 1);
});
