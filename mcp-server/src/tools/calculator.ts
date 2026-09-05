import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateNormalAttackFromRequest } from "../calculator/normalAttackCalculationRequest.js";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function registerCalculatorTools(server: McpServer): void {
  server.registerTool(
    "calculate_normal_attack_damage",
    {
      title: "通常攻撃ダメージ計算",
      description:
        "CalculatorDeckConfig v1、敵属性・防御値、船炉や大事なもの等の倍率から、通常攻撃本体・追撃・合計の101乱数パターンにおける最小、最大、期待値を計算する。結果は暫定式で、上限処理は未実装。",
      inputSchema: {
        schemaVersion: z.literal(1).describe("計算リクエスト形式。現在は1のみ"),
        deckConfig: z.record(z.unknown()).describe("CalculatorDeckConfig v1"),
        enemy: z
          .object({
            id: z.string().min(1).max(100).optional(),
            name: z.string().min(1).max(100).optional(),
            elementCode: z.enum(["1", "2", "3", "4", "5", "6"]),
            defense: z.number().finite().positive().max(10000),
          })
          .strict(),
        modifiers: z
          .object({
            allElementAttackPercent: z.number().finite().min(0).max(1000).optional(),
            elementAttackPercent: z.number().finite().min(0).max(1000).optional(),
            shipAttackPercent: z.number().finite().min(0).max(1000).optional(),
            furnaceAttackPercent: z.number().finite().min(0).max(1000).optional(),
            jobNormalAttackDamagePercent: z.number().finite().min(0).max(1000).optional(),
            damageDealtPercent: z.number().finite().min(0).max(1000).optional(),
            targetElementDamagePercent: z.number().finite().min(0).max(1000).optional(),
          })
          .strict()
          .default({}),
        random: z
          .object({
            minimum: z.number().finite().positive().optional(),
            maximum: z.number().finite().positive().optional(),
            step: z.number().finite().positive().optional(),
          })
          .strict()
          .optional(),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (request) => {
      const response = calculateNormalAttackFromRequest(request);
      const structuredContent: Record<string, unknown> = { ...response };
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        structuredContent,
      };
    },
  );
}
