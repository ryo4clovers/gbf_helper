import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadCharacters,
  loadMechanicsTopics,
  loadSummons,
  findCharacterById,
  findSummonById,
} from "../src/services/knowledgeStore.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = path.join(__dirname, "fixtures", "knowledge");

test("loadCharacters skips _template.md and README.md", async () => {
  const characters = await loadCharacters(FIXTURES_PATH);
  const ids = characters.map((c) => c.id).sort();
  assert.deepEqual(ids, ["test-char-ex", "test-char-no-ex"]);
});

test("loadCharacters parses frontmatter and sections for a character without EX ability", async () => {
  const doc = await findCharacterById(FIXTURES_PATH, "test-char-no-ex");
  assert.ok(doc);
  assert.equal(doc?.frontmatter.has_ex_ability, false);
  assert.equal(doc?.frontmatter.name_jp, "テストキャラ");
  assert.equal(doc?.frontmatter.rarity, "SR");
  assert.ok(doc?.sections["アビリティ1: ファイアボール"]?.includes("火属性ダメージ"));
  assert.equal(doc?.sections["EXアビリティ: フレイムバースト"], undefined);
});

test("loadCharacters parses a character that has an EX ability", async () => {
  const doc = await findCharacterById(FIXTURES_PATH, "test-char-ex");
  assert.ok(doc);
  assert.equal(doc?.frontmatter.has_ex_ability, true);
  assert.ok(doc?.sections["EXアビリティ: フレイムバースト"]?.includes("火属性攻撃力アップ"));
});

test("findCharacterById returns null for an unknown id", async () => {
  const doc = await findCharacterById(FIXTURES_PATH, "does-not-exist");
  assert.equal(doc, null);
});

test("loadSummons skips README.md and parses frontmatter/sections", async () => {
  const summons = await loadSummons(FIXTURES_PATH);
  assert.equal(summons.length, 1);
  const [doc] = summons;
  assert.equal(doc.id, "test-summon");
  assert.equal(doc.frontmatter.name_jp, "テスト召喚石");
  assert.equal(doc.frontmatter.rarity, "SSR");
  assert.ok(doc.sections["召喚効果"]?.includes("火属性ダメージ"));
  assert.ok(doc.sections["加護効果(メイン編成時)"]?.includes("火属性攻撃力アップ"));
});

test("findSummonById returns null for an unknown id", async () => {
  const doc = await findSummonById(FIXTURES_PATH, "does-not-exist");
  assert.equal(doc, null);
});

test("loadMechanicsTopics parses blockquote-style status/source instead of YAML frontmatter", async () => {
  const topics = await loadMechanicsTopics(FIXTURES_PATH);
  assert.equal(topics.length, 1);
  const [topic] = topics;
  assert.equal(topic.frontmatter.status, "検証済み");
  assert.equal(topic.frontmatter.last_updated, "2026-08-17");
  assert.equal(topic.frontmatter.source, "https://example.com");
  assert.equal(topic.title, "テストトピック");
  assert.ok(topic.sections["概要"]?.includes("渾身"));
});
