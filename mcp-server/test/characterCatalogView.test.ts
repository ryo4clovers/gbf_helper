import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createSelectableCharacterCatalog } from "../src/calculator/characterCatalogView.js";

test("creates a selectable character catalog from knowledge frontmatter", () => {
  const root = mkdtempSync(path.join(tmpdir(), "gbf-character-catalog-"));
  const characters = path.join(root, "characters");
  mkdirSync(characters);
  writeFileSync(
    path.join(characters, "fire-ssr-test.md"),
    `---\nid: "fire-ssr-test"\nname_jp: "テスト"\nname_en: "Test"\nrarity: SSR\nelement: "火"\nhas_ex_ability: false\nstatus: 下書き\nlast_updated: 2026-09-07\nsource: "test"\n---\n# テスト\n`,
  );

  assert.deepEqual(createSelectableCharacterCatalog(root), {
    schemaVersion: 1,
    characters: [
      {
        characterId: "fire-ssr-test",
        name: "テスト",
        nameEn: "Test",
        elementCode: "1",
        rarity: "SSR",
        verificationStatus: "下書き",
      },
    ],
  });
});

test("creates a browser-safe catalog from all character knowledge", () => {
  const catalog = createSelectableCharacterCatalog();

  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.characters.length, 1018);
  assert.equal(catalog.characters.some((character) => character.characterId === "fire-ssr-tien-normal"), true);
  assert.equal(JSON.stringify(catalog).includes("source"), false);
  const ilsa = catalog.characters.find((character) => character.characterId === "dark-ssr-ilsa-yukata")!;
  assert.equal(ilsa.masterId, "3040456000");
  assert.equal(ilsa.imageUrl, "https://prd-game-a-granbluefantasy.akamaized.net/assets/img/sp/assets/npc/m/3040456000_01.jpg");
  assert.equal(catalog.characters.find((character) => character.characterId === "dark-ssr-sariel-limited")?.masterId, "3040611000");
  assert.equal(catalog.characters.find((character) => character.characterId === "dark-ssr-cidala-valentine")?.masterId, "3040512000");
  // A seasonal version must not inherit another version's picture.
  const summerIlsa = catalog.characters.find((character) => character.nameEn === "Ilsa (Summer)")!;
  assert.ok(summerIlsa.imageUrl);
  assert.notEqual(summerIlsa.masterId, ilsa.masterId);
  const imageIds = catalog.characters.flatMap((character) => character.masterId ? [`${character.masterId}:${character.styleId ?? 1}`] : []);
  assert.equal(imageIds.length, catalog.characters.length, "all current knowledge entries have reviewed image identities");
  assert.equal(new Set(imageIds).size, imageIds.length, "master ID and style must uniquely identify a character variant");
  for (const character of catalog.characters) {
    if (character.imageUrl) assert.match(character.imageUrl, /^https:\/\/prd-game-a-granbluefantasy\.akamaized\.net\/assets\/img\/sp\/assets\/npc\/m\/30[234]\d{7}_01(?:_st2)?\.jpg$/);
  }
});

test("distinguishes reviewed variants, mistranslated names, and style shifts", () => {
  const characters = new Map(createSelectableCharacterCatalog().characters.map((character) => [character.characterId, character]));
  for (const [id, masterId] of Object.entries({
    "water-ssr-silva-normal": "3040049000",
    "water-ssr-silva-grand": "3040613000",
    "fire-sr-sutera-event": "3030187000",
    "fire-sr-sutera-fire": "3030113000",
    "light-ssr-zooey-normal": "3040078000",
    "light-ssr-zooey-gun-normal": "3040150000",
    "fire-sr-lyria-normal": "3030182000",
    "fire-ssr-lyria-event": "3040643000",
    "earth-ssr-octo-normal": "3040037000",
    "wind-ssr-siete-normal": "3040036000",
    "dark-ssr-zeta-dark": "3040112000",
    "fire-ssr-tsubasa-normal": "3040180000",
  })) assert.equal(characters.get(id)?.masterId, masterId, id);
  for (const [baseId, shiftedId] of [
    ["earth-ssr-shindara-normal", "earth-ssr-shindara-super"],
    ["water-ssr-yngwie-normal", "water-ssr-yngwie-shift"],
    ["wind-ssr-lecia-grand", "wind-ssr-lyria-style-shift"],
  ]) {
    const base = characters.get(baseId)!;
    const shifted = characters.get(shiftedId)!;
    assert.ok(base, baseId);
    assert.equal(base.masterId, shifted.masterId);
    assert.equal(base.styleId, undefined);
    assert.equal(shifted.styleId, 2);
    assert.notEqual(base.imageUrl, shifted.imageUrl);
    assert.ok(shifted.imageUrl?.endsWith("_01_st2.jpg"));
  }
});
