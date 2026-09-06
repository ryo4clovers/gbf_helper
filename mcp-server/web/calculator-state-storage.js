export const CALCULATOR_STATE_STORAGE_KEY = "gbf-helper-calculator-state-v1";
export const CALCULATOR_STATE_FORMAT = "gbf-helper-calculator-state";
export const CALCULATOR_PROFILES_STORAGE_KEY = "gbf-helper-calculator-profiles-v1";
export const CALCULATOR_PROFILES_FORMAT = "gbf-helper-calculator-profiles";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertCalculationRequest(request) {
  if (!isRecord(request) || request.schemaVersion !== 1) {
    throw new Error("保存データの計算リクエスト形式が正しくありません");
  }
  if (!isRecord(request.deckConfig) || !isRecord(request.enemy)) {
    throw new Error("保存データに編成または敵条件がありません");
  }
  return request;
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
  assertCalculationRequest(profile.request);
  return {
    ...profile,
    name: profile.name.trim(),
  };
}

/** Serializes only calculator inputs. Results are always recalculated after restoration. */
export function serializeCalculatorState(request) {
  return JSON.stringify({
    schemaVersion: 1,
    format: CALCULATOR_STATE_FORMAT,
    request: assertCalculationRequest(request),
  });
}

/** Parses a persisted full calculator state and rejects unrelated JSON files. */
export function parseCalculatorState(serialized) {
  const state = JSON.parse(serialized);
  if (!isRecord(state) || state.schemaVersion !== 1 || state.format !== CALCULATOR_STATE_FORMAT) {
    throw new Error("ローカル計算機の保存データではありません");
  }
  return assertCalculationRequest(state.request);
}

/** Serializes named calculator snapshots stored only in the current browser. */
export function serializeCalculatorProfiles(profiles) {
  if (!Array.isArray(profiles)) throw new Error("名前付き保存の一覧形式が正しくありません");
  const validated = profiles.map(assertCalculatorProfile);
  if (new Set(validated.map((profile) => profile.id)).size !== validated.length) {
    throw new Error("名前付き保存のIDが重複しています");
  }
  return JSON.stringify({
    schemaVersion: 1,
    format: CALCULATOR_PROFILES_FORMAT,
    profiles: validated,
  });
}

/** Parses named calculator snapshots and rejects unrelated or malformed data. */
export function parseCalculatorProfiles(serialized) {
  const stored = JSON.parse(serialized);
  if (!isRecord(stored) || stored.schemaVersion !== 1 || stored.format !== CALCULATOR_PROFILES_FORMAT) {
    throw new Error("ローカル計算機の名前付き保存データではありません");
  }
  return JSON.parse(serializeCalculatorProfiles(stored.profiles)).profiles;
}

/** Inserts a new profile or replaces the profile with the same stable ID. */
export function upsertCalculatorProfile(profiles, profile) {
  const validatedProfile = assertCalculatorProfile(profile);
  const remaining = profiles.filter((candidate) => candidate.id !== validatedProfile.id);
  return [validatedProfile, ...remaining];
}
