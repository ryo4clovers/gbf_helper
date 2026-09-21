import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGameWithCatalog,
  matchGameWithWeapon,
  normalizeWeaponName,
} from "../../scripts/data-collection/import-gamewith-weapon-catalog.mjs";

const wikiRows = [
  {
    weaponId: "1040004600",
    nameJa: "ミュルグレス",
    nameEn: "Murgleis",
    rarity: "SSR",
    element: "water",
    weaponType: "sabre",
    series: "Premium Draw Weapons",
  },
  {
    weaponId: "1040100001",
    nameJa: "無垢なる竜の短剣",
    nameEn: "Atma Dagger",
    rarity: "SSR",
    element: "fire",
    weaponType: "dagger",
  },
];

test("武器名は中黒・空白・属性注記を正規化できる", () => {
  assert.equal(normalizeWeaponName("ロード・オブ・フレイム"), "ロードオブフレイム");
  assert.equal(
    normalizeWeaponName("無垢なる竜の短剣(火属性)", { removeElementSuffix: true }),
    "無垢なる竜の短剣",
  );
});

test("GameWith行を名称・属性・武器種でWiki IDへ照合する", () => {
  const catalog = buildGameWithCatalog({
    rawCatalog: {
      source: { rowCount: 2 },
      weapons: [
        {
          index: 1,
          nameJp: "ミュルグレス",
          element: "水",
          weaponType: "剣",
          articleUrl: "https://example.test/article/show/123",
          finalUncap: "あり入手手段:ガチャ",
          obtain: "ガチャ",
          chargeAttack: { name: "レーゲンス" },
          skills: [{ slot: 1, name: "霧氷の攻刃III" }],
        },
        {
          index: 2,
          nameJp: "無垢なる竜の短剣(火属性)",
          element: "火",
          weaponType: "短剣",
          articleUrl: "https://example.test/article/show/456",
          finalUncap: "なし入手手段:交換",
          skills: [],
        },
      ],
    },
    wikiCatalog: { weapons: wikiRows },
    calculatorCatalog: { weapons: [{ weaponId: "1040004600" }] },
    knowledgeEntries: new Map([["1040004600", {
      file: "murgleis.md",
      status: "下書き",
      officialArchiveChecked: true,
      skillIds: ["627", "633"],
    }]]),
  });

  assert.equal(catalog.summary.wikiMatched, 2);
  assert.equal(catalog.weapons[0].wikiMatch.weaponId, "1040004600");
  assert.equal(catalog.weapons[0].articleId, "123");
  assert.equal(catalog.weapons[0].finalUncap, true);
  assert.equal(catalog.weapons[0].coverage.officialArchive, "checked-in-knowledge");
  assert.equal(catalog.weapons[0].coverage.skillIds, "recorded-in-knowledge");
  assert.equal(catalog.weapons[1].wikiMatch.weaponId, "1040100001");
  assert.equal(catalog.weapons[1].finalUncap, false);
});

test("候補が無い武器は未照合として保持する", () => {
  const result = matchGameWithWeapon(
    { nameJp: "未登録武器", element: "火", weaponType: "剣" },
    new Map(),
  );
  assert.deepEqual(result, { status: "unmatched" });
});
