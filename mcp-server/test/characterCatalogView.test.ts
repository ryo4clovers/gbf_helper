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
});
