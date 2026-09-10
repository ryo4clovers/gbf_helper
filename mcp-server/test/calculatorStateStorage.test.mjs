import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CALCULATOR_ENVIRONMENT_FORMAT,
  CALCULATOR_ENVIRONMENT_STORAGE_KEY,
  CALCULATOR_FORMATION_FORMAT,
  CALCULATOR_FORMATION_STORAGE_KEY,
  CALCULATOR_PROFILES_FORMAT,
  CALCULATOR_PROFILES_STORAGE_KEY,
  LEGACY_CALCULATOR_STORAGE_KEYS,
  createCalculatorEnvironment,
  createCalculatorFormation,
  mergeCalculatorEnvironment,
  mergeCalculatorFormation,
  parseCalculatorEnvironment,
  parseCalculatorFormation,
  parseCalculatorProfiles,
  removeCalculatorProfile,
  serializeCalculatorEnvironment,
  serializeCalculatorFormation,
  serializeCalculatorProfiles,
  upsertCalculatorProfile,
} from "../web/calculator-state-storage.js";

function request() {
  return {
    schemaVersion: 1,
    deckConfig: {
      schemaVersion: 1,
      format: "gbf-helper-calculator-deck",
      name: "検証編成",
      protagonist: {
        elementCode: "1",
        jobId: "110001",
        jobCompletionDoubleAttackRate: 7,
        jobCompletionTripleAttackRate: 4,
        masterBonusAttackPercent: 18,
        masterBonusHpPercent: 20,
        attackOverride: 22801,
        hpOverride: 4630,
      },
      weapons: [{ slot: 1, position: "main", weaponId: "1040201400", level: 150, attackOverride: 2170, hpOverride: 241 }],
      summons: [{ slot: 1, position: "main", summonId: "2040185000", level: 150, attackOverride: 2500, hpOverride: 900 }],
      characters: [{ slot: 1, position: "front", characterId: "3040001000", level: 100, attackOverride: 9000, hpOverride: 1800 }],
    },
    supportSummon: { summonId: "2040094000", nameHint: "アグニス" },
    enemy: { name: "オールド・木人", elementCode: "4", defense: 10 },
    modifiers: {
      allElementAttackPercent: 5,
      elementAttackPercent: 15,
      shipAttackPercent: 10,
      furnaceAttackPercent: 20,
      jobNormalAttackDamagePercent: 3,
      damageDealtPercent: 2,
      targetElementDamagePercent: 1,
    },
    random: { minimum: 0.95, maximum: 1.05, step: 0.001 },
  };
}

test("persists only formation choices including the support summon", () => {
  const formation = createCalculatorFormation(request());
  const serialized = serializeCalculatorFormation(formation);
  const stored = JSON.parse(serialized);

  assert.equal(CALCULATOR_FORMATION_STORAGE_KEY, "gbf-helper-calculator-formation-v2");
  assert.equal(stored.format, CALCULATOR_FORMATION_FORMAT);
  assert.deepEqual(parseCalculatorFormation(serialized), formation);
  assert.equal(formation.supportSummon.summonId, "2040094000");
  assert.equal(formation.deckConfig.protagonist.hpOverride, undefined);
  assert.equal(formation.deckConfig.protagonist.jobCompletionDoubleAttackRate, undefined);
  assert.equal(formation.deckConfig.weapons[0].attackOverride, undefined);
  assert.equal(formation.deckConfig.summons[0].hpOverride, undefined);
  assert.equal(formation.deckConfig.characters[0].attackOverride, undefined);
  assert.equal(formation.enemy, undefined);
  assert.equal(formation.modifiers, undefined);
  assert.equal(formation.random, undefined);
});

test("persists personal environment separately from formation and enemy data", () => {
  const environment = createCalculatorEnvironment(request());
  const serialized = serializeCalculatorEnvironment(environment);
  const stored = JSON.parse(serialized);

  assert.equal(CALCULATOR_ENVIRONMENT_STORAGE_KEY, "gbf-helper-calculator-environment-v1");
  assert.equal(stored.format, CALCULATOR_ENVIRONMENT_FORMAT);
  assert.deepEqual(parseCalculatorEnvironment(serialized), environment);
  assert.equal(environment.protagonist.jobCompletionDoubleAttackRate, 7);
  assert.equal(environment.protagonist.masterBonusAttackPercent, 18);
  assert.equal(environment.modifiers.furnaceAttackPercent, 20);
  assert.equal(environment.random.step, 0.001);
  assert.equal(environment.protagonist.attackOverride, undefined);
  assert.equal(environment.protagonist.hpOverride, undefined);
  assert.equal(environment.deckConfig, undefined);
  assert.equal(environment.supportSummon, undefined);
  assert.equal(environment.enemy, undefined);
});

