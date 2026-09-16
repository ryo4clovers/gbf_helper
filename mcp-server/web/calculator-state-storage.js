export const CALCULATOR_FORMATION_STORAGE_KEY = "gbf-helper-calculator-formation-v2";
export const CALCULATOR_FORMATION_FORMAT = "gbf-helper-calculator-formation";
export const CALCULATOR_ENVIRONMENT_STORAGE_KEY = "gbf-helper-calculator-environment-v1";
export const CALCULATOR_ENVIRONMENT_FORMAT = "gbf-helper-calculator-environment";
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
  "attackLimitBonusLevel", "hpLimitBonusLevel",
  "fireAttackLimitBonusLevel", "fireAttackLimitBonus2Level", "fireAttackLimitBonus3Level",
  "elementCode", "jobId", "jobNameHint", "jobLevel", "masterLevel", "perfectionProofLevel",
];
const weaponKeys = [
  "slot", "position", "weaponId", "isJobFallback", "nameHint", "level", "skillLevel", "uncapLevel", "plusMark", "awakening",
];
const summonKeys = ["slot", "position", "summonId", "nameHint", "level", "uncapLevel", "plusMark"];
const characterKeys = ["slot", "position", "characterId", "nameHint", "level", "uncapLevel", "plusMark"];
const personalProtagonistKeys = [
  "rank", "jobCompletionDoubleAttackRate", "jobCompletionTripleAttackRate", "masterBonusAttackPercent", "masterBonusHpPercent",
  "attackOverride", "hpOverride", "memorialItems", "crewSupport", "completedJobIds", "mainWeaponCompletionAttackContribution",
  "jobGrowthAttackContribution", "jobGrowthHpContribution",
];
const environmentProtagonistKeys = [
  "rank", "jobCompletionDoubleAttackRate", "jobCompletionTripleAttackRate", "masterBonusAttackPercent", "masterBonusHpPercent",
];
const modifierKeys = [
  "shipAttackPercent", "furnaceAttackPercent", "jobNormalAttackDamagePercent",
];
const randomKeys = ["minimum", "maximum", "step"];

function pickFiniteNumbers(source, keys, label) {
  const picked = pick(source, keys);
  for (const [key, value] of Object.entries(picked)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${label}.${key} は有限の数値である必要があります`);
    }
  }
  return picked;
}

function sanitizeMemorialItems(value) {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !isRecord(value.items)) throw new Error("大事なもの設定が正しくありません");
  const items = {};
  for (const [id, raw] of Object.entries(value.items)) {
    if (!/^\d+$/.test(id) || !isRecord(raw) || typeof raw.enabled !== "boolean") {
      throw new Error("大事なものの項目設定が正しくありません");
    }
    const item = { enabled: raw.enabled };
    for (const key of ["level", "amountPercent"]) {
      if (raw[key] !== undefined) {
        if (typeof raw[key] !== "number" || !Number.isFinite(raw[key]) || raw[key] < 0) {
          throw new Error(`大事なもの.${id}.${key} は0以上の有限数である必要があります`);
        }
        item[key] = raw[key];
      }
    }
    items[id] = item;
  }
  return {
    includeExtinctionCrestInLocalResults: value.includeExtinctionCrestInLocalResults !== false,
    items,
  };
}

const crewSupportKeys = ["airshipEnabled", "rainbowFurnaceEnabled", "copperGongEnabled", "potionMakerEnabled"];

function sanitizeCrewSupport(value) {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("騎空団サポート設定が正しくありません");
  const sanitized = {};
  for (const key of crewSupportKeys) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") {
      throw new Error(`騎空団サポート.${key} は真偽値である必要があります`);
    }
    sanitized[key] = value[key] ?? true;
  }
  return sanitized;
}

function assertEnvironment(environment) {
  if (!isRecord(environment) || environment.schemaVersion !== 1) {
    throw new Error("保存データの個別環境形式が正しくありません");
  }
  if (!isRecord(environment.protagonist) || !isRecord(environment.modifiers) || !isRecord(environment.random)) {
    throw new Error("保存データの個別環境設定が正しくありません");
  }
  const protagonist = pickFiniteNumbers(environment.protagonist, environmentProtagonistKeys, "protagonist");
  if (environment.protagonist.completedJobIds !== undefined) {
    if (!Array.isArray(environment.protagonist.completedJobIds) || environment.protagonist.completedJobIds.some((id) => typeof id !== "string" || id.trim() === "")) {
      throw new Error("protagonist.completedJobIds はジョブIDの配列である必要があります");
    }
    protagonist.completedJobIds = [...new Set(environment.protagonist.completedJobIds)];
  }
  if (protagonist.rank !== undefined && (!Number.isInteger(protagonist.rank) || protagonist.rank < 1 || protagonist.rank > 425)) {
    throw new Error("protagonist.rank は1〜425の整数である必要があります");
  }
  return {
    schemaVersion: 1,
    protagonist,
    ...(environment.memorialItems === undefined ? {} : { memorialItems: sanitizeMemorialItems(environment.memorialItems) }),
    ...(environment.crewSupport === undefined ? {} : { crewSupport: sanitizeCrewSupport(environment.crewSupport) }),
    modifiers: pickFiniteNumbers(environment.modifiers, modifierKeys, "modifiers"),
    random: pickFiniteNumbers(environment.random, randomKeys, "random"),
  };
}

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

/** Extracts account-specific bonuses and local calculation settings independently of formation and enemy data. */
export function createCalculatorEnvironment(request) {
  if (!isRecord(request) || request.schemaVersion !== 1 || !isRecord(request.deckConfig?.protagonist)) {
    throw new Error("計算リクエストの形式が正しくありません");
  }
  return assertEnvironment({
    schemaVersion: 1,
    protagonist: {
      ...pick(request.deckConfig.protagonist, environmentProtagonistKeys),
      ...pick(request.deckConfig.protagonist, ["completedJobIds"]),
    },
    memorialItems: request.deckConfig.protagonist.memorialItems,
    crewSupport: request.deckConfig.protagonist.crewSupport,
    modifiers: pick(request.modifiers, modifierKeys),
    random: pick(request.random, randomKeys),
  });
}

/** Applies personal environment values without replacing formation, enemy, or calculated runtime stats. */
export function mergeCalculatorEnvironment(currentRequest, environment) {
  const saved = assertEnvironment(environment);
  return {
    ...currentRequest,
    deckConfig: {
      ...currentRequest.deckConfig,
      protagonist: {
        ...currentRequest.deckConfig.protagonist,
        ...saved.protagonist,
        ...(saved.memorialItems === undefined ? {} : { memorialItems: saved.memorialItems }),
        ...(saved.crewSupport === undefined ? {} : { crewSupport: saved.crewSupport }),
      },
    },
    modifiers: { ...currentRequest.modifiers, ...saved.modifiers },
    random: { ...currentRequest.random, ...saved.random },
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

export function serializeCalculatorEnvironment(environment) {
  return JSON.stringify({
    schemaVersion: 1,
    format: CALCULATOR_ENVIRONMENT_FORMAT,
    environment: assertEnvironment(environment),
  });
}

export function parseCalculatorEnvironment(serialized) {
  const state = JSON.parse(serialized);
  if (!isRecord(state) || state.schemaVersion !== 1 || state.format !== CALCULATOR_ENVIRONMENT_FORMAT) {
    throw new Error("ローカル計算機の個別環境保存データではありません");
  }
  return assertEnvironment(state.environment);
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
