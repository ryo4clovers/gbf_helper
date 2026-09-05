import { z } from "zod";
import type { BattleSnapshot, EnemyTarget } from "./types.js";

type JsonRecord = Record<string, unknown>;

const battleStartSchema = z
  .object({
    quest_id: z.unknown().optional(),
    turn: z.unknown().optional(),
    multi: z.unknown().optional(),
    is_trialbattle: z.unknown().optional(),
    battle: z
      .object({
        total: z.unknown().optional(),
        count: z.unknown().optional(),
      })
      .passthrough()
      .optional(),
    boss: z
      .object({
        param: z.array(z.record(z.unknown())),
      })
      .passthrough(),
    enemy_passive_effect: z.array(z.unknown()).optional(),
    field_effect: z.array(z.unknown()).optional(),
    supporter: z.record(z.unknown()).optional(),
  })
  .passthrough();

function asRecord(value: unknown): JsonRecord | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as JsonRecord;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function optionalId(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const id = optionalString(value);
  if (id === undefined) throw new Error(`${path} must be a string or finite number`);
  return id;
}

function optionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new Error(`${path} must be a finite number or numeric string`);
  return parsed;
}

function optionalBoolean(value: unknown, path: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === 0 || value === "0") return false;
  if (value === 1 || value === "1") return true;
  throw new Error(`${path} must be a boolean or 0/1`);
}

function normalizeEnemy(raw: JsonRecord, index: number): EnemyTarget {
  const path = `boss.param.${index}`;
  const enemyId = optionalId(raw.enemy_id, `${path}.enemy_id`);
  if (enemyId === undefined) throw new Error(`${path}.enemy_id is required`);
  const localizedName = asRecord(raw.name);

  return {
    slot: optionalNumber(raw.number, `${path}.number`) ?? index + 1,
    enemyId,
    nameJp: optionalString(localizedName?.ja ?? raw.name),
    nameEn: optionalString(localizedName?.en),
    level: optionalNumber(raw.Lv, `${path}.Lv`),
    elementCode: optionalString(raw.attr),
    elementName: optionalString(raw.attribute),
    currentHp: optionalNumber(raw.hp, `${path}.hp`),
    maxHp: optionalNumber(raw.hpmax, `${path}.hpmax`),
    alive: optionalBoolean(raw.alive, `${path}.alive`),
    chargeDiamonds: optionalNumber(raw.recast, `${path}.recast`),
    maxChargeDiamonds: optionalNumber(raw.recastmax, `${path}.recastmax`),
    hasModeGauge: optionalBoolean(raw.modeflag, `${path}.modeflag`),
    modeGauge: optionalNumber(raw.modegauge, `${path}.modegauge`),
  };
}

/**
 * Normalizes the enemy and battle state from a passively captured battle-start
 * response. Account and raid-instance identifiers are intentionally discarded.
 */
export function parseBattleStartResponse(input: unknown): BattleSnapshot {
  const parsed = battleStartSchema.parse(input);

  return {
    schemaVersion: 1,
    questId: optionalId(parsed.quest_id, "quest_id"),
    turn: optionalNumber(parsed.turn, "turn"),
    isMultiBattle: optionalBoolean(parsed.multi, "multi"),
    isTrialBattle: optionalBoolean(parsed.is_trialbattle, "is_trialbattle"),
    waveCount: optionalNumber(parsed.battle?.total, "battle.total"),
    currentWave: optionalNumber(parsed.battle?.count, "battle.count"),
    enemies: parsed.boss.param.map(normalizeEnemy),
    enemyPassiveEffectCount: parsed.enemy_passive_effect?.length ?? 0,
    fieldEffectCount: parsed.field_effect?.length ?? 0,
    supportSummon:
      parsed.supporter === undefined
        ? undefined
        : {
            masterId: optionalString(parsed.supporter.image_id)?.replace(/_.+$/, ""),
            name: optionalString(parsed.supporter.name),
            elementCode: optionalString(parsed.supporter.attribute),
            auraName: optionalString(parsed.supporter.protection_name),
            auraDescription: optionalString(parsed.supporter.protection)?.replace(/<br\s*\/?>/gi, " "),
            isFriend: optionalBoolean(parsed.supporter.friend, "supporter.friend"),
          },
  };
}
