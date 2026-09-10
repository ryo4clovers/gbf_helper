import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  EFFECT_KIND_LABELS,
  ELEMENT_LABELS,
  RARITY_LABELS,
  WEAPON_HEADERS,
  WEAPON_KIND_LABELS,
  WEAPON_SKILL_HEADERS,
  WIKI_SERIES_LABELS,
  buildWeaponSheetValues,
  buildWeaponSkillSheetValues,
  displayCode,
  parseJapaneseChargeAttackKnowledge,
  parseJapaneseWeaponSkillsKnowledge,
} from "../../scripts/sheets/catalog-sheet-data.mjs";
import { syncCatalogSheet } from "../../scripts/sheets/sync-catalog-sheet.mjs";

test("コードをシート向け表示名へ変換する", () => {
  assert.equal(displayCode("1", ELEMENT_LABELS, "elementCode"), "火");
  assert.equal(displayCode("6", ELEMENT_LABELS, "elementCode"), "闇");
  assert.equal(displayCode("10", WEAPON_KIND_LABELS, "weaponKindCode"), "刀");
  assert.equal(displayCode("4", RARITY_LABELS, "rarityCode"), "SSR");
  assert.equal(displayCode("critical-rate-up", EFFECT_KIND_LABELS, "effect.kind"), "クリティカル確率UP");
  assert.equal(displayCode("character-hp-up", EFFECT_KIND_LABELS, "effect.kind"), "キャラHPUP");
  assert.equal(displayCode("dark opus", WIKI_SERIES_LABELS, "wiki.series"), "終末の神器");
});

test("未定義コードは同期対象に残さない", () => {
  assert.throws(
    () => displayCode("99", ELEMENT_LABELS, "elementCode"),
    /elementCodeに未定義のコードがあります: 99/,
  );
  assert.throws(
    () => displayCode("unknown-effect", EFFECT_KIND_LABELS, "effect.kind"),
    /effect\.kindに未定義のコードがあります: unknown-effect/,
  );
});

test("武器行は表示コード、Lv境界、奥義、スキル枠を利用者向けに展開する", () => {
  const values = buildWeaponSheetValues(
    {
      weapons: [
        {
          weaponId: "1040000000",
          name: "テスト武器",
          nameEn: "Test Weapon",
          elementCode: "1",
          weaponKindCode: "10",
          rarityCode: "4",
          selectionDefaults: { level: 250, uncapLevel: 6, hp: 400, attack: 4000 },
          levelStats: {
            maximumLevel: 250,
            points: [
              { level: 1, hp: 40, attack: 400 },
              { level: 100, hp: 200, attack: 2000 },
              { level: 250, hp: 400, attack: 4000 },
            ],
          },
          skillSlots: [{ sourceKey: "skill1", skillId: "74" }],
          verificationStatus: "検証済み",
          confirmedAt: "2026-09-10",
          source: "テスト",
        },
      ],
    },
    {
      wikiCatalog: {
        weapons: [{
          weaponId: "1040000000",
          series: "dark opus",
          uncaps: { maximum: 6 },
          skills: [],
          chargeAttacks: [{ stage: 3, name: "English C.A.", description: "Massive damage" }],
        }],
      },
      skillCatalog: { skills: [{ skillId: "74", name: "火の技巧" }] },
      japaneseChargeAttacks: [{
        weaponId: "1040000000",
        name: "最終奥義",
        description: "火属性ダメージ(特大)",
      }],
      japaneseWeaponSkills: [{
        weaponId: "1040000000",
        sourceKey: "skill1",
        name: "火の技巧・実機表記",
      }],
    },
  );

  assert.equal(values[0].length, WEAPON_HEADERS.length);
  assert.equal(values[1].length, WEAPON_HEADERS.length);
  const row = Object.fromEntries(WEAPON_HEADERS.map((header, index) => [header, values[1][index]]));
  assert.equal(row.weapon_id, "1040000000");
  assert.equal(row.属性, "火");
  assert.equal(row.レア, "SSR");
  assert.equal(row.武器種, "刀");
  assert.equal(row.シリーズ, "終末の神器");
  assert.equal(row.最大Lv, 250);
  assert.equal(row["最大Lv HP"], 400);
  assert.equal(row["Lv1 攻撃"], 400);
  assert.equal(row["Lv100 HP"], 200);
  assert.equal(row.奥義名, "最終奥義");
  assert.equal(row.奥義効果, "火属性ダメージ(特大)");
  assert.equal(row["スキル1 skill_id"], "74");
  assert.equal(row.スキル1名, "火の技巧・実機表記");
  assert.equal(row.検証状態, "検証済み");
});

