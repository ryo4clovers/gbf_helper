import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { loadMechanicsTopics } from "../services/knowledgeStore.js";
import { searchDocs } from "../services/search.js";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

export function registerMechanicsTools(server: McpServer, knowledgeBasePath: string): void {
  server.registerTool(
    "search_mechanics",
    {
      title: "ゲームシステム用語検索",
      description:
        "ゲームシステム・用語(背水、渾身、上限開放など)をキーワードで検索する。スキル効果の説明を補足する際に使う。",
      inputSchema: {
        query: z.string().min(1).max(200).describe("用語・仕組みのキーワード"),
        limit: z.number().int().min(1).max(20).default(5),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ query, limit }) => {
      const topics = await loadMechanicsTopics(knowledgeBasePath);
      const { results, total } = searchDocs(topics, query, { limit, offset: 0 });
      if (results.length === 0) {
        return textResult(`「${query}」に一致するトピックは見つかりませんでした。`);
      }
      const lines = results.map((r) => `- ${r.doc.title || r.doc.id} [id: ${r.doc.id}] — ${r.snippet}`);
      return textResult(`「${query}」の検索結果 ${total}件中上位${results.length}件:\n${lines.join("\n")}`);
    },
  );

  server.registerTool(
    "get_mechanics_topic",
    {
      title: "ゲームシステムトピック取得",
      description: "id(ファイル名)を指定してゲームシステムのトピック全文を取得する。",
      inputSchema: {
        id: z.string().min(1).max(200).describe("トピックのファイル名(拡張子なし、例: buffs-debuffs)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ id }) => {
      const topics = await loadMechanicsTopics(knowledgeBasePath);
      const topic = topics.find((t) => t.id === id);
      if (!topic) {
        return textResult(`id「${id}」に一致するトピックが見つかりませんでした。`);
      }
      return textResult(topic.body.trim());
    },
  );
}
