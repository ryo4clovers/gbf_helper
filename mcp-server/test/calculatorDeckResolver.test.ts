import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";

test("resolves an override-backed calculator config without inventing instance IDs", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    name: "追撃テスト",
    protagonist: {
      elementCode: "1",
      jobId: "110001",
      jobLevel: 20,
      attackOverride: 16255,
      hpOverride: 3504,
    },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1010000400",
        nameHint: "ブロンズソード",
        level: 1,
        attackOverride: 70,
        hpOverride: 6,
      },
      {
        slot: 2,
        position: "grid",
        weaponId: "1040218900",
        nameHint: "オーバーライド",
        level: 150,
        skillLevel: 15,
        plusMark: 99,
        attackOverride: 3609,
        hpOverride: 430,
      },
    ],
    summons: [
      {
        slot: 1,
        position: "main",
        summonId: "2030051000",
        level: 75,
        attackOverride: 865,
        hpOverride: 433,
      },
    ],
    characters: [],
  });

  assert.equal(result.mode, "catalog-with-overrides");
  assert.equal(result.deck.protagonist.attack, 16255);
  assert.equal(result.deck.protagonist.job?.masterId, "110001");
  assert.deepEqual(result.deck.protagonist.job?.weaponKindCodes, []);
  assert.equal(result.deck.weapons[1].masterId, "1040218900");
  assert.equal(result.deck.weapons[1].skillLevel, 15);
  assert.equal(result.deck.weapons[1].attack, 3609);
  assert.equal(result.deck.summons[0].name, "シルフィードベル");
  assert.equal(result.deck.summons[0].aura?.verificationStatus, "検証済み");
  assert.deepEqual(result.deck.summons[0].aura?.effects.map((effect) => effect.kind), ["utility"]);
  assert.deepEqual(
    result.deck.weapons[1].skills.map((skill) => [skill.sourceKey, skill.id, skill.verificationStatus]),
    [
      ["skill1", "2025", "検証済み"],
      ["skill2", "845", "検証済み"],
      ["skill3", "2174", "下書き"],
    ],
  );
  assert.deepEqual(result.deck.weapons[1].skills[2].effects, [
    {
      kind: "elemental-pursuit",
      elementCode: "1",
      amountPercent: 4.5,
      skillLevel: 15,
      boostGroup: "normal",
      note: "表示5.85%をオプティマスブースト30%で除して推定",
    },
  ]);
  assert.deepEqual(
    result.deck.effectiveWeaponSkillEffects?.map((effect) => ({
      kind: effect.kind,
      base: effect.baseAmountPercent,
      effective: effect.effectiveAmountPercent,
      modifiers: effect.appliedModifiers.map((modifier) => [
        modifier.sourceSkillId,
        modifier.amountPercent,
      ]),
    })),
    [
      { kind: "normal-skill-boost", base: 30, effective: 30, modifiers: [] },
      { kind: "normal-attack-up", base: 12, effective: 15.6, modifiers: [["2025", 30]] },
      { kind: "critical-rate-up", base: 3, effective: 3.9, modifiers: [["2025", 30]] },
      { kind: "elemental-pursuit", base: 4.5, effective: 5.85, modifiers: [["2025", 30]] },
    ],
  );
  assert.equal("instanceId" in result.deck.weapons[1], false);
  assert.equal("displayedDamageInfo" in result.deck, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    [
      "job-master-data-unresolved",
      "unverified-weapon-skill",
    ],
  );
});

test("reproduces the combined displayed attack and critical values after a 30% boost", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1040201400",
        skillLevel: 15,
        attackOverride: 2170,
        hpOverride: 241,
      },
      {
        slot: 2,
        position: "grid",
        weaponId: "1040218900",
        skillLevel: 15,
        attackOverride: 3609,
        hpOverride: 430,
      },
    ],
  });
  const effects = result.deck.effectiveWeaponSkillEffects ?? [];
  const total = (kind: "normal-attack-up" | "critical-rate-up") =>
    effects
      .filter((effect) => effect.kind === kind)
      .reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0);

  assert.equal(total("normal-attack-up"), 39);
  assert.equal(total("critical-rate-up"), 7.8);
  assert.deepEqual(
    effects
      .filter((effect) => effect.sourceWeaponId === "1040201400")
      .map((effect) => [effect.sourceSkillId, effect.baseAmountPercent, effect.effectiveAmountPercent]),
    [
      ["25", 18, 23.4],
      ["74", 3, 3.9],
    ],
  );
});

test("reports missing stat overrides with precise config paths", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: {},
    weapons: [{ slot: 1, position: "main", weaponId: "1" }],
    summons: [
      {
        slot: 1,
        position: "main",
        summonId: "unknown",
        attackOverride: 1,
        hpOverride: 1,
      },
    ],
  });

  assert.deepEqual(
    result.issues
      .filter((issue) => issue.code === "missing-stat-override")
      .map((issue) => issue.path),
    ["protagonist.attackOverride", "protagonist.hpOverride", "weapons.0.attackOverride", "weapons.0.hpOverride"],
  );
  assert.equal(
    result.issues.some((issue) => issue.code === "weapon-master-data-unresolved"),
    true,
  );
  assert.equal(
    result.issues.some((issue) => issue.code === "summon-aura-unresolved"),
    true,
  );
});
