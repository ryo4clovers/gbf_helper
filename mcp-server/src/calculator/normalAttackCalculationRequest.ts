import { z } from "zod";
import { calculateBattleHp } from "./battleHpCalculator.js";
import { resolveCalculatorDeckConfig } from "./calculatorDeckResolver.js";
import { parseCalculatorDeckConfig } from "./calculatorDeckConfig.js";
import { resolveAbilityBonuses } from "./abilityBonusResolver.js";
import { resolveBattleSupportSummon } from "./summonCatalog.js";
import {
  calculateNormalAttackDamage,
  type NormalAttackDamageResult,
  type NormalAttackDamageOptions,
} from "./normalAttackDamageCalculator.js";
import type {
  AccountBonusSnapshot,
  BattleSnapshot,
  DamageCalculationInput,
  DamageModifier,
} from "./types.js";

const optionalPercent = z.number().finite().min(0).max(1000).optional();

export const normalAttackCalculationRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    calculationModel: z
      .enum(["article-2026-07", "defense-first-provisional", "article-2026-07-experimental"])
      .optional(),
    deckConfig: z.record(z.unknown()).describe("CalculatorDeckConfig v1"),
    attacker: z.object({
      characterSlot: z.number().int().min(1).max(3),
      currentHpPercent: z.number().finite().min(1).max(100).optional(),
      coupledConfectionActive: z.boolean().optional(),
      artifactStartBuffs: z.object({ attackUp: z.boolean(), damageCapUp: z.boolean() }).strict().optional(),
    }).strict().optional().describe("前衛キャラの単発通常攻撃。シンダラ(バレンタイン)/サリエル/浴衣イルザのアビリティ未使用時に対応。シンダラは双子緒虎の有無を明示"),
    protagonistCurrentHpPercent: z.number().finite().min(1).max(100).default(100),
    mythicalLancerLevel: z.number().int().min(0).max(5).optional().describe("攻撃時点の神伝の槍手Lv。省略時は開始時の槍/斧本数"),
    battleEffects: z.object({
      criticalDamageBonusPercent: optionalPercent,
      damageCapPercent: optionalPercent,
      abilityNormalPursuitPercent: optionalPercent,
      enemyDefenseDownPercent: z.number().finite().min(0).max(100).optional(),
      enemyDefenseDownBeyondCapPercent: z.number().finite().min(0).max(99).optional(),
      enemySupplementalDamage: z.number().finite().min(0).max(1_000_000).optional(),
      supportSkillSupplementalDamage: z.number().finite().min(0).max(1_000_000).optional(),
      normalAttackSupplementalDamage: z.number().finite().min(0).max(1_000_000).optional(),
      enemyDamageTakenAmplificationPercent: z.number().finite().min(0).max(1_000).optional(),
    }).strict().optional().describe("攻撃時点で有効な敵弱体・与ダメージ加算。一般防御DOWNは50%上限、サポアビ与ダメージは主人公と最大値を採用する下書きモデル"),
    supportSummon: z
      .object({
        summonId: z.string().min(1),
        nameHint: z.string().min(1).max(100).optional(),
      })
      .strict()
      .optional(),
    enemy: z
      .object({
        id: z.string().min(1).max(100).optional(),
        name: z.string().min(1).max(100).optional(),
        elementCode: z.enum(["1", "2", "3", "4", "5", "6"]),
        defense: z.number().finite().positive().max(10000),
        attack: z.number().finite().nonnegative().max(1_000_000_000).default(10_000),
        maxHp: z.number().int().positive().optional(),
      })
      .strict(),
    modifiers: z
      .object({
        divineStampBookEnabled: z.boolean().optional(),
        allElementAttackPercent: optionalPercent,
        elementAttackPercent: optionalPercent,
        shipAttackPercent: optionalPercent,
        furnaceAttackPercent: optionalPercent,
        jobNormalAttackDamagePercent: optionalPercent,
        damageDealtPercent: optionalPercent,
        targetElementDamagePercent: optionalPercent,
        damageCapPercent: optionalPercent,
        normalAttackDamageCapPercent: optionalPercent,
        extinctionCrestDoubleAttackRatePercent: optionalPercent,
        extinctionCrestTripleAttackRatePercent: optionalPercent,
        chainBurstPerformancePercent: optionalPercent,
        chargeDamagePercent: optionalPercent,
        chargeDamageCapPercent: optionalPercent,
        abilityDamagePercent: optionalPercent.describe("大事なもの等の共通追加補正。主人公LB・コンプリート分を含めない"),
        abilityDamageLimitBonusPercent: optionalPercent.describe("主人公アビダメLBの置換値。キャラには適用しない"),
        abilityDamageCapPercent: optionalPercent.describe("大事なもの等の共通追加上限。主人公LB・コンプリート分を含めない"),
        abilityDamageCapLimitBonusPercent: optionalPercent.describe("主人公アビ上限LBの置換値。キャラには適用しない"),
        protagonistDefensePercent: optionalPercent,
        incomingElementalDamageReductionPercents: z.array(z.number().finite().min(0).max(100)).max(20).optional(),
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

export type NormalAttackCalculationRequest = z.input<typeof normalAttackCalculationRequestSchema>;

export interface NormalAttackCalculationResponse {
  schemaVersion: 1;
  battleHp: ReturnType<typeof calculateBattleHp>;
  characterStats: ReturnType<typeof resolveCalculatorDeckConfig>["characterStats"];
  deckResolutionIssues: ReturnType<typeof resolveCalculatorDeckConfig>["issues"];
  result: NormalAttackDamageResult;
  supportSummon?: {
    summonId: string;
    name: string;
    callableFromTurn: 1;
    statsIncluded: false;
    subAuraIncluded: false;
    mainOnlyAuraEffectsIncluded: false;
  };
}

function modifier(
  stage: DamageModifier["stage"],
  amountPercent: number | undefined,
  sourceId: string,
  sourceName: string,
  elementCode?: string,
  targetElementCode?: string,
  condition?: DamageModifier["condition"],
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
      condition,
      verificationStatus: "下書き",
    },
  ];
}

