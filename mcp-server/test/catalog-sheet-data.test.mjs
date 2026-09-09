import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ELEMENT_LABELS,
  RARITY_LABELS,
  WEAPON_KIND_LABELS,
  buildWeaponSheetValues,
  buildWeaponSkillSheetValues,
  displayCode,
} from "../../scripts/sheets/catalog-sheet-data.mjs";
import { syncCatalogSheet } from "../../scripts/sheets/sync-catalog-sheet.mjs";

test("コードをシート向け表示名へ変換する", () => {
  assert.equal(displayCode("1", ELEMENT_LABELS, "elementCode"), "火");
  assert.equal(displayCode("6", ELEMENT_LABELS, "elementCode"), "闇");
  assert.equal(displayCode("10", WEAPON_KIND_LABELS, "weaponKindCode"), "刀");
  assert.equal(displayCode("4", RARITY_LABELS, "rarityCode"), "SSR");
});

test("未定義コードは同期対象に残さない", () => {
  assert.throws(
    () => displayCode("99", ELEMENT_LABELS, "elementCode"),
    /elementCodeに未定義のコードがあります: 99/,
  );
});

test("武器行はIDを維持して表示コードだけを変換する", () => {
  const values = buildWeaponSheetValues({
    weapons: [
      {
        weaponId: "1040000000",
        name: "テスト武器",
        nameEn: "Test Weapon",
        elementCode: "1",
        weaponKindCode: "10",
        rarityCode: "4",
        seriesId: "8",
        verificationStatus: "下書き",
        source: "テスト",
      },
    ],
  });

  assert.deepEqual(values[1], [
    "1040000000",
    "テスト武器",
    "Test Weapon",
    "火",
    "刀",
    "SSR",
    "マグナ",
    "下書き",
    "テスト",
  ]);
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
    "critical-rate-up",
    "火",
    10,
    2,
    "下書き",
    "効果出典",
    "2026-09-09",
    "検証済み",
  ]);
});

test("実カタログの表示列に数値コードを残さない", async () => {
  const [weaponCatalog, skillCatalog] = await Promise.all([
    readFile(new URL("../catalog/weapons.v1.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../catalog/weapon-skills.v1.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const weaponValues = buildWeaponSheetValues(weaponCatalog);
  const skillValues = buildWeaponSkillSheetValues(skillCatalog);

  assert.equal(weaponValues.length, weaponCatalog.weapons.length + 1);
  assert.ok(weaponValues.slice(1).every((row) => !/^\d+$/.test(row[3])));
  assert.ok(weaponValues.slice(1).every((row) => !/^\d+$/.test(row[4])));
  assert.ok(weaponValues.slice(1).every((row) => !/^\d+$/.test(row[5])));
  assert.ok(weaponValues.slice(1).every((row) => row[6] === "" || !/^\d+$/.test(row[6])));
  assert.ok(skillValues.slice(1).every((row) => row[4] === "" || !/^\d+$/.test(row[4])));
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
                gridProperties: { rowCount: 10, columnCount: 9 },
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
    weaponValues: [["weapon_id"], ["101"]],
    skillValues: [["skill_id"], ["74"], ["74"]],
  };
  const result = await syncCatalogSheet("sheet-id", "access-token", payload);

  assert.equal(calls.length, 3);
  assert.match(calls[0].url, /fields=sheets\.properties/);
  assert.match(calls[1].url, /values:batchUpdate$/);
  assert.match(calls[2].url, /values:batchClear$/);

  const updateBody = JSON.parse(calls[1].init.body);
  assert.deepEqual(
    updateBody.data.map((entry) => entry.range),
    ["'武器カタログ'!A1:I2", "'スキル・効果'!A1:K3"],
  );
  assert.ok(updateBody.data.every((entry) => !entry.range.includes("提案")));

  const clearBody = JSON.parse(calls[2].init.body);
  assert.deepEqual(clearBody.ranges, ["'武器カタログ'!A3:I", "'スキル・効果'!A4:K"]);
  assert.deepEqual(result, {
    weaponRows: 1,
    skillRows: 2,
    clearedRanges: ["'武器カタログ'!A3:I", "'スキル・効果'!A4:K"],
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
    weaponValues: [["header"], ["row"]],
    skillValues: [["header"], ["row"], ["row"]],
  });

  assert.equal(calls.length, 3);
  assert.match(calls[1].url, /spreadsheets\/sheet-id:batchUpdate$/);
  const expansionBody = JSON.parse(calls[1].init.body);
  assert.deepEqual(expansionBody.requests, [
    { appendDimension: { sheetId: 11, dimension: "ROWS", length: 1 } },
    { appendDimension: { sheetId: 11, dimension: "COLUMNS", length: 1 } },
    { appendDimension: { sheetId: 12, dimension: "ROWS", length: 1 } },
  ]);
  assert.match(calls[2].url, /values:batchUpdate$/);
});
