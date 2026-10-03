import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateNormalAttackFromRequest, normalAttackCalculationRequestSchema } from "../calculator/normalAttackCalculationRequest.js";
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
        "CalculatorDeckConfig v1、敵属性・防御値、船炉・大事なものと攻撃時点のジョブLv・敵弱体から、主人公またはattackerで指定した前衛キャラの通常攻撃本体・自属性追撃・破壊属性追撃を計算する。闇シンダラ・サリエル・浴衣イルザのアビリティ未使用時を下書き接続。未対応のクリティカルLBはエラー。効果の発動や期限は自動進行しない。",
      inputSchema: normalAttackCalculationRequestSchema.shape,
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