/** Shared, side-effect-free facade used by the local Web UI and the MCP tool. */
export function resolveDamageCalculationRequest(input: unknown) {
  const request = normalAttackCalculationRequestSchema.parse(input);
  const battle: BattleSnapshot = {
    schemaVersion: 1,
    enemies: [
      {
        slot: 1,
        enemyId: request.enemy.id ?? "manual-enemy",
        nameJp: request.enemy.name,
        elementCode: request.enemy.elementCode,
        defense: request.enemy.defense,
        maxHp: request.enemy.maxHp,
        defenseSource: "user-override",
      },
    ],
    enemyPassiveEffectCount: 0,
    fieldEffectCount: 0,
    supportSummon:
      request.supportSummon === undefined
        ? undefined
        : {
            masterId: request.supportSummon.summonId,
            name: request.supportSummon.nameHint,
          },
  };
  const supportSummon = resolveBattleSupportSummon(battle);
  const resolution = resolveCalculatorDeckConfig(request.deckConfig, supportSummon);
  const protagonistElementCode = request.attacker
    ? resolution.deck.characters.find((character) => character.slot === request.attacker!.characterSlot)?.elementCode ?? "6"
    : resolution.deck.protagonist.elementCode;
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
    ...modifier("damage-cap", request.modifiers.damageCapPercent, "memorial-item-9014", "オプリメル・フラゴル"),
    ...modifier(
      "normal-attack-damage-cap",
      request.modifiers.normalAttackDamageCapPercent,
      "memorial-item-four-saints",
      "四聖の玲瓏佩・龍心",
      protagonistElementCode,
    ),
  ];
  const accountBonuses: AccountBonusSnapshot | undefined =
    accountModifiers.length === 0
      ? undefined
      : { schemaVersion: 1, modifiers: accountModifiers, issues: [] };

  if (request.modifiers.jobNormalAttackDamagePercent !== undefined) {
    resolution.deck.protagonist.job ??= {
      masterId: "manual-job",
      weaponKindCodes: [],
    };
    resolution.deck.protagonist.job.damageModifiers ??= [];
    // The explicit account completion input replaces the imported value.
    resolution.deck.protagonist.job.damageModifiers = resolution.deck.protagonist.job.damageModifiers.filter(
      (effect) => effect.sourceId !== "my_job_class_if:final_attack_rise_plus",
    );
    resolution.deck.protagonist.job.damageModifiers.push(
      ...modifier(
        "normal-attack-damage",
        request.modifiers.jobNormalAttackDamagePercent,
        "manual-job-normal-attack-damage",
        "ジョブ通常攻撃与ダメージ（手入力）",
        protagonistElementCode,
        undefined,
        "non-class-v",
      ),
    );
  }

  resolution.deck.protagonist.memorialDoubleAttackRatePercent =
    request.modifiers.extinctionCrestDoubleAttackRatePercent;
  resolution.deck.protagonist.memorialTripleAttackRatePercent =
    request.modifiers.extinctionCrestTripleAttackRatePercent;

  const calculationInput: DamageCalculationInput = {
    schemaVersion: 1,
    divineStampBookEnabled: request.modifiers.divineStampBookEnabled,
    deck: resolution.deck,
    attacker: request.attacker,
    battle,
    targetEnemySlot: 1,
    protagonistCurrentHpPercent: request.protagonistCurrentHpPercent,
    mythicalLancerLevel: request.mythicalLancerLevel,
    battleEffects: request.battleEffects,
    accountBonuses,
    crewModifiers: {
      shipAttackPercent: request.modifiers.shipAttackPercent,
      furnaceAttackPercent: request.modifiers.furnaceAttackPercent,
    },
    incomingDamage: {
      enemyAttack: request.enemy.attack,
      defensePercent: request.modifiers.protagonistDefensePercent ?? 0,
      elementalDamageReductionPercents: request.modifiers.incomingElementalDamageReductionPercents ?? [],
    },
    abilityDamage: resolveAbilityBonuses(parseCalculatorDeckConfig(request.deckConfig).protagonist,
      resolution.protagonistAbilityCompletion, request.modifiers, request.attacker !== undefined),
  };

  return { request, calculationInput, resolution, supportSummon };
}

export function calculateNormalAttackFromRequest(input: unknown,
  diagnostics: Pick<NormalAttackDamageOptions, "compareDestructionPursuitRounding"> = {}): NormalAttackCalculationResponse {
  const { request, calculationInput, resolution, supportSummon } = resolveDamageCalculationRequest(input);
  return {
    schemaVersion: 1,
    deckResolutionIssues: resolution.issues,
    characterStats: resolution.characterStats,
    battleHp: calculateBattleHp(resolution.deck, supportSummon, request.modifiers.divineStampBookEnabled),
    result: calculateNormalAttackDamage(calculationInput, {
      ...diagnostics,
      baseDamageModel: request.calculationModel,
      multiplierMin: request.random?.minimum,
      multiplierMax: request.random?.maximum,
      multiplierStep: request.random?.step,
    }),
    supportSummon:
      supportSummon === undefined
        ? undefined
        : {
            summonId: supportSummon.masterId,
            name: supportSummon.name,
            callableFromTurn: 1,
            statsIncluded: false,
            subAuraIncluded: false,
            mainOnlyAuraEffectsIncluded: false,
          },
  };
}

export function parseNormalAttackCalculationRequest(input: unknown) {
  return normalAttackCalculationRequestSchema.parse(input);
}
