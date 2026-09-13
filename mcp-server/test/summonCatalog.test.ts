import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadIncrementalSummonCatalog,
  resolveBattleSupportSummon,
  resolveCatalogSummonAura,
} from "../src/calculator/summonCatalog.ts";
import type { BattleSnapshot } from "../src/calculator/types.ts";

test("loads the initial non-damage summon aura", () => {
  const catalog = loadIncrementalSummonCatalog();
  const summon = catalog.summons.get("2030051000");

  assert.equal(catalog.summons.size, 123);
  assert.equal(summon?.name, "シルフィードベル");
  assert.equal(summon?.verificationStatus, "検証済み");
  assert.equal(summon?.supportSelectable, true);
  assert.deepEqual(summon?.auraEffects, [
    {
      kind: "utility",
      description: "レアモンスターの出現確率UP。攻撃力計算には影響しない",
    },
  ]);
});

test("loads the verified Wilnas sub aura", () => {
  const summon = loadIncrementalSummonCatalog().summons.get("2040398000");

  assert.equal(summon?.name, "ウィルナス");
  assert.deepEqual(summon?.auraEffects, [
    {
      kind: "elemental-attack-up",
      elementCode: "1",
      amountPercent: 140,
      activation: "always",
      description: "火属性攻撃力が140%UP",
    },
    {
      kind: "normal-skill-boost",
      elementCode: "1",
      amountPercent: 40,
      targetSkillNamePrefixes: ["火", "業火", "紅蓮"],
      activation: "sub-only",
      description: "サブ装備時、スキル「火」「業火」「紅蓮」の効果が40%UP",
    },
  ]);
  assert.equal(summon?.verificationStatus, "検証済み");
});

test("resolves Wilnas' verified 0-star aura instead of the 4-star catalog default", () => {
  const summon = loadIncrementalSummonCatalog().summons.get("2040398000");
  assert.ok(summon !== undefined);

  const aura = resolveCatalogSummonAura(summon, 0);

  assert.deepEqual(
    aura.auraEffects.map((effect) => [
      effect.kind,
      "amountPercent" in effect ? effect.amountPercent : undefined,
    ]),
    [
      ["elemental-attack-up", 100],
      ["normal-skill-boost", 10],
    ],
  );
});

test("resolves the sourced draft 3-star Wilnas aura", () => {
  const summon = loadIncrementalSummonCatalog().summons.get("2040398000");
  assert.ok(summon !== undefined);

  const aura = resolveCatalogSummonAura(summon, 3);

  assert.equal(aura.verificationStatus, "下書き");
  assert.deepEqual(
    aura.auraEffects.map((effect) => [
      effect.kind,
      "amountPercent" in effect ? effect.amountPercent : undefined,
    ]),
    [
      ["elemental-attack-up", 120],
      ["normal-skill-boost", 20],
    ],
  );
});

test("loads verified summon level breakpoints", () => {
  const catalog = loadIncrementalSummonCatalog();
  const wilnas = catalog.summons.get("2040398000");
  const agni = catalog.summons.get("2040094000");

  assert.deepEqual(wilnas?.levelStats?.points, [
    { level: 1, uncapLevel: 0, attack: 399, hp: 127 },
    { level: 100, uncapLevel: 3, attack: 2349, hp: 771 },
    { level: 150, uncapLevel: 4, attack: 3324, hp: 1093 },
  ]);
  assert.deepEqual(agni?.levelStats?.points.map((point) => point.level), [1, 100, 150, 200, 250]);
});

test("loads every verified Six Dragons 4-star aura", () => {
  const catalog = loadIncrementalSummonCatalog();
  const expected = [
    ["2040398000", "ウィルナス", "1", "火", ["火", "業火", "紅蓮"]],
    ["2040413000", "ワムデュス", "2", "水", ["水", "渦潮", "霧氷"]],
    ["2040401000", "ガレヲン", "3", "土", ["土", "大地", "地裂"]],
    ["2040406000", "イーウィヤ", "4", "風", ["風", "竜巻", "乱気"]],
    ["2040409000", "ル・オー", "5", "光", ["光", "雷電", "天光"]],
    ["2040418000", "フェディエル", "6", "闇", ["闇", "憎悪", "奈落"]],
  ] as const;

  for (const [summonId, name, elementCode, elementName, prefixes] of expected) {
    const summon = catalog.summons.get(summonId);
    assert.equal(summon?.name, name);
    assert.equal(summon?.verificationStatus, "検証済み");
    assert.deepEqual(summon?.auraEffects[0], {
      kind: "elemental-attack-up",
      elementCode,
      amountPercent: 140,
      activation: "always",
      description: `${elementName}属性攻撃力が140%UP`,
    });
    assert.deepEqual(summon?.auraEffects[1], {
      kind: "normal-skill-boost",
      elementCode,
      amountPercent: 40,
      targetSkillNamePrefixes: [...prefixes],
      activation: "sub-only",
      description: `サブ装備時、スキル「${prefixes.join("」「")}」の効果が40%UP`,
    });
  }
});

