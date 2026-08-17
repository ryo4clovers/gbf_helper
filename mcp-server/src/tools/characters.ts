import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { loadCharacters } from "../services/knowledgeStore.js";
import { searchDocs } from "../services/search.js";
import type { CharacterDoc } from "../types.js";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

function formatCharacterSummary(doc: CharacterDoc): string {
  const fm = doc.frontmatter;
  return `- ${fm.name_jp}(${fm.name_en}) [id: ${doc.id}] — ${fm.rarity} / ${fm.element} / ${fm.status}`;
}

export function registerCharacterTools(server: McpServer, knowledgeBasePath: string): void {
  server.registerTool(
    "list_characters",
    {
      title: "キャラクター一覧",
      description:
        "ナレッジベースに登録されているキャラクター一覧を取得する。属性・レアリティで絞り込み可能。",
      inputSchema: {
        element: z
          .enum(["火", "水", "土", "風", "光", "闇"])
          .optional()
          .describe("属性で絞り込む(省略可)"),
        rarity: z.enum(["SSR", "SR", "R"]).optional().describe("レアリティで絞り込む(省略可)"),
        limit: z.number().int().min(1).max(100).default(20).describe("最大件数"),
        offset: z.number().int().min(0).default(0).describe("取得開始位置"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ element, rarity, limit, offset }) => {
      const characters = await loadCharacters(knowledgeBasePath);
      const filtered = characters.filter(
        (c) =>
          (!element || c.frontmatter.element === element) &&
          (!rarity || c.frontmatter.rarity === rarity),
      );
      const page = filtered.slice(offset, offset + limit);
      if (page.length === 0) {
        return textResult("該当するキャラクターが見つかりませんでした。");
      }
      const header = `${filtered.length}件中 ${offset + 1}-${offset + page.length}件を表示:\n`;
      return textResult(header + page.map(formatCharacterSummary).join("\n"));
    },
  );

  server.registerTool(
    "search_characters",
    {
      title: "キャラクター検索",
      description:
        "キャラ名・スキル名・効果キーワードでキャラクターを検索する(日本語/英語、部分一致)。",
      inputSchema: {
        query: z.string().min(1).max(200).describe("検索キーワード"),
        limit: z.number().int().min(1).max(50).default(10),
        offset: z.number().int().min(0).default(0),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query, limit, offset }) => {
      const characters = await loadCharacters(knowledgeBasePath);
      const { results, total } = searchDocs(characters, query, { limit, offset });
      if (results.length === 0) {
        return textResult(`「${query}」に一致するキャラクターは見つかりませんでした。`);
      }
      const lines = results.map(
        (r) =>
          `- ${r.doc.frontmatter.name_jp}(${r.doc.frontmatter.name_en}) [id: ${r.doc.id}] — 一致: ${r.matchedIn.join(", ")}\n  ${r.snippet}`,
      );
      return textResult(
        `「${query}」の検索結果 ${total}件中 ${offset + 1}-${offset + results.length}件:\n${lines.join("\n")}`,
      );
    },
  );

  server.registerTool(
    "get_character",
    {
      title: "キャラクター詳細取得",
      description: "id または名前を指定してキャラクターのスキル情報全文を取得する。",
      inputSchema: {
        id_or_name: z
          .string()
          .min(1)
          .max(200)
          .describe("キャラクターのid(ファイル名、例: katalina-sr)または名前(日本語/英語、部分一致可)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id_or_name }) => {
      const characters = await loadCharacters(knowledgeBasePath);

      const byId = characters.find((c) => c.id === id_or_name);
      if (byId) return textResult(byId.body.trim());

      const exactName = characters.filter(
        (c) => c.frontmatter.name_jp === id_or_name || c.frontmatter.name_en === id_or_name,
      );
      if (exactName.length === 1) return textResult(exactName[0].body.trim());

      const q = id_or_name.toLowerCase();
      const pool = exactName.length > 1 ? exactName : characters;
      const partial = pool.filter(
        (c) =>
          c.frontmatter.name_jp?.toLowerCase().includes(q) ||
          c.frontmatter.name_en?.toLowerCase().includes(q) ||
          c.id.includes(q),
      );

      if (partial.length === 1) return textResult(partial[0].body.trim());
      if (partial.length > 1) {
        const candidates = partial
          .map((c) => `${c.id} (${c.frontmatter.name_jp}, ${c.frontmatter.rarity})`)
          .join(", ");
        return textResult(
          `複数のキャラクターが該当しました: ${candidates}\nid_or_name に id を指定して再実行してください。`,
        );
      }
      return textResult(`「${id_or_name}」に一致するキャラクターが見つかりませんでした。`);
    },
  );
}
