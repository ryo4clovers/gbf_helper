import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { loadSummons } from "../services/knowledgeStore.js";
import { searchDocs } from "../services/search.js";
import type { SummonDoc } from "../types.js";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

function formatSummonSummary(doc: SummonDoc): string {
  const fm = doc.frontmatter;
  return `- ${fm.name_jp}(${fm.name_en}) [id: ${doc.id}] — ${fm.rarity} / ${fm.element} / ${fm.status}`;
}

export function registerSummonTools(server: McpServer, knowledgeBasePath: string): void {
  server.registerTool(
    "list_summons",
    {
      title: "召喚石一覧",
      description:
        "ナレッジベースに登録されている召喚石一覧を取得する。属性・レアリティで絞り込み可能。",
      inputSchema: {
        element: z
          .enum(["火", "水", "土", "風", "光", "闇", "無属性"])
          .optional()
          .describe("属性で絞り込む(省略可)"),
        rarity: z.enum(["SSR", "SR", "R"]).optional().describe("レアリティで絞り込む(省略可)"),
        limit: z.number().int().min(1).max(100).default(20).describe("最大件数"),
        offset: z.number().int().min(0).default(0).describe("取得開始位置"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ element, rarity, limit, offset }) => {
      const summons = await loadSummons(knowledgeBasePath);
      const filtered = summons.filter(
        (s) =>
          (!element || s.frontmatter.element === element) &&
          (!rarity || s.frontmatter.rarity === rarity),
      );
      const page = filtered.slice(offset, offset + limit);
      if (page.length === 0) {
        return textResult("該当する召喚石が見つかりませんでした。");
      }
      const header = `${filtered.length}件中 ${offset + 1}-${offset + page.length}件を表示:\n`;
      return textResult(header + page.map(formatSummonSummary).join("\n"));
    },
  );

  server.registerTool(
    "search_summons",
    {
      title: "召喚石検索",
      description:
        "召喚石名・召喚効果・加護効果キーワードで召喚石を検索する(日本語/英語、部分一致)。",
      inputSchema: {
        query: z.string().min(1).max(200).describe("検索キーワード"),
        limit: z.number().int().min(1).max(50).default(10),
        offset: z.number().int().min(0).default(0),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query, limit, offset }) => {
      const summons = await loadSummons(knowledgeBasePath);
      const { results, total } = searchDocs(summons, query, { limit, offset });
      if (results.length === 0) {
        return textResult(`「${query}」に一致する召喚石は見つかりませんでした。`);
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
    "get_summon",
    {
      title: "召喚石詳細取得",
      description: "id または名前を指定して召喚石のステータス・効果情報全文を取得する。",
      inputSchema: {
        id_or_name: z
          .string()
          .min(1)
          .max(200)
          .describe("召喚石のid(ファイル名、例: light-ssr-lucifer-normal)または名前(日本語/英語、部分一致可)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id_or_name }) => {
      const summons = await loadSummons(knowledgeBasePath);

      const byId = summons.find((s) => s.id === id_or_name);
      if (byId) return textResult(byId.body.trim());

      const exactName = summons.filter(
        (s) => s.frontmatter.name_jp === id_or_name || s.frontmatter.name_en === id_or_name,
      );
      if (exactName.length === 1) return textResult(exactName[0].body.trim());

      const q = id_or_name.toLowerCase();
      const pool = exactName.length > 1 ? exactName : summons;
      const partial = pool.filter(
        (s) =>
          s.frontmatter.name_jp?.toLowerCase().includes(q) ||
          s.frontmatter.name_en?.toLowerCase().includes(q) ||
          s.id.includes(q),
      );

      if (partial.length === 1) return textResult(partial[0].body.trim());
      if (partial.length > 1) {
        const candidates = partial
          .map((s) => `${s.id} (${s.frontmatter.name_jp}, ${s.frontmatter.rarity})`)
          .join(", ");
        return textResult(
          `複数の召喚石が該当しました: ${candidates}\nid_or_name に id を指定して再実行してください。`,
        );
      }
      return textResult(`「${id_or_name}」に一致する召喚石が見つかりませんでした。`);
    },
  );
}
