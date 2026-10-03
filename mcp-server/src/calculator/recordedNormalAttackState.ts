import type { BattleDamageEffects } from "./battleDamageEffects.js";
import type { parseRecordedBattleExports, RecordedConditionSnapshot, RecordedEventLocation } from "./recordedBattleParser.js";

const CIDALA_ID = "3040512000";
const SARIEL_ID = "3040611000";
const CIDALA_SOURCE = "https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/436867";
const SARIEL_SOURCE = "https://gbf.wiki/Sariel";
const LANCER_SOURCE = "https://gbf.wiki/Lancer_Origin";
const VERSUSIA_SOURCE = "https://gbf.wiki/Versusia";

export interface RecordedNormalAttackState extends RecordedEventLocation {
  actorPosition: number;
  characterCurrentHpPercent?: number;
  coupledConfectionActive?: boolean;
  artifactStartBuffs?: { attackUp: boolean; damageCapUp: boolean };
  turn: number;
  actionIndex: number;
  mythicalLancerLevel: number;
  levelSource: "recorded-status" | "hit-counter-provisional";
  predictedMythicalLancerLevel: number;
  countedProtagonistHits: number;
  protagonistCurrentHpPercent?: number;
  recordedEnemyStatusIds: string[];
  battleEffects: BattleDamageEffects;
  cidala: {
    defenseStacks: number; supplementalStacks: number;
    defenseExpiresAtMilliseconds?: number; supplementalExpiresAtMilliseconds?: number;
  };
  deathSentenceActive: boolean;
  warnings: string[];
  sources: string[];
  verificationStatus: "下書き";
}

/**
 * Reconstruct only the state needed for the selected actors' single attacks. Damage
 * values never determine effect amounts, levels, or activation/expiry times.
 * This does not predict character actions or synthesize an unrecorded battle.
 */
