import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CALCULATOR_STATE_FORMAT,
  CALCULATOR_STATE_STORAGE_KEY,
  parseCalculatorState,
  serializeCalculatorState,
} from "../web/calculator-state-storage.js";

function request() {
  return {
    schemaVersion: 1,
    deckConfig: {
      schemaVersion: 1,
      format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "1" },
      weapons: [],
      summons: [],
      characters: [],
    },
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
    enemy: { name: "オールド・木人", elementCode: "4", defense: 10 },
    modifiers: { targetElementDamagePercent: 5 },
    random: { minimum: 0.95, maximum: 1.05, step: 0.001 },
  };
}

test("round-trips the complete calculator input for local persistence", () => {
  const input = request();
  const serialized = serializeCalculatorState(input);
  const stored = JSON.parse(serialized);

  assert.equal(CALCULATOR_STATE_STORAGE_KEY, "gbf-helper-calculator-state-v1");
  assert.equal(stored.format, CALCULATOR_STATE_FORMAT);
  assert.deepEqual(parseCalculatorState(serialized), input);
});

test("rejects unrelated or incomplete persisted JSON", () => {
  assert.throws(() => parseCalculatorState("{}"), /保存データではありません/);
  assert.throws(
    () => parseCalculatorState(JSON.stringify({ schemaVersion: 1, format: CALCULATOR_STATE_FORMAT, request: {} })),
    /計算リクエスト形式/,
  );
  assert.throws(
    () => serializeCalculatorState({ schemaVersion: 1, deckConfig: {}, enemy: undefined }),
    /編成または敵条件/,
  );
});
