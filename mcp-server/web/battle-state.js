import { calculateCrewSupportEffects } from "./crew-support-config.js";

// v2 separates shared ability modifiers from protagonist LB/completion totals.
export const BATTLE_SETUP_STORAGE_KEY = "gbf-helper-battle-setup-v2";

// Display stats must have been resolved before entering the battle.
export function battleSetupStatIssues(deck) {
  return (deck.characters ?? []).filter((character) => character.position === "front").flatMap((character) => {
    const missing = [["hpOverride", "表示HP"], ["attackOverride", "表示ATK"]]
      .filter(([key]) => !Number.isSafeInteger(character[key]) || character[key] <= 0)
      .map(([, label]) => label);
    return missing.length ? [`前衛${character.slot}（${character.nameHint ?? character.characterId}）の${missing.join("・")}が未入力です。編成画面のキャラ欄で自動算出または表示値の入力を行ってください。`] : [];
  });
}
export const SIMULATION_MODES = Object.freeze({
  normal: "normal",
  downside: "downside",
  upside: "upside",
});

function copy(value) {
  return structuredClone(value);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedRate(value) {
  return Number.isFinite(value) ? clamp(value, 0, 100) : 0;
}

export function resolveDamageMultiplier(mode, minimum, maximum, step, randomSource = Math.random) {
  if (mode === SIMULATION_MODES.downside) return minimum;
  if (mode === SIMULATION_MODES.upside) return maximum;
  const count = Math.round((maximum - minimum) / step);
  return minimum + Math.floor(randomSource() * (count + 1)) * step;
}

export function resolveCritical(mode, ratePercent, randomSource = Math.random) {
  const rate = normalizedRate(ratePercent);
  if (mode === SIMULATION_MODES.downside) return rate >= 100;
  if (mode === SIMULATION_MODES.upside) return rate > 0;
  if (rate <= 0) return false;
  if (rate >= 100) return true;
  return randomSource() * 100 < rate;
}

export function resolveAttackCount(mode, doubleAttackRatePercent, tripleAttackRatePercent, randomSource = Math.random) {
  const doubleRate = normalizedRate(doubleAttackRatePercent);
  const tripleRate = normalizedRate(tripleAttackRatePercent);
  if (mode === SIMULATION_MODES.downside) {
    if (tripleRate >= 100) return 3;
    if (doubleRate >= 100) return 2;
    return 1;
  }
  if (mode === SIMULATION_MODES.upside) {
    if (tripleRate > 0) return 3;
    if (doubleRate > 0) return 2;
    return 1;
  }
  if (tripleRate > 0 && randomSource() * 100 < tripleRate) return 3;
  if (doubleRate > 0 && randomSource() * 100 < doubleRate) return 2;
  return 1;
}

export function resolveEnemyAttackDamage(mode, minimumDamage, maximumDamage, randomSource = Math.random) {
  const minimum = Math.max(0, Math.ceil(minimumDamage));
  const maximum = Math.max(minimum, Math.ceil(maximumDamage));
  if (mode === SIMULATION_MODES.downside) return maximum;
  if (mode === SIMULATION_MODES.upside) return minimum;
  return minimum + Math.floor(randomSource() * (maximum - minimum + 1));
}

function combatantFromDeck(entry, fallbackName, fallbackElement, initialCharge = 0, calculatedMaxHp) {
  const maxHp = Math.max(1, Math.floor(Number.isFinite(calculatedMaxHp) && calculatedMaxHp > 0 ? calculatedMaxHp : entry.hpOverride ?? 1));
  return {
    id: entry.characterId ?? "protagonist",
    name: entry.nameHint ?? fallbackName,
    elementCode: entry.elementCode ?? fallbackElement,
    slot: entry.slot ?? 0,
    hp: maxHp,
    maxHp,
    charge: initialCharge,
    buffs: [],
    debuffs: [],
  };
}

export function createInitialBattleState(setup) {
  const deck = setup.request.deckConfig;
  const crewSupportEffects = calculateCrewSupportEffects(deck.protagonist.crewSupport);
  const protagonist = combatantFromDeck(
    deck.protagonist,
    deck.protagonist.jobNameHint ?? "主人公",
    deck.protagonist.elementCode,
    crewSupportEffects.battleStartChargeGaugePercent,
  );
  if (Number.isFinite(setup.protagonistMaxHp) && setup.protagonistMaxHp > 0) {
    protagonist.hp = protagonist.maxHp = Math.floor(setup.protagonistMaxHp);
  }
  const characters = deck.characters
    .filter((character) => character.position === "front")
    .sort((left, right) => left.slot - right.slot)
    .map((character) => combatantFromDeck(
      character,
      `キャラクター${character.slot}`,
      deck.protagonist.elementCode,
      crewSupportEffects.battleStartChargeGaugePercent,
      setup.characterMaxHp?.[character.slot],
    ));
  const enemyMaxHp = Math.max(1, Math.floor(setup.enemyMaxHp ?? 1_000_000));
  const summons = [
    ...deck.summons
      .filter((summon) => summon.position === "main" || summon.position === "grid")
      .map((summon) => ({ id: `deck:${summon.position}:${summon.slot}`, name: summon.nameHint ?? summon.summonId, used: false })),
    ...(setup.request.supportSummon
      ? [{ id: "support", name: setup.request.supportSummon.nameHint ?? setup.request.supportSummon.summonId, used: false }]
      : []),
  ];

  return {
    schemaVersion: 1,
    turn: 1,
    selectedPartyId: protagonist.id,
    enemy: {
      name: setup.request.enemy.name ?? "敵",
      elementCode: setup.request.enemy.elementCode,
      attacks: setup.request.enemy.name === "ユーズド・木人",
      hp: enemyMaxHp,
      maxHp: enemyMaxHp,
      buffs: [],
      debuffs: [],
    },
    party: [protagonist, ...characters],
    items: { curePotion: crewSupportEffects.curePotionCount },
    summons,
    events: [],
    nextEventId: 1,
  };
}

function appendEvent(state, event) {
  state.events.unshift({ id: state.nextEventId, turn: state.turn, ...event });
  state.nextEventId += 1;
}

/** Apply ordered party packets atomically. Never execute later hits/effects after victory. */
export function applyGeneratedTurn(state, generated, packets, options = {}) {
  const next = copy(state);
  if (next.enemy.hp <= 0) return state;
  for (const packet of packets) {
    if (next.enemy.hp <= 0) break;
    const member = packet.actorPosition === 0 ? next.party[0] : next.party.find((entry) => entry.slot === packet.actorPosition);
    if (!member || member.hp <= 0) throw new Error("行動者が前衛に存在しないか、戦闘不能です");
    if (packet.kind === "effect") {
      if (packet.effect === "charge-ready") member.charge = packet.value;
      appendEvent(next, { kind: "effect", actor: member.name, target: member.name, amount: null, note: packet.name });
    } else {
      const amount = Math.max(0, Math.floor(packet.damage));
      if (!Number.isFinite(amount)) throw new Error("ダメージが不正です");
      next.enemy.hp = clamp(next.enemy.hp - amount, 0, next.enemy.maxHp);
      appendEvent(next, { kind: packet.kind, actor: member.name, target: next.enemy.name, amount, note: packet.note });
    }
  }
  if (next.enemy.hp > 0) {
    next.actionState = copy(generated.endState);
    const activeChocolate = generated.endState.chocolateExpiresAt > generated.elapsedSeconds;
    next.enemy.debuffs = [
      ...(activeChocolate && generated.endState.chocolateStacks ? [{ name: `菓製猛虎 ${generated.endState.chocolateStacks}` }] : []),
      ...(generated.endState.deathSentenceExpiresOnTurn > generated.turn ? [{ name: "刑死" }] : []),
    ];
    if (generated.advancesTurn !== false && next.enemy.attacks && options.enemyAttack && next.party[0].hp > 0) {
      const target = next.party[0];
      const amount = Math.max(0, Math.floor(options.enemyAttack.damage));
      target.hp = clamp(target.hp - amount, 0, target.maxHp);
      appendEvent(next, { kind: "enemy-damage", actor: next.enemy.name, target: target.name, amount, note: options.enemyAttack.note });
    }
  }
  next.warnings = generated.warnings;
  if (generated.advancesTurn !== false) next.turn += 1;
  if (next.actionState) {
    const defeated = next.party.filter((member) => member.hp <= 0).map((member) => member.slot);
    const ilsa = next.party.find((member) => ["3040456000", "dark-ssr-ilsa-yukata"].includes(member.id));
    const newDeaths = defeated.filter((position) => position !== ilsa?.slot && !next.actionState.defeatedPositions?.includes(position));
    if (ilsa?.hp > 0 && next.actionState.ilsa && newDeaths.length) {
      next.actionState.ilsa.flowers = Math.min(3, next.actionState.ilsa.flowers + newDeaths.length);
      next.actionState.ilsa.readyOnTurn = [next.turn, next.turn, next.turn];
    }
    if (defeated.length || next.actionState.defeatedPositions) next.actionState.defeatedPositions = defeated;
    if (next.turn < (next.actionState.ilsa?.sinExpiresOnTurn ?? 0)) next.enemy.debuffs.push({ name: "攻防25%DOWN" });
  }
  return next;
}

export function applyAttack(state, packets, options = {}) {
  const next = copy(state);
  const totalDamage = packets.reduce((sum, packet) => sum + Math.max(0, Math.floor(packet.damage)), 0);
  next.enemy.hp = clamp(next.enemy.hp - totalDamage, 0, next.enemy.maxHp);
  const protagonist = next.party[0];
  if (options.consumeCharge) protagonist.charge = 0;
  else protagonist.charge = clamp(protagonist.charge + 10, 0, 100);
  for (const packet of packets) {
    appendEvent(next, {
      kind: packet.kind,
      actor: protagonist.name,
      target: next.enemy.name,
      amount: Math.max(0, Math.floor(packet.damage)),
      note: packet.note,
    });
  }
  if (next.enemy.hp > 0 && next.enemy.attacks && options.enemyAttack) {
    const target = next.party.find((member) => member.hp > 0);
    if (target) {
      const damage = Math.max(0, Math.floor(options.enemyAttack.damage));
      target.hp = clamp(target.hp - damage, 0, target.maxHp);
      appendEvent(next, {
        kind: "enemy-damage",
        actor: next.enemy.name,
        target: target.name,
        amount: damage,
        note: options.enemyAttack.note,
      });
    }
  }
  next.turn += 1;
  return next;
}

export function applyItem(state, item) {
  if (item.inventoryKey && (state.items?.[item.inventoryKey] ?? 0) <= 0) return state;
  const next = copy(state);
  if (item.inventoryKey) next.items[item.inventoryKey] -= 1;
  const targets = item.scope === "all"
    ? next.party
    : [next.party.find((member) => member.id === next.selectedPartyId) ?? next.party[0]];
  let recovered = 0;
  for (const target of targets) {
    const before = target.hp;
    target.hp = item.fullHeal
      ? target.maxHp
      : clamp(target.hp + Math.ceil(target.maxHp * item.healPercent / 100), 0, target.maxHp);
    if (item.fullCharge) target.charge = 100;
    recovered += target.hp - before;
  }
  appendEvent(next, {
    kind: "heal",
    actor: item.name,
    target: item.scope === "all" ? "味方全体" : targets[0].name,
    amount: recovered,
    note: item.note,
  });
  return next;
}

export function applySummon(state, summonId) {
  const next = copy(state);
  const summon = next.summons.find((candidate) => candidate.id === summonId);
  if (!summon || summon.used) return state;
  summon.used = true;
  appendEvent(next, {
    kind: "summon",
    actor: summon.name,
    target: next.enemy.name,
    amount: null,
    note: "召喚効果・ダメージは未実装",
  });
  return next;
}

export function applyAbility(state, partyId, abilityNumber) {
  const next = copy(state);
  const member = next.party.find((candidate) => candidate.id === partyId);
  if (!member) return state;
  appendEvent(next, {
    kind: "ability",
    actor: member.name,
    target: next.enemy.name,
    amount: null,
    note: `アビリティ${abilityNumber}の効果・ダメージは未実装`,
  });
  return next;
}

export function selectPartyMember(state, partyId) {
  if (!state.party.some((member) => member.id === partyId)) return state;
  return { ...state, selectedPartyId: partyId };
}

export function appendSystemEvent(state, note) {
  const next = copy(state);
  appendEvent(next, { kind: "system", actor: "SYSTEM", target: "—", amount: null, note });
  return next;
}
