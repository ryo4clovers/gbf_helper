import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateNormalAttackFromRequest } from "../calculator/normalAttackCalculationRequest.js";
import { createSelectableJobCatalog } from "../calculator/jobCatalogView.js";
import { createJobFallbackWeaponCatalogView } from "../calculator/jobFallbackWeaponCatalog.js";
import { createSelectableWeaponCatalog } from "../calculator/weaponCatalogView.js";
import { createSelectableSummonCatalog } from "../calculator/summonCatalogView.js";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function registerCalculatorTools(server: McpServer): void {
  server.registerTool(
    "list_job_fallback_weapons",
    {
      title: "ジョブ仮メイン武器一覧",
      description:
        "メイン武器未選択時にジョブの得意武器種へ応じて使用される、全10武器種のLv1仮メイン武器を取得する。通常の所持武器カタログとは別の固定カタログ。",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      const response = createJobFallbackWeaponCatalogView();
      const structuredContent: Record<string, unknown> = { ...response };
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "list_calculator_jobs",
    {
      title: "計算機対応ジョブ一覧",
      description:
        "主人公ジョブ選択式エディタで利用できるジョブ名、クラス、得意武器、検証状態の一覧を取得する。編成JSONを作る前に利用する。",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      const response = createSelectableJobCatalog();
      const structuredContent: Record<string, unknown> = { ...response };
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "list_calculator_summons",
    {
      title: "計算機対応召喚石一覧",
      description:
        "選択式編成エディタとダメージ計算機が現在マスターデータを解決できる召喚石・加護の一覧を取得する。編成JSONを作る前に利用する。",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      const response = createSelectableSummonCatalog();
      const structuredContent: Record<string, unknown> = { ...response };
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "list_calculator_weapons",
    {
      title: "計算機対応武器一覧",
      description:
        "選択式編成エディタとダメージ計算機が現在マスターデータを解決できる武器・スキルの一覧を取得する。編成JSONを作る前に利用する。",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async () => {
      const response = createSelectableWeaponCatalog();
      const structuredContent: Record<string, unknown> = { ...response };
      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "calculate_normal_attack_damage",
    {
      title: "通常攻撃ダメージ計算",
      description:
        "CalculatorDeckConfig v1、敵属性・防御値、船炉や大事なもの等の倍率から、通常攻撃本体・追撃・合計の101乱数パターンにおける最小、最大、期待値を計算する。結果は暫定式で、上限処理は未実装。",
      inputSchema: {
        schemaVersion: z.literal(1).describe("計算リクエスト形式。現在は1のみ"),
        calculationModel: z
          .enum(["article-2026-07", "defense-first-provisional", "article-2026-07-experimental"])
          .optional()
          .describe("省略時は記事モデル。防御先行モデルと旧実験名も比較・互換用に指定可能"),
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