export function reconstructRecordedNormalAttackStates(
  observation: ReturnType<typeof parseRecordedBattleExports>, initialMythicalLancerLevel: number,
  actorPositions: number[] = [0],
): RecordedNormalAttackState[] {
  if (!Number.isInteger(initialMythicalLancerLevel) || initialMythicalLancerLevel < 0 || initialMythicalLancerLevel > 5) {
    throw new Error("Initial Mythical Lancer level must be in 0..5");
  }
  const lancer = observation.deckConfig?.protagonist.jobId === "190501";
  const front = observation.deckConfig?.characters.filter((character) => character.position === "front") ?? [];
  const actorId = (position?: number) => observation.actors.find((actor) => actor.position === position)?.masterId;
  const cidalaFront = front.some((character) => character.characterId === CIDALA_ID);
  const sarielFront = front.some((character) => character.characterId === SARIEL_ID);
  const dark = observation.deckConfig?.protagonist.elementCode === "6";
  let observedLevel: number | undefined;
  let enemyEffects: RecordedConditionSnapshot["effects"] = [];
  let countedHits = 0;
  let deathSentenceExpiresBeforeTurn: number | undefined;
  let defenseStacks = 0;
  let supplementalStacks = 0;
  let defenseExpiresAt: number | undefined;
  let supplementalExpiresAt: number | undefined;
  let unknownCidalaStacks = false;
  let cidalaApplication: { defenseApplied: boolean; supplementalApplied: boolean } | undefined;
  let sarielApplication: { applied: boolean } | undefined;
  let otherSelfApplication = false;
  let otherSelfExpiresBeforeTurn: number | undefined;
  const protagonist = observation.actors.find((actor) => actor.position === 0);
  let currentHp = protagonist?.initialHp;
  const maxHp = protagonist?.maxHp;
  const characterHp = new Map(observation.actors.map((actor) => [actor.position, actor.initialHp]));
  const partyBuffs = new Map<number, RecordedConditionSnapshot["effects"]>();
  const ereshkigal = observation.deckConfig?.weapons.some((weapon) => weapon.position === "main" && weapon.weaponId === "1040315100"
    && (weapon.level ?? 0) >= 200);
  let ereshChargeTurn: number | undefined;
  const states: RecordedNormalAttackState[] = [];
  const chargedCommands = new Set<string>();
  const warnings: string[] = [];
  if (observation.warnings.some((warning) => warning.startsWith("Turn gap"))) warnings.push("Missing turns: hit counts and stack counts may be incomplete.");

  const snapshot = (event: RecordedConditionSnapshot, turn: number, initial = false) => {
    if (event.targetSide === "party" && event.kinds.includes("buff")) {
      partyBuffs.set(event.targetPosition, event.effects.filter((effect) => effect.kind === "buff"));
    }
    if (event.targetSide === "party" && event.targetPosition === 0 && event.kinds.includes("buff")) {
      const level = event.effects.find((effect) => effect.kind === "buff" && /^6523_[0-5]$/.test(effect.statusId));
      observedLevel = level ? Number(level.statusId.split("_")[1]) : undefined;
    }
    if (event.targetSide !== "enemy" || event.targetPosition !== 0 || !event.kinds.includes("debuff")) return;
    enemyEffects = event.effects.filter((effect) => effect.kind === "debuff");
    const has = (id: string) => enemyEffects.some((effect) => effect.statusId.split("_")[0] === id);
    if (!has("7368")) otherSelfExpiresBeforeTurn = undefined;
    if (otherSelfApplication && has("7368")) {
      otherSelfExpiresBeforeTurn = turn + 1;
      otherSelfApplication = false;
    }
    if (!has("1427")) { defenseStacks = 0; defenseExpiresAt = undefined; }
    if (!has("7839")) { supplementalStacks = 0; supplementalExpiresAt = undefined; }
    if (!has("1427") && !has("7839")) unknownCidalaStacks = false;
    if (initial && (has("1427") || has("7839"))) unknownCidalaStacks = true;
    if (cidalaApplication && cidalaFront) {
      if (has("1427") && !cidalaApplication.defenseApplied) {
        if (defenseExpiresAt !== undefined && event.elapsedMilliseconds >= defenseExpiresAt) defenseStacks = 0;
        defenseStacks = Math.min(4, defenseStacks + 1);
        defenseExpiresAt = event.elapsedMilliseconds + 180_000;
        cidalaApplication.defenseApplied = true;
      }
      if (has("7839") && !cidalaApplication.supplementalApplied) {
        if (supplementalExpiresAt !== undefined && event.elapsedMilliseconds >= supplementalExpiresAt) supplementalStacks = 0;
        supplementalStacks = Math.min(10, supplementalStacks + 1);
        supplementalExpiresAt = event.elapsedMilliseconds + 180_000;
        cidalaApplication.supplementalApplied = true;
      }
    }
    const death = enemyEffects.find((effect) => effect.statusId.split("_")[0] === "6058");
    if (!death) deathSentenceExpiresBeforeTurn = undefined;
    else if (death.expiresBeforeTurn !== undefined) deathSentenceExpiresBeforeTurn = death.expiresBeforeTurn;
    else if (sarielApplication && !sarielApplication.applied) deathSentenceExpiresBeforeTurn = turn + 5;
    if (death && sarielApplication) sarielApplication.applied = true;
  };
  for (const event of observation.initialConditions) snapshot(event, observation.battle.turn ?? 1, true);

  for (const turn of observation.turns) {
    otherSelfApplication = false;
    const events = [
      ...turn.conditionEvents.map((event) => ({ ...event, kind: "condition" as const })),
      ...turn.abilityActivations.map((event) => ({ ...event, kind: "ability" as const })),
      ...turn.normalActions.map((event) => ({ ...event, kind: "normal-start" as const })),
      ...turn.packets.map((packet) => ({ kind: "packet" as const, sequence: packet.sequence ?? -1,
        resultIndex: packet.resultIndex ?? -1, elapsedMilliseconds: 0, packet })),
    ].sort((a, b) => a.resultIndex - b.resultIndex || a.sequence - b.sequence);
    for (const event of events) {
      if (event.kind === "condition") { snapshot(event, turn.turn); continue; }
      if (event.kind === "ability") {
        otherSelfApplication = event.actorPosition === 0 && event.sourceSummonId === "2040448000" && event.name === "他化自在";
        cidalaApplication = actorId(event.actorPosition) === CIDALA_ID && event.name === "菓製猛虎"
          ? { defenseApplied: false, supplementalApplied: false } : undefined;
        sarielApplication = actorId(event.actorPosition) === SARIEL_ID && event.name === "エクスキューショナーズ・サイズ"
          ? { applied: false } : undefined;
        continue;
      }
      if (event.kind === "packet") {
        const packet = event.packet;
        if (ereshkigal && packet.kind === "charge" && packet.targetSide === "enemy" && packet.actorPosition === 0) ereshChargeTurn = turn.turn;
        if (packet.targetSide === "party" && packet.targetPosition === 0 && packet.hpAfter !== undefined) currentHp = packet.hpAfter;
        if (packet.targetSide === "party" && packet.hpAfter !== undefined) characterHp.set(packet.targetPosition, packet.hpAfter);
        if (packet.targetSide !== "enemy" || packet.value <= 0 || (packet.sourceActorPosition ?? packet.actorPosition) !== 0 || packet.kind === "heal") continue;
        // A multi-hit charge attack is one attack for this counter. This routing
        // is provisional; compare it independently to the recorded level.
        if (packet.kind === "charge") {
          const key = `${event.resultIndex}:${event.sequence}`;
          if (!chargedCommands.has(key)) { chargedCommands.add(key); countedHits += 1; }
        } else countedHits += 1;
        continue;
      }
      cidalaApplication = undefined;
      sarielApplication = undefined;
      otherSelfApplication = false;
      if (!actorPositions.includes(event.actorPosition)) continue;
      const actor = observation.actors.find((actor) => actor.position === event.actorPosition);
      const actorHp = characterHp.get(event.actorPosition);
      const actorElement = event.actorPosition === 0 ? observation.deckConfig?.protagonist.elementCode
        : front.find((character) => character.characterId === actor?.masterId)?.elementCode;
      const hasBuff = (id: string) => (partyBuffs.get(event.actorPosition) ?? []).some((effect) => effect.statusId === id
        && (effect.expiresBeforeTurn === undefined || turn.turn < effect.expiresBeforeTurn));
      if (defenseExpiresAt !== undefined && event.elapsedMilliseconds >= defenseExpiresAt) defenseStacks = 0;
      if (supplementalExpiresAt !== undefined && event.elapsedMilliseconds >= supplementalExpiresAt) supplementalStacks = 0;
      const predictedLevel = lancer ? Math.min(5, initialMythicalLancerLevel + Math.floor(countedHits / 40)) : 0;
      const level = lancer ? observedLevel ?? predictedLevel : 0;
      const deathSentenceActive = enemyEffects.some((effect) => effect.statusId.split("_")[0] === "6058")
        && (deathSentenceExpiresBeforeTurn === undefined || turn.turn < deathSentenceExpiresBeforeTurn);
      const stateWarnings = [...warnings];
      const otherSelfActive = otherSelfExpiresBeforeTurn !== undefined && turn.turn < otherSelfExpiresBeforeTurn;
      if (enemyEffects.some(effect => effect.statusId.split("_")[0] === "7368") && otherSelfExpiresBeforeTurn === undefined) {
        stateWarnings.push("Unmapped DMG Taken Amplified: no numeric effect has been inferred from its icon alone.");
      }
      if (lancer && observedLevel !== undefined && observedLevel !== predictedLevel) stateWarnings.push("Recorded Mythical Lancer level differs from the provisional hit counter.");
      if (unknownCidalaStacks) stateWarnings.push("Initial stack counts are unknown; Cidala's tracked stacks may be incomplete.");
      if (deathSentenceActive && deathSentenceExpiresBeforeTurn === undefined) stateWarnings.push("Death Sentence expiry is unknown; only recorded presence is known.");
      if (enemyEffects.some((effect) => effect.statusId.split("_")[0] === "1427") && defenseExpiresAt === undefined) stateWarnings.push("Unmapped DEF DOWN: no numeric effect has been inferred from its icon alone.");
      states.push({ sequence: event.sequence, resultIndex: event.resultIndex, elapsedMilliseconds: event.elapsedMilliseconds,
        actorPosition: event.actorPosition,
        ...(event.actorPosition === 0 ? {} : {
          characterCurrentHpPercent: actorHp === undefined || !actor?.maxHp ? undefined : Math.min(100, actorHp / actor.maxHp * 100),
          artifactStartBuffs: { attackUp: turn.turn === 1 && hasBuff("1001"), damageCapUp: turn.turn === 1 && hasBuff("1469") },
          ...(actorId(event.actorPosition) === CIDALA_ID ? { coupledConfectionActive: (partyBuffs.get(event.actorPosition) ?? [])
            .some((effect) => effect.statusId === "3267" && (effect.expiresBeforeTurn === undefined || turn.turn < effect.expiresBeforeTurn)) } : {}),
        }),
        actionIndex: event.actionIndex, turn: turn.turn, mythicalLancerLevel: level,
        levelSource: lancer && observedLevel !== undefined ? "recorded-status" : "hit-counter-provisional",
        predictedMythicalLancerLevel: predictedLevel, countedProtagonistHits: countedHits,
        protagonistCurrentHpPercent: currentHp === undefined || !maxHp ? undefined : Math.min(100, currentHp / maxHp * 100),
        recordedEnemyStatusIds: enemyEffects.map((effect) => effect.statusId),
        battleEffects: {
          enemyDefenseDownPercent: defenseStacks * 10,
          enemyDefenseDownBeyondCapPercent: deathSentenceActive ? 10 : 0,
          enemySupplementalDamage: supplementalStacks * 3_000,
          enemyDamageTakenAmplificationPercent: otherSelfActive ? 20 : 0,
          supportSkillSupplementalDamage: deathSentenceActive && sarielFront && (actorElement ?? (dark ? "6" : undefined)) === "6" ? 30_000 : 0,
          ...(event.actorPosition > 0 && ereshChargeTurn === turn.turn ? { normalAttackSupplementalDamage: 50_000 } : {}),
        },
        cidala: { defenseStacks, supplementalStacks,
          defenseExpiresAtMilliseconds: defenseExpiresAt, supplementalExpiresAtMilliseconds: supplementalExpiresAt },
        deathSentenceActive, warnings: stateWarnings, sources: [CIDALA_SOURCE, SARIEL_SOURCE, LANCER_SOURCE, VERSUSIA_SOURCE], verificationStatus: "下書き",
      });
    }
  }
  return states;
}
