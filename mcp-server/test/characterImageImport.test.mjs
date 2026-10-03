import assert from "node:assert/strict";
import test from "node:test";
import { resolveCharacterImages } from "../scripts/import-character-images.mjs";

const character = {
  id: "water-ssr-silva-grand", name_en: "Silva (Grand)", rarity: "SSR", element: "水",
  source: "https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/123",
};
const row = {
  id: "3040613000", name: "Sylvia", jpname: "シルヴィア", element: "Water", rarity: "SSR",
  "style id": "1", "link gamewith": "https://グランブルーファンタジー.gamewith.jp/article/show/123",
};
const resolution = { masterId: row.id, wikiPage: row.name, jpName: row.jpname, gameWithArticle: "123" };

test("reviewed identities override misleading English names and reject stale evidence", () => {
  const other = { ...row, id: "3040049000", name: "Silva", jpname: "シルヴァ" };
  const review = { [character.id]: resolution };
  assert.equal(resolveCharacterImages([character], [row, other], review).entries[character.id].masterId, row.id);
  for (const changed of [
    { ...row, element: "Fire" }, { ...row, rarity: "SR" }, { ...row, jpname: "別人" },
    { ...row, "link gamewith": "https://example.com/article/show/456" },
  ]) assert.throws(() => resolveCharacterImages([character], [changed], review), /mismatch/);
  assert.throws(() => resolveCharacterImages([character], [], review), /missing or ambiguous/);
  assert.throws(() => resolveCharacterImages([character], [row, row], review), /missing or ambiguous/);
  assert.throws(() => resolveCharacterImages([{ ...character, source: character.source + "4" }], [row], review), /source mismatch/);
  assert.throws(() => resolveCharacterImages([], [row], review), /Unknown reviewed character/);
});

test("Any element is allowed only for explicitly reviewed identities", () => {
  const any = { ...row, element: "any", rarity: "ssr" };
  assert.throws(() => resolveCharacterImages([character], [any], { [character.id]: resolution }), /mismatch/);
  assert.equal(resolveCharacterImages([character], [any], {
    [character.id]: { ...resolution, allowAnyElement: true },
  }).entries[character.id].masterId, row.id);
  assert.deepEqual(resolveCharacterImages([{ ...character, name_en: row.name }], [any]).entries, {});
});

test("styles share a master safely while collisions within a style remain rejected", () => {
  const base = { ...character, id: "base", name_en: "Sylvia" };
  const shifted = { ...character, id: "shifted" };
  const styleRow = { ...row, name: "Sylvia (Style)", "style id": "2" };
  const review = { shifted: { ...resolution, wikiPage: styleRow.name, styleId: 2 } };
  const result = resolveCharacterImages([base, shifted], [styleRow, row], review);
  assert.equal(result.entries.base.masterId, row.id);
  assert.equal(result.entries.base.styleId, undefined);
  assert.equal(result.entries.shifted.styleId, 2);
  assert.equal(result.unmatched.length, 0);
  assert.throws(() => resolveCharacterImages([base, shifted], [row], { shifted: resolution }), /collision/);
  const duplicate = resolveCharacterImages([base, { ...base, id: "duplicate" }], [row]);
  assert.deepEqual(duplicate.entries, {});
  assert.equal(duplicate.unmatched.length, 2);
});
