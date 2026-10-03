/** Build each turn from current HP, never from the calculator's selected single-hit actor. */
export function buildBattleTurnRequest(setup, state, mode, settings) {
  if (state.party.some((member) => member.hp <= 0)) throw new Error("戦闘不能・交代の行動生成は未対応です。回復またはリセットしてください");
  const hpPercent = (member) => member.hp / member.maxHp * 100;
  const { attacker, battleEffects, mythicalLancerLevel, ...calculation } = setup.request;
  return {
    calculation: { ...calculation, enemy: { ...calculation.enemy, maxHp: state.enemy.maxHp },
      protagonistCurrentHpPercent: hpPercent(state.party[0]) },
    state: state.actionState,
    mode, secondsPerTurn: settings.secondsPerTurn,
    characters: state.party.slice(1).map((member) => ({ characterSlot: member.slot,
      currentHpPercent: hpPercent(member), ...settings.characters[member.slot] })),
  };
}

/** Select independent random damage for each automatic-ability hit. */
export function automaticAbilityPackets(event, mode, random = Math.random) {
  if (!event.damage) throw new Error(`${event.name}のダメージが未計算です`);
  const predictions = event.damage.predictions;
  return Array.from({ length: event.hitCount }, (_, index) => {
    const selected = mode === "downside" ? 0 : mode === "upside" ? predictions.length - 1 : Math.floor(random() * predictions.length);
    return { kind: "automatic-ability", actorPosition: event.actorPosition, damage: predictions[selected].damage,
      note: `${event.name} ${index + 1}/${event.hitCount}hit・候補値（実測未一致）` };
  });
}
