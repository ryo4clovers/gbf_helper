import { test } from "node:test";
import assert from "node:assert/strict";
import { searchDocs } from "../src/services/search.ts";
import type { CharacterDoc } from "../src/types.ts";

function makeDoc(overrides: Partial<CharacterDoc> = {}): CharacterDoc {
  return {
    id: "dummy",
    filePath: "/dummy.md",
    frontmatter: {
      id: "dummy",
      name_jp: "ダミー",
      name_en: "Dummy",
      rarity: "SR",
      element: "火",
      has_ex_ability: false,
      status: "下書き",
      last_updated: "2026-01-01",
      source: "要検証",
    },
    title: "ダミー",
    body: "",
    sections: {},
    ...overrides,
  };
}

test("searchDocs ranks an exact name match above a body-only match", () => {
  const target = makeDoc({
    id: "katalina-sr",
    frontmatter: { ...makeDoc().frontmatter, id: "katalina-sr", name_jp: "カタリナ", name_en: "Katalina" },
    title: "カタリナ",
  });
  const other = makeDoc({
    id: "other",
    body: "この効果はカタリナの奥義と似ている",
    sections: { 概要: "この効果はカタリナの奥義と似ている" },
  });

  const { results } = searchDocs([other, target], "カタリナ", { limit: 10, offset: 0 });
  assert.equal(results[0].doc.id, "katalina-sr");
});

test("searchDocs respects limit and offset while reporting the true total", () => {
  const docs = Array.from({ length: 5 }, (_, i) =>
    makeDoc({
      id: `char-${i}`,
      body: "渾身について説明",
      sections: { 概要: "渾身について説明" },
    }),
  );
  const { results, total } = searchDocs(docs, "渾身", { limit: 2, offset: 1 });
  assert.equal(total, 5);
  assert.equal(results.length, 2);
});

test("searchDocs returns no results for an unmatched query", () => {
  const { results, total } = searchDocs([makeDoc()], "存在しないキーワード", { limit: 10, offset: 0 });
  assert.equal(results.length, 0);
  assert.equal(total, 0);
});
