import { z } from "zod";
import { parseBattleStartResponse } from "./battleStartParser.js";
import { convertDeckResponseToCalculatorDeckConfig } from "./calculatorDeckConfig.js";
import { parseDeckResponse } from "./deckParser.js";
import { importProtagonistLimitBonuses } from "./protagonistLimitBonusImport.js";
import { importCharacterLimitBonuses } from "./characterNormalAttack.js";

type RecordValue = Record<string, unknown>;
type DamageKind = "normal" | "charge" | "ability" | "turn-end";

const exportSchema = z.object({
  apiCalls: z.array(z.object({
    url: z.string(), timestamp: z.number().finite(), body: z.unknown(),
  })).max(10_000),
});

function record(value: unknown): RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue : {};
}

function numeric(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return undefined;
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : undefined;
}

/** Walk only actual damage/heal lists. Totals and split digits are display summaries. */
function values(value: unknown): RecordValue[] {
  if (Array.isArray(value)) return value.flatMap(values);
  const item = record(value);
  if (numeric(item.value) !== undefined) return [item];
  if (item.damage !== undefined) return values(item.damage);
  // PHP-style sparse arrays are serialized as objects (e.g. {"2": [...]}).
  return Object.entries(item).filter(([key]) => /^\d+$/.test(key)).flatMap(([, nested]) => values(nested));
}

export interface RecordedBattlePacket {
  turn: number;
  kind: DamageKind | "heal";
  actorPosition?: number;
  actionName?: string;
  targetSide: "enemy" | "party";
  targetPosition: number;
  value: number;
  elementCode?: string;
  critical?: boolean;
  concurrentAttackIndex?: number;
  hitIndex?: number;
  hpAfter?: number;
  sequence?: number;
  resultIndex?: number;
  normalActionIndex?: number;
  /** Explicit ability owner, including turn-end reactions. */
  sourceActorPosition?: number;
}

export interface RecordedEventLocation {
  sequence: number;
  resultIndex: number;
  elapsedMilliseconds: number;
}

export interface RecordedConditionSnapshot extends RecordedEventLocation {
  targetSide: "enemy" | "party";
  targetPosition: number;
  kinds: Array<"buff" | "debuff">;
  effects: Array<{ kind: "buff" | "debuff"; statusId: string; personalStatusId?: string; expiresBeforeTurn?: number }>;
}

function conditionSnapshot(value: unknown, targetSide: "enemy" | "party", targetPosition: number,
  location: RecordedEventLocation): RecordedConditionSnapshot {
  const condition = record(value);
  const flatten = (input: unknown): RecordValue[] => {
    if (Array.isArray(input)) return input.flatMap(flatten);
    const entry = record(input);
    return entry.status !== undefined ? [entry] : Object.values(entry).flatMap(flatten);
  };
  const statusId = (input: unknown) => typeof input === "string" && /^\d+(?:_\d+)*$/.test(input) && input.length <= 64 ? input : undefined;
  return { ...location, targetSide, targetPosition, kinds: (["buff", "debuff"] as const).filter((kind) => Object.hasOwn(condition, kind)),
    effects: (["buff", "debuff"] as const).flatMap((kind) =>
    flatten(condition[kind]).flatMap((effect) => {
      const id = statusId(effect.status);
      return id === undefined ? [] : [{ kind, statusId: id,
        personalStatusId: statusId(effect.personal_status),
        expiresBeforeTurn: numeric(kind === "buff" ? effect.personal_buff_end_turn : effect.personal_debuff_end_turn),
      }];
    })) };
}

export interface RecordedBattleTurn {
  turn: number;
  damage: number;
  enemyHealing: number;
  damageByKind: Record<DamageKind, number>;
  damageByActor: Record<string, number>;
  normalActions: Array<RecordedEventLocation & { actorPosition: number; hits: number; actionIndex: number }>;
  packets: RecordedBattlePacket[];
  conditionEvents: RecordedConditionSnapshot[];
  abilityActivations: Array<RecordedEventLocation & { actorPosition?: number; name?: string; sourceSummonId?: string }>;
}