test("loads the verified Agni main aura", () => {
  const summon = loadIncrementalSummonCatalog().summons.get("2040094000");

  assert.equal(summon?.name, "アグニス");
  assert.deepEqual(
    summon?.auraEffects.map((effect) => [
      effect.kind,
      "amountPercent" in effect ? effect.amountPercent : undefined,
    ]),
    [
      ["normal-skill-boost", 170],
      ["elemental-attack-up", 30],
      ["character-hp-up", 20],
      ["elemental-attack-up", 20],
    ],
  );
  assert.equal(summon?.verificationStatus, "検証済み");
});

test("loads the verified Colossus Magna boost for magna weapon skills", () => {
  const summon = loadIncrementalSummonCatalog().summons.get("2040034000");
  const boost = summon?.auraEffects.find((effect) => effect.kind === "normal-skill-boost");

  assert.deepEqual(boost, {
    kind: "normal-skill-boost",
    elementCode: "1",
    amountPercent: 170,
    boostGroup: "magna",
    targetSkillNamePrefixes: ["機炎方陣"],
    activation: "always",
    description: "スキル「機炎方陣」の効果が170%UP",
  });
  assert.equal(summon?.verificationStatus, "検証済み");
  assert.deepEqual(
    summon?.auraEffects.find((effect) => effect.kind === "character-attack-up"),
    {
      kind: "character-attack-up",
      elementCode: "1",
      amountPercent: 10,
      activation: "sub-only",
      description: "サブ装備時、火属性キャラの攻撃力が10%UP",
    },
  );
  assert.deepEqual(summon?.selectionDefaults, {
    level: 250,
    uncapLevel: 6,
    plusMark: 0,
    attack: 2665,
    hp: 1064,
  });
});

test("loads Wedges of the Sky's all-element magna sub aura", () => {
  const summon = loadIncrementalSummonCatalog().summons.get("2040430000");
  const expected = [
    ["1", "機炎方陣"],
    ["2", "海神方陣"],
    ["3", "創樹方陣"],
    ["4", "嵐竜方陣"],
    ["5", "騎解方陣"],
    ["6", "黒霧方陣"],
  ];
  const boosts = summon?.auraEffects.filter((effect) => effect.kind === "normal-skill-boost");

  assert.equal(summon?.name, "蒼空の楔");
  assert.equal(summon?.verificationStatus, "検証済み");
  assert.equal(summon?.supportSelectable, false);
  assert.deepEqual(summon?.auraEffects.slice(0, 2), [
    {
      kind: "elemental-attack-up",
      elementCode: "0",
      amountPercent: 140,
      activation: "main-only",
      description: "メイン装備時、全属性攻撃力が140%UP",
    },
    {
      kind: "character-hp-flat",
      elementCode: "0",
      amount: 25000,
      activation: "main-only",
      description: "メイン装備時、全属性キャラのHPを25000上昇",
    },
  ]);
  assert.deepEqual(summon?.selectionDefaults, {
    level: 150,
    uncapLevel: 4,
    plusMark: 0,
    attack: 2106,
    hp: 808,
  });
  assert.deepEqual(
    boosts?.map((effect) => [
      effect.elementCode,
      effect.targetSkillNamePrefixes[0],
      effect.amountPercent,
      effect.boostGroup,
      effect.activation,
    ]),
    expected.map(([elementCode, prefix]) => [elementCode, prefix, 30, "magna", "sub-only"]),
  );
});

test("loads the verified fire character HP sub auras with one stacking group", () => {
  const catalog = loadIncrementalSummonCatalog();
  const expected = [
    ["2040094000", "アグニス", 20],
    ["2040317000", "ザ・デビル", 30],
    ["2040361000", "セキトバ", 30],
  ] as const;

  for (const [summonId, name, amountPercent] of expected) {
    const summon = catalog.summons.get(summonId);
    const hpEffect = summon?.auraEffects.find((effect) => effect.kind === "character-hp-up");
    assert.equal(summon?.name, name);
    assert.deepEqual(hpEffect, {
      kind: "character-hp-up",
      elementCode: "1",
      amountPercent,
      activation: "sub-only",
      stackingGroup: "fire-character-hp",
      description: `サブ装備時、火属性キャラのHPが${amountPercent}%UP`,
    });
    assert.equal(summon?.verificationStatus, "検証済み");
  }
});

test("resolves the sanitized Hades support summon from battle state", () => {
  const battle = {
    schemaVersion: 1,
    enemies: [],
    enemyPassiveEffectCount: 0,
    fieldEffectCount: 0,
    supportSummon: { masterId: "2040090000", name: "ハデス", elementCode: "6" },
  } satisfies BattleSnapshot;

  const support = resolveBattleSupportSummon(battle);
  assert.equal(support?.name, "ハデス");
  assert.deepEqual(
    support?.aura.effects.map((effect) => [
      effect.kind,
      "amountPercent" in effect ? effect.amountPercent : undefined,
    ]),
    [
      ["normal-skill-boost", 170],
      ["elemental-attack-up", 30],
    ],
  );
});