test("実機由来ナレッジからスロット別の日本語スキル名を抽出する", () => {
  const entries = parseJapaneseWeaponSkillsKnowledge(`---
weapon_id: "1040020300"
---

### スキル1: 呪蝕の渾身

- skill_id: \`1555\`

### スキル2: 黒の誓約

- skill_id: \`1556\`
`);

  assert.deepEqual(entries, [
    { weaponId: "1040020300", sourceKey: "skill1", name: "呪蝕の渾身" },
    { weaponId: "1040020300", sourceKey: "skill2", name: "黒の誓約" },
  ]);
});

test("日本語の根拠がないWiki由来スキル名は公開しない", () => {
  const values = buildWeaponSheetValues(
    { weapons: [{
      weaponId: "1040000000",
      name: "テスト武器",
      elementCode: "1",
      weaponKindCode: "1",
      rarityCode: "4",
    }] },
    { wikiCatalog: { weapons: [{
      weaponId: "1040000000",
      skills: [{ slot: 1, initial: { name: "English Skill" } }],
    }] } },
  );
  const row = Object.fromEntries(WEAPON_HEADERS.map((header, index) => [header, values[1][index]]));
  assert.equal(row.スキル1名, "");
});

test("実機由来ナレッジから日本語の奥義だけを抽出する", () => {
  const entry = parseJapaneseChargeAttackKnowledge(`---
weapon_id: "1040020300"
---

## 奥義(チャージアタック)

- 名称: カースド・エリア＋＋(カースド・エリア＋＋ = 2段階＋)
- 効果(実機 comment): 闇属性ダメージ(特大)/味方全体の奥義ゲージUP(10%)
- 出典: 実機レスポンス

## 上限解放・強化要素
`);

  assert.deepEqual(entry, {
    weaponId: "1040020300",
    name: "カースド・エリア＋＋",
    description: "闇属性ダメージ(特大)/味方全体の奥義ゲージUP(10%)",
  });
});

test("スキル効果行は効果単位の確度を優先して属性を表示名にする", () => {
  const values = buildWeaponSkillSheetValues({
    skills: [
      {
        skillId: "74",
        name: "火の技巧",
        description: "テスト効果",
        verificationStatus: "検証済み",
        source: "スキル出典",
        confirmedAt: "2026-09-09",
        effects: [
          {
            kind: "critical-rate-up",
            elementCode: "1",
            skillLevel: 10,
            amountPercent: 2,
            verificationStatus: "下書き",
            source: "効果出典",
          },
        ],
      },
    ],
  });

  assert.deepEqual(values[1], [
    "74",
    "火の技巧",
    "テスト効果",
    "クリティカル確率UP",
    "火",
    10,
    2,
    "下書き",
    "効果出典",
    "2026-09-09",
    "検証済み",
  ]);
});