/** Offline observation trace for comparison, not a predictive combat model. */
export function parseRecordedBattleExports(inputs: unknown[]) {
  const calls = inputs.flatMap((input) => exportSchema.parse(input).apiCalls)
    .map((call) => ({
      path: new URL(call.url).pathname,
      time: call.timestamp,
      body: typeof call.body === "string" ? JSON.parse(call.body) as unknown : call.body,
    })).sort((a, b) => a.time - b.time);
  const starts = calls.filter((call) => /\/rest\/raid\/start\.json$/.test(call.path));
  if (starts.length !== 1) throw new Error("Exactly one battle start is required; separate recordings of different battles.");
  const start = starts[0];
  const rawStart = record(start.body);
  const battle = parseBattleStartResponse(start.body);
  // Friend status is irrelevant to the observation benchmark.
  if (battle.supportSummon) delete battle.supportSummon.isFriend;
  const deckCall = calls.filter((call) => call.time <= start.time && record(call.body).deck).at(-1);
  const parsedDeck = deckCall ? parseDeckResponse(deckCall.body) : undefined;
  const deckConfig = deckCall ? convertDeckResponseToCalculatorDeckConfig(deckCall.body) : undefined;
  if (deckConfig) delete deckConfig.name;
  const limitBonusCall = calls.filter((call) => call.time <= start.time
    && new RegExp(`/zenith/bonus_list/${deckConfig?.protagonist.jobId}$`).test(call.path)).at(-1);
  if (deckConfig && limitBonusCall) Object.assign(deckConfig.protagonist, importProtagonistLimitBonuses(limitBonusCall.body));
  const characterLimitBonusesImported: number[] = [];
  for (const character of deckConfig?.characters ?? []) {
    const call = calls.filter((call) => call.time <= start.time
      && call.path === `/npczenith/bonus_list/${character.characterId}`).at(-1);
    if (!call) continue;
    character.limitBonuses = importCharacterLimitBonuses(call.body);
    characterLimitBonusesImported.push(character.slot);
  }
  const displayedDamageInfo = parsedDeck?.displayedDamageInfo;
  const jobNormalAttackDamagePercent = (parsedDeck?.protagonist.job?.damageModifiers ?? [])
    .filter((effect) => effect.stage === "normal-attack-damage")
    .reduce((sum, effect) => sum + effect.amountPercent, 0);
  const rawParty = record(rawStart.player).param;
  const actors = (Array.isArray(rawParty) ? rawParty : []).map((value, position) => {
    const actor = record(value);
    const masterId = typeof actor.pid === "string" && /^\d{10}$/.test(actor.pid) ? actor.pid : undefined;
    const character = deckConfig?.characters.find((entry) => entry.characterId === masterId);
    return {
      position,
      ...(position === 0 || masterId === undefined ? {} : { masterId }),
      name: position === 0 ? "主人公" : character?.nameHint ?? `キャラクター${position}`,
      maxHp: numeric(actor.hpmax),
      initialHp: numeric(actor.hp),
      initialCharge: numeric(actor.recast),
    };
  });
  const initialLocation = { sequence: -1, resultIndex: -1, elapsedMilliseconds: 0 };
  const initialConditions = [
    ...(Array.isArray(rawParty) ? rawParty : []).map((actor, position) =>
      conditionSnapshot(record(actor).condition, "party", position, initialLocation)),
    ...(Array.isArray(record(rawStart.boss).param) ? record(rawStart.boss).param as unknown[] : []).map((enemy, position) =>
      conditionSnapshot(record(enemy).condition, "enemy", position, initialLocation)),
  ];
  const turns: RecordedBattleTurn[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];
  const enemyHp = new Map(battle.enemies.map((enemy) => [enemy.slot - 1, enemy.currentHp]));
  let duplicateResultCount = 0;
  let expectedTurn = battle.turn ?? 1;
  let hpMismatchCount = 0;
  let resultIndex = 0;
  let normalActionIndex = 0;
  for (const call of calls.filter((entry) => entry.time >= start.time && /\/rest\/raid\/(normal_attack|ability|summon)_result\.json$/.test(entry.path))) {
    const body = record(call.body);
    // Only identical recorded calls are duplicates. A reused ability can
    // legitimately return the same body again on a later turn.
    const signature = JSON.stringify([call.path, call.time, body]);
    if (seen.has(signature)) { duplicateResultCount += 1; continue; }
    seen.add(signature);
    const scenario = Array.isArray(body.scenario) ? body.scenario.map(record) : [];
    const nextTurn = numeric(scenario.find((entry) => entry.cmd === "turn_change")?.turn);
    const turn = nextTurn === undefined ? expectedTurn : nextTurn - 1;
    if (turn !== expectedTurn) warnings.push(`Turn gap: expected ${expectedTurn}, found ${turn}.`);
    const result = turns.at(-1)?.turn === turn ? turns.at(-1)! : {
      turn, damage: 0, enemyHealing: 0,
      damageByKind: { normal: 0, charge: 0, ability: 0, "turn-end": 0 },
      damageByActor: {}, normalActions: [], packets: [], conditionEvents: [], abilityActivations: [],
    } as RecordedBattleTurn;
    if (turns.at(-1) !== result) turns.push(result);
    let abilityActor: number | undefined;
    let actionName: string | undefined;
    let endingTurn = false;
    let normalAction: RecordedBattleTurn["normalActions"][number] | undefined;
    for (const [sequence, command] of scenario.entries()) {
      const location = { sequence, resultIndex, elapsedMilliseconds: call.time - start.time };
      if (command.cmd === "condition" && (command.to === "boss" || command.to === "player")) {
        result.conditionEvents.push(conditionSnapshot(command.condition, command.to === "boss" ? "enemy" : "party",
          numeric(command.pos) ?? 0, location));
      }
      if (command.cmd === "turn") { endingTurn = true; abilityActor = undefined; actionName = undefined; }
      if (command.cmd === "ability") {
        abilityActor = numeric(command.pos);
        actionName = typeof command.name === "string" && command.name ? command.name : undefined;
        result.abilityActivations.push({ ...location, actorPosition: abilityActor, name: actionName });
      }
      // Other Self is an unnamed ability followed by a named window effect.
      // Match the public summon effect as well as the name; shared debuff icons
      // do not identify their source or strength.
      if (command.cmd === "windoweffect" && abilityActor === 0 && command.name === "他化自在"
        && command.kind === "ab_all_2040448000_01_hit2") {
        result.abilityActivations.push({ ...location, actorPosition: 0, name: "他化自在", sourceSummonId: "2040448000" });
      }
      if (command.cmd === "normal_attack_start" && command.from === "player") {
        normalAction = { ...location, actorPosition: numeric(command.num) ?? 0, hits: 0, actionIndex: normalActionIndex++ };
        result.normalActions.push(normalAction);
        abilityActor = undefined; actionName = undefined;
      }
      if (command.cmd === "normal_attack_end") normalAction = undefined;
      const isNormal = command.cmd === "attack";
      const isCharge = command.cmd === "special" || command.cmd === "special_npc";
      // Enemy specials carry authoritative post-hit HP in list, just like normal attacks.
      const isEnemySpecial = command.cmd === "super" && command.target === "player";
      const isDamage = command.cmd === "damage" || command.cmd === "loop_damage";
      const isHeal = command.cmd === "heal";
      if (!isNormal && !isCharge && !isEnemySpecial && !isDamage && !isHeal) continue;
      const targetSide = isNormal
        ? command.from === "player" ? "enemy" : "party"
        : isEnemySpecial ? "party" : (isCharge ? command.target === "boss" : command.to === "boss") ? "enemy" : "party";
      if (isNormal && normalAction && targetSide === "enemy") normalAction.hits += 1;
      const kind = isHeal ? "heal" : isNormal ? "normal" : isCharge ? "charge" : endingTurn ? "turn-end" : "ability";
      for (const hit of values(isNormal ? command.damage : command.list)) {
        const amount = numeric(hit.value)!;
        if (amount < 0 || !Number.isSafeInteger(amount)) throw new Error("Damage/healing must be a non-negative safe integer.");
        const packet: RecordedBattlePacket = {
          sequence, resultIndex, normalActionIndex: isNormal ? normalAction?.actionIndex : undefined,
          sourceActorPosition: targetSide !== "enemy" || isHeal ? undefined : isNormal || isCharge ? numeric(command.pos) : abilityActor,
          turn, kind, targetSide, targetPosition: numeric(hit.pos) ?? 0, value: amount,
          actorPosition: targetSide !== "enemy" || isHeal || kind === "turn-end" ? undefined
            : isNormal || isCharge ? numeric(command.pos) : abilityActor,
          actionName: (isCharge || isEnemySpecial) && typeof command.name === "string" ? command.name : actionName,
          elementCode: hit.attr !== undefined || hit.color !== undefined ? String(hit.attr ?? hit.color) : undefined,
          concurrentAttackIndex: numeric(hit.concurrent_attack_count),
          ...(typeof hit.critical === "boolean" ? { critical: hit.critical } : {}),
          hitIndex: numeric(hit.attack_count ?? hit.attack_num), hpAfter: numeric(hit.hp),
        };
        result.packets.push(packet);
        if (targetSide !== "enemy") continue;
        if (kind === "heal") result.enemyHealing += amount;
        else {
          result.damage += amount;
          result.damageByKind[kind] += amount;
          const actorKey = packet.actorPosition === undefined ? "unknown" : String(packet.actorPosition);
          result.damageByActor[actorKey] = (result.damageByActor[actorKey] ?? 0) + amount;
        }
        const before = enemyHp.get(packet.targetPosition);
        if (before !== undefined && packet.hpAfter !== undefined) {
          const maxHp = battle.enemies.find((enemy) => enemy.slot === packet.targetPosition + 1)?.maxHp ?? Infinity;
          const expectedHp = kind === "heal" ? Math.min(maxHp, before + amount) : Math.max(0, before - amount);
          if (expectedHp !== packet.hpAfter) hpMismatchCount += 1;
        }
        if (packet.hpAfter !== undefined) enemyHp.set(packet.targetPosition, packet.hpAfter);
      }
    }
    if (nextTurn !== undefined) expectedTurn = nextTurn;
    resultIndex += 1;
  }
  if (hpMismatchCount) warnings.push(`${hpMismatchCount} packets do not reconcile with the recorded enemy HP; inspect before using as reference.`);
  return {
    schemaVersion: 1 as const, kind: "recorded-battle-observation" as const,
    deckConfig, displayedDamageInfo, battle, actors, turns, protagonistLimitBonusesImported: limitBonusCall !== undefined,
    characterLimitBonusesImported,
    jobNormalAttackDamagePercent, initialConditions,
    summary: {
      turnCount: turns.length, totalDamage: turns.reduce((sum, turn) => sum + turn.damage, 0),
      normalActionCount: turns.reduce((sum, turn) => sum + turn.normalActions.length, 0),
      packetCount: turns.reduce((sum, turn) => sum + turn.packets.length, 0),
      duplicateResultCount, hpMismatchCount,
    }, warnings,
  };
}
