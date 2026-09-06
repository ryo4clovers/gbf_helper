export const BATTLE_SETUP_STORAGE_KEY = "gbf-helper-battle-setup-v1";

function copy(value) {
  return structuredClone(value);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function combatantFromDeck(entry, fallbackName, fallbackElement) {
  const maxHp = Math.max(1, Math.floor(entry.hpOverride ?? 1));
  return {
    id: entry.characterId ?? "protagonist",
    name: entry.nameHint ?? fallbackName,
    elementCode: entry.elementCode ?? fallbackElement,
    hp: maxHp,
    maxHp,
    charge: 0,
    buffs: [],
    debuffs: [],
  };
}

export function createInitialBattleState(setup) {
  const deck = setup.request.deckConfig;
  const protagonist = combatantFromDeck(
    deck.protagonist,
    deck.protagonist.jobNameHint ?? "主人公",
    deck.protagonist.elementCode,
  );
  const characters = deck.characters
    .filter((character) => character.position === "front")
    .sort((left, right) => left.slot - right.slot)
    .map((character) => combatantFromDeck(character, `キャラクター${character.slot}`, deck.protagonist.elementCode));
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
      hp: enemyMaxHp,
      maxHp: enemyMaxHp,
      buffs: [],
      debuffs: [],
    },
    party: [protagonist, ...characters],
    summons,
    events: [],
    nextEventId: 1,
  };
}

function appendEvent(state, event) {
  state.events.unshift({ id: state.nextEventId, turn: state.turn, ...event });
  state.nextEventId += 1;
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
  next.turn += 1;
  return next;
}

export function applyItem(state, item) {
  const next = copy(state);
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
