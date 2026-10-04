/** Build each turn from current HP, never from the calculator's selected single-hit actor. */
export function buildBattleTurnRequest(setup, state, mode, settings, action, ilsaChargeEnabled = false) {
  const defeatedPositions = state.party.filter((member) => member.hp <= 0).map((member) => member.slot);
  const hpPercent = (member) => member.hp / member.maxHp * 100;
  const { attacker, battleEffects, mythicalLancerLevel, ...calculation } = setup.request;
  return {
    calculation: { ...calculation, enemy: { ...calculation.enemy, maxHp: state.enemy.maxHp },
      // Dead actors are excluded by defeatedPositions; use a valid placeholder only for them.
      protagonistCurrentHpPercent: state.party[0].hp > 0 ? hpPercent(state.party[0]) : 100 },
    state: state.actionState, action, ilsaChargeEnabled,
    protagonistCharge: { enabled: ilsaChargeEnabled, gauge: state.party[0].charge },
    ...(defeatedPositions.length || state.actionState?.defeatedPositions ? { defeatedPositions } : {}),
    mode, secondsPerTurn: settings.secondsPerTurn,
    characters: state.party.slice(1).map((member) => ({ characterSlot: member.slot,
      ...settings.characters[member.slot], currentHpPercent: hpPercent(member),
      ...(["3040456000", "dark-ssr-ilsa-yukata"].includes(member.id) ? { chargeGauge: member.charge } : {}) })),
  };
}

/** Select independent random damage for each automatic-ability hit. */
export function automaticAbilityPackets(event, mode, random = Math.random) {
  if (!event.damage) throw new Error(`${event.name}のダメージが未計算です`);
  return Array.from({ length: event.hitCount }, (_, index) => {
    const critical = event.criticalDamage && event.criticalBuff && (mode === "upside" || (mode === "normal" && random() < event.criticalBuff.ratePercent / 100));
    const predictions = (critical ? event.criticalDamage : event.damage).predictions;
    const selected = mode === "downside" ? 0 : mode === "upside" ? predictions.length - 1 : Math.floor(random() * predictions.length);
    return { kind: event.kind ?? "automatic-ability", actorPosition: event.actorPosition, damage: predictions[selected].damage,
      note: `${event.name} ${index + 1}/${event.hitCount}hit${critical ? "・武器奥義クリティカル" : ""}・下書きのダメージ候補` };
  });
}
