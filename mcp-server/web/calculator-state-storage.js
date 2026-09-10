export const CALCULATOR_FORMATION_STORAGE_KEY = "gbf-helper-calculator-formation-v2";
export const CALCULATOR_FORMATION_FORMAT = "gbf-helper-calculator-formation";
export const CALCULATOR_PROFILES_STORAGE_KEY = "gbf-helper-calculator-formation-profiles-v2";
export const CALCULATOR_PROFILES_FORMAT = "gbf-helper-calculator-formation-profiles";
export const LEGACY_CALCULATOR_STORAGE_KEYS = [
  "gbf-helper-calculator-state-v1",
  "gbf-helper-calculator-profiles-v1",
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(source, keys) {
  return Object.fromEntries(keys.flatMap((key) => source?.[key] === undefined ? [] : [[key, source[key]]]));
}

const protagonistKeys = [
  "elementCode", "jobId", "jobNameHint", "jobLevel", "masterLevel", "perfectionProofLevel",
];
const weaponKeys = [
  "slot", "position", "weaponId", "isJobFallback", "nameHint", "level", "skillLevel", "uncapLevel", "plusMark", "awakening",
];
const summonKeys = ["slot", "position", "summonId", "nameHint", "level", "uncapLevel", "plusMark"];
const characterKeys = ["slot", "position", "characterId", "nameHint", "level", "uncapLevel", "plusMark"];
const personalProtagonistKeys = [
  "jobCompletionDoubleAttackRate", "jobCompletionTripleAttackRate", "masterBonusAttackPercent", "masterBonusHpPercent",
  "attackOverride", "hpOverride",
];

function assertFormation(formation) {
  if (!isRecord(formation) || formation.schemaVersion !== 1 || !isRecord(formation.deckConfig)) {
    throw new Error("保存データの編成形式が正しくありません");
  }
  const deck = formation.deckConfig;
  if (deck.schemaVersion !== 1 || deck.format !== "gbf-helper-calculator-deck" || !isRecord(deck.protagonist)) {
    throw new Error("保存データの編成設定が正しくありません");
  }
  if (!Array.isArray(deck.weapons) || !Array.isArray(deck.summons) || !Array.isArray(deck.characters)) {
    throw new Error("保存データの装備またはキャラクター形式が正しくありません");
  }
  if (formation.supportSummon !== undefined && !isRecord(formation.supportSummon)) {
    throw new Error("保存データのサポート召喚石形式が正しくありません");
  }
  return formation;
}

/** Extracts formation choices without calculated stats, account environment, enemy, or random settings. */
export function createCalculatorFormation(request) {
  if (!isRecord(request) || request.schemaVersion !== 1 || !isRecord(request.deckConfig)) {
    throw new Error("計算リクエストの形式が正しくありません");
  }
  const deck = request.deckConfig;
  return assertFormation({
    schemaVersion: 1,
    deckConfig: {
      schemaVersion: 1,
      format: "gbf-helper-calculator-deck",
      ...pick(deck, ["name"]),
      protagonist: pick(deck.protagonist, protagonistKeys),
      weapons: (deck.weapons ?? []).map((entry) => pick(entry, weaponKeys)),
      summons: (deck.summons ?? []).map((entry) => pick(entry, summonKeys)),
      characters: (deck.characters ?? []).map((entry) => pick(entry, characterKeys)),
    },
    ...(request.supportSummon
      ? { supportSummon: pick(request.supportSummon, ["summonId", "nameHint"]) }
      : {}),
  });
}

/** Applies choices while retaining non-persisted personal/runtime values in memory. */
export function mergeCalculatorFormation(currentRequest, formation) {
  const saved = assertFormation(formation);
  const currentDeck = currentRequest.deckConfig;
  const retainStats = (entries, savedEntries, idKey) => savedEntries.map((entry) => {
    const current = entries.find((candidate) =>
      candidate[idKey] === entry[idKey] && candidate.slot === entry.slot && candidate.position === entry.position,
    );
    return { ...pick(current, ["attackOverride", "hpOverride"]), ...entry };
  });
  return {
    ...currentRequest,
    deckConfig: {
      ...saved.deckConfig,
      protagonist: {
        ...pick(currentDeck.protagonist, personalProtagonistKeys),
        ...saved.deckConfig.protagonist,
      },
      weapons: retainStats(currentDeck.weapons ?? [], saved.deckConfig.weapons, "weaponId"),
      summons: retainStats(currentDeck.summons ?? [], saved.deckConfig.summons, "summonId"),
      characters: retainStats(currentDeck.characters ?? [], saved.deckConfig.characters, "characterId"),
    },
    supportSummon: saved.supportSummon,
  };
}

function assertCalculatorProfile(profile) {
  if (!isRecord(profile) || typeof profile.id !== "string" || profile.id.trim() === "") {
    throw new Error("名前付き保存のIDが正しくありません");
  }
  if (typeof profile.name !== "string" || profile.name.trim() === "" || profile.name.trim().length > 80) {
    throw new Error("保存名は1〜80文字で入力してください");
  }
  if (typeof profile.updatedAt !== "string" || !Number.isFinite(Date.parse(profile.updatedAt))) {
    throw new Error("名前付き保存の更新日時が正しくありません");
  }
  assertFormation(profile.formation);
  return { ...profile, name: profile.name.trim() };
}

export function serializeCalculatorFormation(formation) {
  return JSON.stringify({ schemaVersion: 2, format: CALCULATOR_FORMATION_FORMAT, formation: assertFormation(formation) });
}

export function parseCalculatorFormation(serialized) {
  const state = JSON.parse(serialized);
  if (!isRecord(state) || state.schemaVersion !== 2 || state.format !== CALCULATOR_FORMATION_FORMAT) {
    throw new Error("ローカル計算機の編成保存データではありません");
  }
  return assertFormation(state.formation);
}

export function serializeCalculatorProfiles(profiles) {
  if (!Array.isArray(profiles)) throw new Error("名前付き保存の一覧形式が正しくありません");
  const validated = profiles.map(assertCalculatorProfile);
  if (new Set(validated.map((profile) => profile.id)).size !== validated.length) {
    throw new Error("名前付き保存のIDが重複しています");
  }
  return JSON.stringify({ schemaVersion: 2, format: CALCULATOR_PROFILES_FORMAT, profiles: validated });
}

export function parseCalculatorProfiles(serialized) {
  const stored = JSON.parse(serialized);
  if (!isRecord(stored) || stored.schemaVersion !== 2 || stored.format !== CALCULATOR_PROFILES_FORMAT) {
    throw new Error("ローカル計算機の名前付き編成データではありません");
  }
  return JSON.parse(serializeCalculatorProfiles(stored.profiles)).profiles;
}

export function upsertCalculatorProfile(profiles, profile) {
  const validatedProfile = assertCalculatorProfile(profile);
  return [validatedProfile, ...profiles.filter((candidate) => candidate.id !== validatedProfile.id)];
}

export function removeCalculatorProfile(profiles, profileId) {
  if (!Array.isArray(profiles)) throw new Error("名前付き保存の一覧形式が正しくありません");
  return profiles.filter((profile) => profile.id !== profileId);
}
