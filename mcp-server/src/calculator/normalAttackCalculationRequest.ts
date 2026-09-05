import { z } from "zod";
import { resolveCalculatorDeckConfig } from "./calculatorDeckResolver.js";
import {
  calculateNormalAttackDamage,
  type NormalAttackDamageResult,
} from "./normalAttackDamageCalculator.js";
import type {
  AccountBonusSnapshot,
  BattleSnapshot,
  DamageCalculationInput,
  DamageModifier,
} from "./types.js";

const optionalPercent = z.number().finite().min(0).max(1000).optional();

const requestSchema = z
  .object({
    schemaVersion: z.literal(1),
    deckConfig: z.unknown(),
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
        allElementAttackPercent: optionalPercent,
        elementAttackPercent: optionalPercent,
        shipAttackPercent: optionalPercent,
        furnaceAttackPercent: optionalPercent,
        jobNormalAttackDamagePercent: optionalPercent,
        damageDealtPercent: optionalPercent,
        targetElementDamagePercent: optionalPercent,
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
  })
  .strict();

export type NormalAttackCalculationRequest = z.infer<typeof requestSchema>;

export interface NormalAttackCalculationResponse {
  schemaVersion: 1;
  deckResolutionIssues: ReturnType<typeof resolveCalculatorDeckConfig>["issues"];
  result: NormalAttackDamageResult;
}

function modifier(
  stage: DamageModifier["stage"],
  amountPercent: number | undefined,
  sourceId: string,
  sourceName: string,
  elementCode?: string,
  targetElementCode?: string,
): DamageModifier[] {
  if (amountPercent === undefined || amountPercent === 0) return [];
  return [
    {
      stage,
      amountPercent,
      sourceType: "user-input",
      sourceId,
      sourceName,
      elementCode,
      targetElementCode,
      verificationStatus: "下書き",
    },
  ];
}

/** Shared, side-effect-free facade used by the local Web UI and the MCP tool. */
export function calculateNormalAttackFromRequest(input: unknown): NormalAttackCalculationResponse {
  const request = requestSchema.parse(input);
  const resolution = resolveCalculatorDeckConfig(request.deckConfig);
  const protagonistElementCode = resolution.deck.protagonist.elementCode;
  const accountModifiers: DamageModifier[] = [
    ...modifier(
      "elemental-attack",
      request.modifiers.allElementAttackPercent,
      "manual-all-element-attack",
      "全属性攻撃力（手入力）",
    ),
    ...modifier(
      "elemental-attack",
      request.modifiers.elementAttackPercent,
      "manual-element-attack",
      "属性攻撃力（手入力）",
      protagonistElementCode,
    ),
    ...modifier(
      "damage-dealt",
      request.modifiers.damageDealtPercent,
      "manual-damage-dealt",
      "与ダメージ（手入力）",
      protagonistElementCode,
    ),
    ...modifier(
      "target-element-damage",
      request.modifiers.targetElementDamagePercent,
      "manual-target-element-damage",
      "対属性与ダメージ（手入力）",
      protagonistElementCode,
      request.enemy.elementCode,
    ),
  ];
  const accountBonuses: AccountBonusSnapshot | undefined =
    accountModifiers.length === 0
      ? undefined
      : { schemaVersion: 1, modifiers: accountModifiers, issues: [] };

  if ((request.modifiers.jobNormalAttackDamagePercent ?? 0) > 0) {
    resolution.deck.protagonist.job ??= {
      masterId: "manual-job",
      weaponKindCodes: [],
    };
    resolution.deck.protagonist.job.damageModifiers ??= [];
    resolution.deck.protagonist.job.damageModifiers.push(
      ...modifier(
        "normal-attack-damage",
        request.modifiers.jobNormalAttackDamagePercent,
        "manual-job-normal-attack-damage",
        "ジョブ通常攻撃与ダメージ（手入力）",
        protagonistElementCode,
      ),
    );
  }

  const battle: BattleSnapshot = {
    schemaVersion: 1,
    enemies: [
      {
        slot: 1,
        enemyId: request.enemy.id ?? "manual-enemy",
        nameJp: request.enemy.name,
        elementCode: request.enemy.elementCode,
        defense: request.enemy.defense,
        defenseSource: "user-override",
      },
    ],
    enemyPassiveEffectCount: 0,
    fieldEffectCount: 0,
  };
  const calculationInput: DamageCalculationInput = {
    schemaVersion: 1,
    deck: resolution.deck,
    battle,
    targetEnemySlot: 1,
    accountBonuses,
    crewModifiers: {
      shipAttackPercent: request.modifiers.shipAttackPercent,
      furnaceAttackPercent: request.modifiers.furnaceAttackPercent,
    },
  };

  return {
    schemaVersion: 1,
    deckResolutionIssues: resolution.issues,
    result: calculateNormalAttackDamage(calculationInput, {
      multiplierMin: request.random?.minimum,
      multiplierMax: request.random?.maximum,
      multiplierStep: request.random?.step,
    }),
  };
}

export function parseNormalAttackCalculationRequest(input: unknown): NormalAttackCalculationRequest {
  return requestSchema.parse(input);
}
