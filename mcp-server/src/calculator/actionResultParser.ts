import { z } from "zod";
import type {
  BattleActionKind,
  BattleActionResult,
  ObservedChainBurst,
  ObservedConditionEvent,
  ObservedDamage,
  ObservedEnemyGauge,
  ObservedHealing,
  ObservedRecoveryEvent,
  ObservedResourceEvent,
  ObservedStatusEffect,
} from "./types.js";

type JsonRecord = Record<string, unknown>;

const actionResultSchema = z
  .object({
    scenario: z.array(z.unknown()),
    status: z
      .object({
        turn: z.unknown().optional(),
        enemy_passive_effect: z.array(z.unknown()).optional(),
      })
      .passthrough(),
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

function localizedName(value: unknown): string | undefined {
  const record = asRecord(value);
  return optionalString(record?.ja ?? record?.en ?? value);
}

function flattenRecords(value: unknown, output: JsonRecord[] = []): JsonRecord[] {
  if (Array.isArray(value)) {
    for (const item of value) flattenRecords(item, output);
  } else {
    const record = asRecord(value);
    if (record !== undefined) output.push(record);
  }
  return output;
}

/**
 * Normal attacks use two observed shapes: the first swing is an array, while
 * later swings can be stored below numeric object keys such as `{ "1": [...] }`.
 */
function flattenAttackDamage(value: unknown, output: JsonRecord[] = []): JsonRecord[] {
  if (Array.isArray(value)) {
    for (const item of value) flattenAttackDamage(item, output);
    return output;
  }

  const record = asRecord(value);
  if (record === undefined) return output;
  if ("value" in record) {
    output.push(record);
    return output;
  }

  for (const nested of Object.values(record)) flattenAttackDamage(nested, output);
  return output;
}

function detectActionKind(events: JsonRecord[]): BattleActionKind {
  const commands = new Set(events.map((event) => optionalString(event.cmd)));
  const hasChargeAttack = commands.has("special") || commands.has("special_npc");
  if (commands.has("attack") && hasChargeAttack) return "mixed-attack";
  if (hasChargeAttack) return "charge-attack";
  if (commands.has("attack")) return "normal-attack";
  if (commands.has("summon")) return "summon";
  if (commands.has("ability")) return "ability";
  if (commands.has("rematch")) return "recovery-item";
  return "unknown";
}

function findActionName(events: JsonRecord[], actionKind: BattleActionKind): string | undefined {
  const command =
    actionKind === "summon"
      ? "summon"
      : actionKind === "ability"
        ? "ability"
        : actionKind === "charge-attack"
          ? "special"
          : undefined;
  if (command === undefined) return undefined;
  const event = events.find((candidate) => candidate.cmd === command);
  return localizedName(event?.name);
}

function normalizeDamageRecord(
  record: JsonRecord,
  sequence: number,
  sourceCommand: ObservedDamage["sourceCommand"],
  path: string,
  sourcePosition?: number,
  sourceName?: string,
  hitIndexOverride?: number,
  normalAttackCount?: number,
): ObservedDamage | undefined {
  const value = optionalNumber(record.value, `${path}.value`);
  if (value === undefined) return undefined;

  return {
    sequence,
    sourceCommand,
    sourcePosition,
    sourceName,
    targetPosition: optionalNumber(record.pos, `${path}.pos`),
    elementCode: optionalString(record.attr ?? record.color),
    value,
    remainingHp: optionalNumber(record.hp, `${path}.hp`),
    critical: optionalBoolean(record.critical, `${path}.critical`),
    missed: optionalBoolean(record.miss, `${path}.miss`),
    guarded: optionalBoolean(record.guard, `${path}.guard`),
    hitIndex: optionalNumber(record.attack_num ?? record.attack_count, `${path}.attack_num`) ?? hitIndexOverride,
    concurrentIndex: optionalNumber(record.concurrent_attack_count, `${path}.concurrent_attack_count`),
    normalAttackCount,
    randomAttack: optionalBoolean(record.is_random_attack, `${path}.is_random_attack`),
  };
}

function extractDamage(events: JsonRecord[], chainBursts: ObservedChainBurst[]): ObservedDamage[] {
  const result: ObservedDamage[] = [];
  const chainBurstByDamageSequence = new Map(
    chainBursts
      .filter((event): event is ObservedChainBurst & { damageSequence: number } => event.damageSequence !== undefined)
      .map((event) => [event.damageSequence, event]),
  );
  events.forEach((event, sequence) => {
    const command = optionalString(event.cmd);
    let records: JsonRecord[] = [];
    let sourceCommand: ObservedDamage["sourceCommand"] | undefined;
    let sourcePosition: number | undefined;
    let sourceName: string | undefined;
    let normalAttackCount: number | undefined;
    const hitIndexes: Array<number | undefined> = [];

    if (command === "damage") {
      records = flattenRecords(event.list);
      const chainBurst = chainBurstByDamageSequence.get(sequence);
      sourceCommand = chainBurst === undefined ? "damage" : "chain-burst";
      sourceName = chainBurst?.name;
    } else if (command === "attack") {
      records = flattenAttackDamage(event.damage);
      sourceCommand = "attack";
      sourcePosition = optionalNumber(event.pos, `scenario.${sequence}.pos`);
      normalAttackCount = optionalNumber(event.total_attack_num, `scenario.${sequence}.total_attack_num`);
    } else if (command === "loop_damage") {
      records = flattenRecords(event.list);
      sourceCommand = "loop-damage";
    } else if (command === "special" || command === "special_npc") {
      const specialEntries = flattenRecords(event.list);
      specialEntries.forEach((entry, hitIndex) => {
        flattenRecords(entry.damage).forEach((record) => {
          records.push(record);
          hitIndexes.push(hitIndex);
        });
      });
      sourceCommand = "special";
      sourcePosition = optionalNumber(event.pos, `scenario.${sequence}.pos`);
      sourceName = localizedName(event.name);
    } else if (command === "summon") {
      const summonEntries = flattenRecords(event.list);
      records = summonEntries.flatMap((entry) => flattenRecords(entry.damage));
      sourceCommand = "summon";
      sourceName = localizedName(event.name);
    }

    if (sourceCommand === undefined) return;
    records.forEach((record, index) => {
      const damage = normalizeDamageRecord(
        record,
        sequence,
        sourceCommand,
        `scenario.${sequence}.${index}`,
        sourcePosition,
        sourceName,
        hitIndexes[index],
        normalAttackCount,
      );
      if (damage !== undefined) result.push(damage);
    });
  });
  return result;
}

function sumDamageList(value: unknown, path: string): number {
  return flattenRecords(value).reduce(
    (sum, entry, index) => sum + (optionalNumber(entry.value, `${path}.${index}.value`) ?? 0),
    0,
  );
}

function extractChainBursts(events: JsonRecord[]): ObservedChainBurst[] {
  return events.flatMap((event, sequence) => {
    if (event.cmd !== "chain_cutin") return [];
    let name: string | undefined;
    let effectKind: string | undefined;
    let damageSequence: number | undefined;
    let totalDamage: number | undefined;

    for (let index = sequence + 1; index < events.length; index += 1) {
      const candidate = events[index];
      if (candidate.cmd === "effect" && name === undefined) {
        name = localizedName(candidate.name);
        effectKind = optionalString(candidate.kind);
      }
      if (candidate.cmd === "damage") {
        damageSequence = index;
        totalDamage = sumDamageList(candidate.list, `scenario.${index}.list`);
        break;
      }
      if (["attack", "chain_cutin", "special", "special_npc"].includes(optionalString(candidate.cmd) ?? "")) {
        break;
      }
    }

    return [
      {
        sequence,
        memberCount: optionalNumber(event.chain_num, `scenario.${sequence}.chain_num`),
        name,
        effectKind,
        damageSequence,
        totalDamage,
      },
    ];
  });
}

function extractEnemyGaugeEvents(events: JsonRecord[]): ObservedEnemyGauge[] {
  return events.flatMap((event, sequence) => {
    if (event.cmd !== "boss_gauge") return [];
    return [
      {
        sequence,
        position: optionalNumber(event.pos, `scenario.${sequence}.pos`),
        hp: optionalNumber(event.hp, `scenario.${sequence}.hp`),
        elementCode: optionalString(event.attr),
        chargeDiamonds: optionalNumber(event.recast, `scenario.${sequence}.recast`),
        maxChargeDiamonds: optionalNumber(event.recastmax, `scenario.${sequence}.recastmax`),
      },
    ];
  });
}

function normalizeStatusEffect(
  value: JsonRecord,
  kind: ObservedStatusEffect["kind"],
  path: string,
): ObservedStatusEffect | undefined {
  const statusId = optionalString(value.status);
  if (statusId === undefined) return undefined;
  const [baseId, ...parameters] = statusId.split("_");
  if (baseId.length === 0) throw new Error(`${path}.status has an empty base ID`);

  return {
    kind,
    statusId,
    baseId,
    parameters,
    displayPriority: optionalNumber(value.display_priority, `${path}.display_priority`),
  };
}

function extractConditionEvents(events: JsonRecord[]): ObservedConditionEvent[] {
  return events.flatMap((event, sequence) => {
    if (event.cmd !== "condition") return [];
    const condition = asRecord(event.condition);
    const effects: ObservedStatusEffect[] = [];

    for (const [kind, values] of [
      ["buff", condition?.buff],
      ["debuff", condition?.debuff],
    ] as const) {
      flattenRecords(values).forEach((value, index) => {
        const effect = normalizeStatusEffect(value, kind, `scenario.${sequence}.condition.${kind}.${index}`);
        if (effect !== undefined) effects.push(effect);
      });
    }

    return [
      {
        sequence,
        target: optionalString(event.to),
        targetPosition: optionalNumber(event.pos, `scenario.${sequence}.pos`),
        snapshotIndex: optionalNumber(condition?.num, `scenario.${sequence}.condition.num`),
        effects,
      },
    ];
  });
}

function extractResourceEvents(events: JsonRecord[]): ObservedResourceEvent[] {
  const result: ObservedResourceEvent[] = [];
  events.forEach((event, sequence) => {
    if (event.cmd === "chain_burst_gauge") {
      result.push({
        sequence,
        kind: "chain-burst-gauge",
        value: optionalNumber(event.value, `scenario.${sequence}.value`),
      });
      return;
    }
    if (event.cmd !== "recast") return;
    const target = optionalString(event.to);
    const kind = target === "player" ? "charge-gauge" : target === "boss" ? "charge-diamonds" : "unknown";
    result.push({
      sequence,
      kind,
      target,
      targetPosition: optionalNumber(event.pos, `scenario.${sequence}.pos`),
      value: optionalNumber(event.value, `scenario.${sequence}.value`),
      maxValue: optionalNumber(event.max, `scenario.${sequence}.max`),
    });
  });
  return result;
}

function extractHealing(events: JsonRecord[]): ObservedHealing[] {
  return events.flatMap((event, sequence) => {
    if (event.cmd !== "heal") return [];
    return flattenRecords(event.list).flatMap((entry, index) => {
      const value = optionalNumber(entry.value, `scenario.${sequence}.heal.${index}.value`);
      if (value === undefined) return [];
      return [
        {
          sequence,
          target: optionalString(event.to),
          targetPosition: optionalNumber(entry.pos, `scenario.${sequence}.heal.${index}.pos`),
          value,
          resultingHp: optionalNumber(entry.hp, `scenario.${sequence}.heal.${index}.hp`),
          sourceKind: optionalString(event.kind),
        },
      ];
    });
  });
}

function extractRecoveryEvents(events: JsonRecord[]): ObservedRecoveryEvent[] {
  return events.flatMap((event, sequence) => {
    if (event.cmd !== "rematch") return [];
    const potion = asRecord(event.potion);
    return [
      {
        sequence,
        sourceCommand: "rematch",
        itemCount: optionalNumber(potion?.count, `scenario.${sequence}.potion.count`),
        itemLimitRemaining: optionalNumber(
          potion?.limit_remain,
          `scenario.${sequence}.potion.limit_remain`,
        ),
      },
    ];
  });
}

/**
 * Normalizes ability, normal-attack, and summon result responses into observed
 * damage events. The response's `split` arrays are rendering data, not hits,
 * and are intentionally discarded.
 */
export function parseActionResultResponse(input: unknown): BattleActionResult {
  const parsed = actionResultSchema.parse(input);
  const events = flattenRecords(parsed.scenario);
  const actionKind = detectActionKind(events);
  const chainBursts = extractChainBursts(events);
  const damage = extractDamage(events, chainBursts);

  return {
    schemaVersion: 1,
    actionKind,
    actionName: findActionName(events, actionKind),
    turn: optionalNumber(parsed.status.turn, "status.turn"),
    commands: events.map((event) => optionalString(event.cmd)).filter((cmd): cmd is string => cmd !== undefined),
    damage,
    totalDamage: damage.reduce((sum, item) => sum + item.value, 0),
    enemyGaugeEvents: extractEnemyGaugeEvents(events),
    conditionEvents: extractConditionEvents(events),
    resourceEvents: extractResourceEvents(events),
    recoveryEvents: extractRecoveryEvents(events),
    healing: extractHealing(events),
    chainBursts,
    enemyPassiveEffectCount: parsed.status.enemy_passive_effect?.length ?? 0,
  };
}
