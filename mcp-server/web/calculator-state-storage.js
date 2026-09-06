export const CALCULATOR_STATE_STORAGE_KEY = "gbf-helper-calculator-state-v1";
export const CALCULATOR_STATE_FORMAT = "gbf-helper-calculator-state";

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
