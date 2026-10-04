/** Build each turn from current HP, never from the calculator's selected single-hit actor. */
export function buildBattleTurnRequest(setup, state, mode, settings, action, ilsaChargeEnabled = false) {
  const defeatedPositions = state.party.filter((member) => member.hp <= 0).map((member) => member.slot);
  const hpPercent = (member) => member.hp / member.maxHp * 100;
  const { attacker, battleEffects, mythicalLancerLevel, ...calculation } = setup.request;
  return {
    calculation: { ...calculation, enemy: { ...calculation.enemy, maxHp: state.enemy.maxHp },
      protagonistCurrentHpPercent: Math.max(1, hpPercent(state.party[0])) },
    state: state.actionState, action, ilsaChargeEnabled,
    ...(defeatedPositions.length || state.actionState?.defeatedPositions ? { defeatedPositions } : {}),
    mode, secondsPerTurn: settings.secondsPerTurn,
    characters: state.party.slice(1).map((member) => ({ characterSlot: member.slot,
      currentHpPercent: hpPercent(member), ...settings.characters[member.slot],
      ...(["3040456000", "dark-ssr-ilsa-yukata"].includes(member.id) ? { chargeGauge: member.charge } : {}) })),
  };
}

/** Select independent random damage for each automatic-ability hit. */
export function automaticAbilityPackets(event, mode, random = Math.random) {
  if (!event.damage) throw new Error(`${event.name}のダメージが未計算です`);
  const predictions = event.damage.predictions;
  return Array.from({ length: event.hitCount }, (_, index) => {
    const selected = mode === "downside" ? 0 : mode === "upside" ? predictions.length - 1 : Math.floor(random() * predictions.length);
    return { kind: event.kind ?? "automatic-ability", actorPosition: event.actorPosition, damage: predictions[selected].damage,
      note: `${event.name} ${index + 1}/${event.hitCount}hit・下書きのダメージ候補` };
  });
}