test("実カタログの表示列に内部コードを残さない", async () => {
  const [weaponCatalog, skillCatalog, wikiCatalog] = await Promise.all([
    readFile(new URL("../catalog/weapons.v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../catalog/weapon-skills.v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../knowledge/weapons/wiki-catalog.v1.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const weaponValues = buildWeaponSheetValues(weaponCatalog, { skillCatalog, wikiCatalog });
  const skillValues = buildWeaponSkillSheetValues(skillCatalog);

  assert.equal(weaponValues.length, weaponCatalog.weapons.length + 1);
  assert.ok(weaponValues.slice(1).every((row) => !/^\d+$/.test(row[3])));
  assert.ok(weaponValues.slice(1).every((row) => !/^\d+$/.test(row[4])));
  assert.ok(weaponValues.slice(1).every((row) => !/^\d+$/.test(row[5])));
  assert.ok(weaponValues.slice(1).every((row) => row[6] === "" || !/^\d+$/.test(row[6])));
  assert.ok(weaponValues.every((row) => row.length === WEAPON_HEADERS.length));
  assert.ok(skillValues.slice(1).every((row) => row[4] === "" || !/^\d+$/.test(row[4])));
  assert.ok(skillValues.slice(1).every((row) => row[3] === "" || !/^[a-z]+(?:-[a-z]+)+$/.test(row[3])));
});

test("同期は閲覧用2タブだけを書き換え、余った旧行を後から消去する", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const body = calls.length === 1
      ? {
          sheets: [
            {
              properties: {
                sheetId: 1,
                title: "武器カタログ",
                gridProperties: { rowCount: 10, columnCount: 40 },
              },
            },
            {
              properties: {
                sheetId: 2,
                title: "スキル・効果",
                gridProperties: { rowCount: 8, columnCount: 11 },
              },
            },
          ],
        }
      : {};
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    };
  };

  const payload = {
    weaponValues: [WEAPON_HEADERS, WEAPON_HEADERS.map(() => "")],
    skillValues: [WEAPON_SKILL_HEADERS, WEAPON_SKILL_HEADERS.map(() => ""), WEAPON_SKILL_HEADERS.map(() => "")],
  };
  const result = await syncCatalogSheet("sheet-id", "access-token", payload);

  assert.equal(calls.length, 3);
  assert.match(calls[0].url, /fields=sheets\.properties/);
  assert.match(calls[1].url, /values:batchUpdate$/);
  assert.match(calls[2].url, /values:batchClear$/);

  const updateBody = JSON.parse(calls[1].init.body);
  assert.deepEqual(
    updateBody.data.map((entry) => entry.range),
    ["'武器カタログ'!A1:AG2", "'スキル・効果'!A1:K3"],
  );
  assert.ok(updateBody.data.every((entry) => !entry.range.includes("提案")));

  const clearBody = JSON.parse(calls[2].init.body);
  assert.deepEqual(clearBody.ranges, ["'武器カタログ'!A3:AG", "'スキル・効果'!A4:K"]);
  assert.deepEqual(result, {
    weaponRows: 1,
    skillRows: 2,
    clearedRanges: ["'武器カタログ'!A3:AG", "'スキル・効果'!A4:K"],
  });
});

test("同期先の行列が不足している場合は値を書き込む前に拡張する", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const body = calls.length === 1
      ? {
          sheets: [
            {
              properties: {
                sheetId: 11,
                title: "武器カタログ",
                gridProperties: { rowCount: 1, columnCount: 8 },
              },
            },
            {
              properties: {
                sheetId: 12,
                title: "スキル・効果",
                gridProperties: { rowCount: 2, columnCount: 11 },
              },
            },
          ],
        }
      : {};
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    };
  };

  await syncCatalogSheet("sheet-id", "access-token", {
    weaponValues: [WEAPON_HEADERS, WEAPON_HEADERS.map(() => "")],
    skillValues: [WEAPON_SKILL_HEADERS, WEAPON_SKILL_HEADERS.map(() => ""), WEAPON_SKILL_HEADERS.map(() => "")],
  });

  assert.equal(calls.length, 3);
  assert.match(calls[1].url, /spreadsheets\/sheet-id:batchUpdate$/);
  const expansionBody = JSON.parse(calls[1].init.body);
  assert.deepEqual(expansionBody.requests, [
    { appendDimension: { sheetId: 11, dimension: "ROWS", length: 1 } },
    { appendDimension: { sheetId: 11, dimension: "COLUMNS", length: 25 } },
    { appendDimension: { sheetId: 12, dimension: "ROWS", length: 1 } },
  ]);
  assert.match(calls[2].url, /values:batchUpdate$/);
});
