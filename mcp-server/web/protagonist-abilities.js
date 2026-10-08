// Shared by formation, battle UI and the API. IDs refer to the existing action catalog.
export const FIGHTER_ACTION_IDS = Object.freeze({ "202071": "beast-fang", "200721": "ulfhedinn", "203961": "unlimited-boost" });

export function abilityIssue(ability, protagonist) {
  if (ability.minimumJobLevel && (protagonist.jobLevel ?? 1) < ability.minimumJobLevel)
    return `ジョブLv${ability.minimumJobLevel}が必要`;
  if (ability.minimumPerfectionProofLevel && (protagonist.perfectionProofLevel ?? 0) < ability.minimumPerfectionProofLevel)
    return `極致の証${ability.minimumPerfectionProofLevel}が必要`;
  return "";
}

export function abilityCaps(protagonist, config) {
  return { ...config.caps, limit: config.limitCapIncreaseLevel && (protagonist.jobLevel ?? 1) < config.limitCapIncreaseLevel ? 2 : config.caps.limit };
}

export function validateAbilitySelection(protagonist, config) {
  const selected = protagonist.abilityIds ?? [];
  if (!Array.isArray(selected) || selected.some(id => id !== null && (typeof id !== "string" || !/^\d+$/.test(id))))
    throw new Error("主人公アビリティはaction IDまたはnullの配列で指定してください");
  if (!config) {
    if (selected.some(Boolean)) throw new Error("未登録ジョブのアビリティ候補は未確認です");
    return selected;
  }
  if (selected.length > config.freeSlots) throw new Error("主人公アビリティの選択枠数を超えています");
  const seen = new Set(), counts = {}, caps = abilityCaps(protagonist, config);
  for (const id of selected.filter(Boolean)) {
    if (seen.has(id)) throw new Error("主人公アビリティが重複しています");
    seen.add(id);
    const ability = config.candidates.find(a => a.id === id);
    if (!ability) throw new Error(`このジョブでは装備できないアビリティです: ${id}`);
    const issue = abilityIssue(ability, protagonist);
    if (issue) throw new Error(`${ability.name}: ${issue}`);
    counts[ability.category] = (counts[ability.category] ?? 0) + 1;
    if (counts[ability.category] > caps[ability.category]) throw new Error(`${ability.category}アビリティの装備上限を超えています`);
  }
  return selected;
}

// Used only for explicit UI job/level changes. Invalid JSON import is rejected, not silently fixed.
export function reconcileAbilitySelection(protagonist, config) {
  const original = protagonist.abilityIds ?? [], selected = [];
  for (let slot = 0; slot < (config?.freeSlots ?? 0); slot++) {
    const id = original[slot] ?? null;
    try { validateAbilitySelection({ ...protagonist, abilityIds: [...selected, id] }, config); selected.push(id); }
    catch { selected.push(null); }
  }
  return { selected, removed: original.filter((id, i) => id && selected[i] !== id) };
}

export function fighterLoadoutFromDeck(protagonist) {
  if (protagonist.abilityIds === undefined) return undefined;
  return protagonist.jobLevel === 50 && ["100501", "origin1-fighter-origin"].includes(protagonist.jobId)
    ? protagonist.abilityIds.flatMap(id => FIGHTER_ACTION_IDS[id] ? [FIGHTER_ACTION_IDS[id]] : []) : [];
}
