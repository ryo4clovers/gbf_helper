import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CALCULATOR_PROFILES_FORMAT,
  CALCULATOR_PROFILES_STORAGE_KEY,
  CALCULATOR_STATE_FORMAT,
  CALCULATOR_STATE_STORAGE_KEY,
  parseCalculatorProfiles,
  parseCalculatorState,
  serializeCalculatorProfiles,
  serializeCalculatorState,
  upsertCalculatorProfile,
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

test("round-trips multiple named calculator profiles", () => {
  const profiles = [
    { id: "profile-1", name: " アグニス検証 ", updatedAt: "2026-09-07T12:00:00.000Z", request: request() },
    { id: "profile-2", name: "連撃上限", updatedAt: "2026-09-07T13:00:00.000Z", request: request() },
  ];
  const serialized = serializeCalculatorProfiles(profiles);
  const stored = JSON.parse(serialized);

  assert.equal(CALCULATOR_PROFILES_STORAGE_KEY, "gbf-helper-calculator-profiles-v1");
  assert.equal(stored.format, CALCULATOR_PROFILES_FORMAT);
  assert.deepEqual(parseCalculatorProfiles(serialized), [
    { ...profiles[0], name: "アグニス検証" },
    profiles[1],
  ]);
});

test("upserts a named profile by its stable ID", () => {
  const original = { id: "profile-1", name: "変更前", updatedAt: "2026-09-07T12:00:00.000Z", request: request() };
  const replacement = { id: "profile-1", name: "変更後", updatedAt: "2026-09-07T13:00:00.000Z", request: request() };
  const other = { id: "profile-2", name: "別編成", updatedAt: "2026-09-07T12:30:00.000Z", request: request() };

  assert.deepEqual(upsertCalculatorProfile([original, other], replacement), [replacement, other]);
});

test("rejects malformed named profiles", () => {
  const valid = { id: "profile-1", name: "検証編成", updatedAt: "2026-09-07T12:00:00.000Z", request: request() };
  assert.throws(() => serializeCalculatorProfiles([{ ...valid, name: " " }]), /保存名/);
  assert.throws(() => serializeCalculatorProfiles([{ ...valid, updatedAt: "invalid" }]), /更新日時/);
  assert.throws(() => serializeCalculatorProfiles([valid, valid]), /重複/);
  assert.throws(() => parseCalculatorProfiles("{}"), /名前付き保存データではありません/);
});