test("merges personal environment without replacing formation, enemy, or runtime stats", () => {
  const current = request();
  const savedRequest = request();
  savedRequest.deckConfig.protagonist.jobCompletionDoubleAttackRate = 12;
  savedRequest.deckConfig.protagonist.masterBonusHpPercent = 25;
  savedRequest.deckConfig.protagonist.attackOverride = 99999;
  savedRequest.modifiers.shipAttackPercent = 30;
  savedRequest.random.minimum = 0.9;
  savedRequest.enemy.defense = 25;
  savedRequest.supportSummon = { summonId: "different" };
  const merged = mergeCalculatorEnvironment(current, createCalculatorEnvironment(savedRequest));

  assert.equal(merged.deckConfig.protagonist.jobCompletionDoubleAttackRate, 12);
  assert.equal(merged.deckConfig.protagonist.masterBonusHpPercent, 25);
  assert.equal(merged.deckConfig.protagonist.attackOverride, 22801);
  assert.equal(merged.deckConfig.weapons[0].weaponId, "1040201400");
  assert.equal(merged.supportSummon.summonId, "2040094000");
  assert.equal(merged.enemy.defense, 10);
  assert.equal(merged.modifiers.shipAttackPercent, 30);
  assert.equal(merged.random.minimum, 0.9);
});

test("merges a formation without replacing current personal or battle settings", () => {
  const current = request();
  const savedRequest = request();
  savedRequest.deckConfig.name = "保存側";
  savedRequest.enemy.defense = 25;
  savedRequest.modifiers.shipAttackPercent = 99;
  const merged = mergeCalculatorFormation(current, createCalculatorFormation(savedRequest));

  assert.equal(merged.deckConfig.name, "保存側");
  assert.equal(merged.deckConfig.protagonist.hpOverride, 4630);
  assert.equal(merged.deckConfig.protagonist.masterBonusHpPercent, 20);
  assert.equal(merged.deckConfig.weapons[0].attackOverride, 2170);
  assert.equal(merged.enemy.defense, 10);
  assert.equal(merged.modifiers.shipAttackPercent, 10);
});

test("uses new keys and explicitly identifies legacy storage to clear", () => {
  assert.equal(CALCULATOR_PROFILES_STORAGE_KEY, "gbf-helper-calculator-formation-profiles-v2");
  assert.deepEqual(LEGACY_CALCULATOR_STORAGE_KEYS, [
    "gbf-helper-calculator-state-v1",
    "gbf-helper-calculator-profiles-v1",
  ]);
});

test("round-trips multiple named formation profiles", () => {
  const formation = createCalculatorFormation(request());
  const profiles = [
    { id: "profile-1", name: " アグニス検証 ", updatedAt: "2026-09-07T12:00:00.000Z", formation },
    { id: "profile-2", name: "連撃上限", updatedAt: "2026-09-07T13:00:00.000Z", formation },
  ];
  const serialized = serializeCalculatorProfiles(profiles);
  assert.equal(JSON.parse(serialized).format, CALCULATOR_PROFILES_FORMAT);
  assert.deepEqual(parseCalculatorProfiles(serialized), [
    { ...profiles[0], name: "アグニス検証" },
    profiles[1],
  ]);
});

test("upserts and removes named formation profiles", () => {
  const formation = createCalculatorFormation(request());
  const original = { id: "profile-1", name: "変更前", updatedAt: "2026-09-07T12:00:00.000Z", formation };
  const replacement = { ...original, name: "変更後", updatedAt: "2026-09-07T13:00:00.000Z" };
  const other = { id: "profile-2", name: "別編成", updatedAt: "2026-09-07T12:30:00.000Z", formation };

  assert.deepEqual(upsertCalculatorProfile([original, other], replacement), [replacement, other]);
  assert.deepEqual(removeCalculatorProfile([original, other], other.id), [original]);
  assert.throws(() => removeCalculatorProfile({}, original.id), /一覧形式/);
});

test("rejects malformed formation storage and profiles", () => {
  const formation = createCalculatorFormation(request());
  const valid = { id: "profile-1", name: "検証編成", updatedAt: "2026-09-07T12:00:00.000Z", formation };
  assert.throws(() => parseCalculatorFormation("{}"), /編成保存データではありません/);
  assert.throws(() => parseCalculatorEnvironment("{}"), /個別環境保存データではありません/);
  assert.throws(
    () => serializeCalculatorEnvironment({
      schemaVersion: 1,
      protagonist: { masterBonusHpPercent: "invalid" },
      modifiers: {},
      random: {},
    }),
    /有限の数値/,
  );
  assert.throws(() => serializeCalculatorProfiles([{ ...valid, name: " " }]), /保存名/);
  assert.throws(() => serializeCalculatorProfiles([{ ...valid, updatedAt: "invalid" }]), /更新日時/);
  assert.throws(() => serializeCalculatorProfiles([valid, valid]), /重複/);
  assert.throws(() => parseCalculatorProfiles("{}"), /名前付き編成データではありません/);
});
