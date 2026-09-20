import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import { calculateNormalAttackPower } from "../src/calculator/normalAttackPowerCalculator.ts";

test("resolves protagonist LB before completion bonuses and replaces stale imported stats", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: {
      rank: 425, elementCode: "1", jobId: "110001", jobLevel: 20,
      masterLevel: 0, perfectionProofLevel: 0,
      masterBonusAttackPercent: 24, masterBonusHpPercent: 20,
      mainWeaponCompletionAttackContribution: 4,
      attackLimitBonusLevel: 3, hpLimitBonusLevel: 3,
      partyHpLimitBonusLevel: 3, partyHpLimitBonus2Level: 3, partyHpLimitBonus3Level: 3,
      criticalRateLimitBonusLevel: 1,
      fireAttackLimitBonusLevel: 3, fireAttackLimitBonus2Level: 3, fireAttackLimitBonus3Level: 3,
      attackOverride: 18687, hpOverride: 5262,
    },
    weapons: [{ slot: 1, position: "main", weaponId: "1010000400", isJobFallback: true, level: 1, attackOverride: 70, hpOverride: 6 }],
    summons: [{ slot: 1, position: "main", summonId: "2040094000", level: 250, uncapLevel: 6 }],
    characters: [],
  });
  assert.equal(result.mode, "catalog-derived");
  assert.equal(result.deck.protagonist.attack, 18687);
  assert.equal(result.deck.protagonist.hp, 8862);
  assert.deepEqual(result.deck.protagonist.job?.criticalRateBonuses, [{
    sourceId: "critical-limit-bonus",
    sourceName: "クリティカル確率 LB",
    level: 1,
    triggerRatePercent: 1,
    damageBonusPercent: 1,
    verificationStatus: "検証済み",
  }]);
  assert.deepEqual(result.deck.protagonist.job?.damageModifiers, [
    {
      stage: "elemental-attack", amountPercent: 5, sourceType: "job-limit-bonus",
      sourceId: "fire-attack-limit-bonus", sourceName: "火属性攻撃力LB",
      elementCode: "1", verificationStatus: "検証済み",
    },
    {
      stage: "elemental-attack", amountPercent: 5, sourceType: "job-limit-bonus",
      sourceId: "fire-attack-limit-bonus-2", sourceName: "火属性攻撃力LB II",
      elementCode: "1", verificationStatus: "検証済み",
    },
    {
      stage: "elemental-attack", amountPercent: 5, sourceType: "job-limit-bonus",
      sourceId: "fire-attack-limit-bonus-3", sourceName: "火属性攻撃力LB III",
      elementCode: "1", verificationStatus: "検証済み",
    },
  ]);
});

test("derives verified weapon stats from level and applies plus marks afterward", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 2,
        position: "grid",
        weaponId: "1040220800",
        level: 117,
        skillLevel: 15,
        plusMark: 10,
      },
    ],
  });

  assert.equal(result.deck.weapons[0].attack, 2408);
  assert.equal(result.deck.weapons[0].hp, 252);
  assert.equal(result.issues.some((issue) => issue.code === "missing-stat-override"), false);
});

test("derives stats across an extended weapon level range", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 2,
        position: "grid",
        weaponId: "1040401500",
        level: 152,
        skillLevel: 20,
        plusMark: 0,
      },
    ],
  });

  assert.equal(result.deck.weapons[0].attack, 2296);
  assert.equal(result.deck.weapons[0].hp, 302);
  assert.equal(result.issues.some((issue) => issue.code === "missing-stat-override"), false);
});

test("derives Leviathan Gaze Omega stats at the Lv150 breakpoint", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "2", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 2,
        position: "grid",
        weaponId: "1040101500",
        level: 150,
        skillLevel: 15,
        plusMark: 0,
      },
    ],
  });

  assert.equal(result.deck.weapons[0].attack, 2520);
  assert.equal(result.deck.weapons[0].hp, 255);
  assert.equal(result.issues.some((issue) => issue.code === "missing-stat-override"), false);
});

test("derives Tyros Vignette stats across its verified level range", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "2", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 2,
        position: "grid",
        weaponId: "1040808200",
        level: 100,
        skillLevel: 15,
        plusMark: 0,
      },
    ],
  });

  assert.equal(result.deck.weapons[0].attack, 2044);
  assert.equal(result.deck.weapons[0].hp, 226);
  assert.equal(result.issues.some((issue) => issue.code === "missing-stat-override"), false);
});

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
        isJobFallback: true,
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
  assert.deepEqual(result.deck.protagonist.job?.weaponKindCodes, ["1", "3"]);
  assert.equal(result.deck.weapons[0].isJobFallback, true);
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
        modifier.sourceType === "weapon-skill" ? modifier.sourceSkillId : modifier.sourceSummonId,
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

test("derives Froga protagonist display stats instead of retaining stale overrides", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: {
      rank: 425,
      elementCode: "1",
      jobId: "110001",
      jobLevel: 20,
      masterLevel: 0,
      perfectionProofLevel: 0,
      masterBonusAttackPercent: 24,
      masterBonusHpPercent: 20,
      mainWeaponCompletionAttackContribution: 4,
      attackOverride: 10885,
      hpOverride: 2885,
    },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1010000400",
        isJobFallback: true,
        level: 1,
        attackOverride: 70,
        hpOverride: 6,
      },
      {
        slot: 2,
        position: "grid",
        weaponId: "1040024600",
        level: 150,
        skillLevel: 15,
      },
    ],
    summons: [
      {
        slot: 1,
        position: "main",
        summonId: "2040094000",
        level: 250,
        uncapLevel: 6,
      },
    ],
    characters: [],
  });

  assert.equal(result.mode, "catalog-derived");
  assert.equal(result.deck.protagonist.attack, 19498);
  assert.equal(result.deck.protagonist.hp, 4434);
  assert.equal(result.deck.weapons[1]?.attack, 3045);
  assert.equal(result.deck.summons[0]?.attack, 4157);
});

test("warns without removing a main weapon that the selected job cannot equip", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: {
      jobId: "100501",
      attackOverride: 1,
      hpOverride: 1,
    },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1040201400",
        nameHint: "イフリートハルベルト",
        attackOverride: 1,
        hpOverride: 1,
      },
    ],
  });

  const compatibilityIssue = result.issues.find(
    (issue) => issue.code === "main-weapon-incompatible-with-job",
  );
  assert.deepEqual(result.deck.protagonist.job?.weaponKindCodes, ["1", "4"]);
  assert.equal(result.deck.protagonist.elementCode, "1");
  assert.equal(result.deck.weapons[0].masterId, "1040201400");
  assert.equal(compatibilityIssue?.path, "weapons.0.weaponId");
  assert.match(compatibilityIssue?.message ?? "", /ファイター・オリジン.*剣 \/ 斧.*イフリートハルベルト.*槍/);
});

test("accepts a compatible main weapon without a compatibility warning", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { jobId: "100501", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1010000400",
        isJobFallback: true,
        attackOverride: 70,
        hpOverride: 6,
      },
    ],
  });

  assert.equal(
    result.issues.some((issue) => issue.code === "main-weapon-incompatible-with-job"),
    false,
  );
});

test("updates a stale fallback to the job's first proficient weapon", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { jobId: "100501", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1010200500",
        isJobFallback: true,
        attackOverride: 65,
        hpOverride: 7,
      },
    ],
  });

  assert.equal(result.deck.weapons[0].name, "ブロンズソード");
  assert.equal(result.deck.weapons[0].weaponKindCode, "1");
  assert.equal(result.deck.protagonist.elementCode, "1");
  assert.equal(
    result.issues.some((issue) => issue.code === "weapon-master-data-unresolved"),
    false,
  );
  assert.equal(
    result.issues.some((issue) => issue.code === "main-weapon-incompatible-with-job"),
    false,
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

test("uses provisional attack and critical values at SLv10 while retaining an effect-level warning", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 1,
        position: "main",
        weaponId: "1040201400",
        skillLevel: 10,
        attackOverride: 2170,
        hpOverride: 241,
      },
    ],
  });

  assert.deepEqual(
    result.deck.effectiveWeaponSkillEffects?.map((effect) => [effect.sourceSkillId, effect.kind, effect.baseAmountPercent]),
    [
      ["25", "normal-attack-up", 15],
      ["74", "critical-rate-up", 2],
    ],
  );
  assert.equal(
    result.deck.effectiveWeaponSkillEffects?.[0]?.verificationStatus,
    "下書き",
  );
  assert.equal(
    result.issues.some((issue) => issue.code === "unverified-weapon-skill-effect"),
    true,
  );
});

test("reproduces Agni's observed 170% boost and main-only elemental attack aura", () => {
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
    ],
    summons: [
      {
        slot: 1,
        position: "main",
        summonId: "2040094000",
        level: 250,
        uncapLevel: 6,
        attackOverride: 4157,
        hpOverride: 1414,
      },
    ],
  });
  const effects = result.deck.effectiveWeaponSkillEffects ?? [];

  assert.deepEqual(
    effects.map((effect) => [effect.sourceSkillId, effect.effectiveAmountPercent]),
    [
      ["25", 48.6],
      ["74", 8.1],
    ],
  );
  assert.deepEqual(effects[0]?.appliedModifiers, [
    {
      kind: "normal-skill-boost",
      sourceType: "summon-aura",
      sourceSummonSlot: 1,
      sourcePosition: "main",
      sourceSummonId: "2040094000",
      sourceSummonName: "アグニス",
      sourceAuraName: "アグニスの加護",
      amountPercent: 170,
      verificationStatus: "検証済み",
    },
  ]);
  assert.equal(result.deck.summons[0]?.aura?.effects[1]?.kind, "elemental-attack-up");
  assert.equal(result.issues.some((issue) => issue.code === "summon-aura-unresolved"), false);
  const attackPower = calculateNormalAttackPower(result.deck);
  assert.equal(attackPower.totalEffectiveNormalAttackPercent, 48.6);
  assert.equal(attackPower.totalElementalSummonAuraPercent, 30);
  assert.equal(attackPower.summonAuraAdjustedAttack, 1.9318);
  assert.deepEqual(attackPower.issues, []);
});

test("reproduces Fire's Might small SLv1 through 3 with Agni's 170% boost", () => {
  for (const [skillLevel, baseAmountPercent, effectiveAmountPercent] of [
    [1, 1, 2.7],
    [2, 2, 5.4],
    [3, 3, 8.1],
  ] as const) {
    const result = resolveCalculatorDeckConfig({
      schemaVersion: 1,
      format: "gbf-helper-calculator-deck",
      protagonist: { elementCode: "1", attackOverride: 1, hpOverride: 1 },
      weapons: [
        {
          slot: 2,
          position: "grid",
          weaponId: "1020500200",
          level: 1,
          skillLevel,
          attackOverride: 215,
          hpOverride: 11,
        },
      ],
      summons: [
        {
          slot: 1,
          position: "main",
          summonId: "2040094000",
          level: 250,
          uncapLevel: 6,
          attackOverride: 4157,
          hpOverride: 1414,
        },
      ],
    });

    assert.deepEqual(
      result.deck.effectiveWeaponSkillEffects?.map((effect) => [
        effect.sourceSkillId,
        effect.baseAmountPercent,
        effect.effectiveAmountPercent,
        effect.verificationStatus,
      ]),
      [["1", baseAmountPercent, effectiveAmountPercent, "検証済み"]],
    );
    assert.equal(result.issues.some((issue) => issue.code === "unverified-weapon-skill-effect"), false);
  }
});

test("applies provisional Godmight small SLv20 attack and HP components", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 1, hpOverride: 1 },
    weapons: [
      {
        slot: 2,
        position: "grid",
        weaponId: "1040614300",
        level: 200,
        skillLevel: 20,
        attackOverride: 3098,
        hpOverride: 327,
      },
    ],
    summons: [
      {
        slot: 1,
        position: "main",
        summonId: "2040094000",
        level: 250,
        uncapLevel: 6,
        attackOverride: 4157,
        hpOverride: 1414,
      },
    ],
  });

  assert.deepEqual(
    result.deck.effectiveWeaponSkillEffects
      ?.filter((effect) => effect.sourceSkillId === "375")
      .map((effect) => [effect.kind, effect.baseAmountPercent, effect.effectiveAmountPercent, effect.verificationStatus]),
    [
      ["normal-attack-up", 12.5, 33.75, "下書き"],
      ["normal-hp-up", 12.5, 33.75, "下書き"],
    ],
  );
  assert.equal(result.issues.some((issue) => issue.code === "unverified-weapon-skill-effect"), true);
  assert.equal(result.issues.some((issue) => issue.code === "weapon-skill-partially-supported"), false);
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

test("activates every Scarlet Convergence copy at four swords including a cross-element sword", () => {
  const weapon = (slot: number, weaponId: string, skillLevel: number) => ({
    slot,
    position: slot === 1 ? "main" as const : "grid" as const,
    weaponId,
    skillLevel,
    attackOverride: 1,
    hpOverride: 1,
  });
  const base = {
    schemaVersion: 1 as const,
    format: "gbf-helper-calculator-deck" as const,
    protagonist: { elementCode: "1", attackOverride: 1000, hpOverride: 1000 },
    weapons: [
      weapon(1, "1040023700", 15),
      weapon(2, "1040023700", 15),
      weapon(3, "1040024600", 15),
    ],
  };

  const threeSwords = resolveCalculatorDeckConfig(base);
  assert.deepEqual(
    threeSwords.deck.effectiveWeaponSkillEffects
      ?.filter((effect) => effect.sourceSkillId === "1913"),
    [],
  );

  const fourSwords = resolveCalculatorDeckConfig({
    ...base,
    weapons: [...base.weapons, weapon(4, "1040023600", 1)],
  });
  assert.deepEqual(
    fourSwords.deck.effectiveWeaponSkillEffects
      ?.filter((effect) => effect.sourceSkillId === "1913")
      .map((effect) => [effect.kind, effect.effectiveAmountPercent]),
    [
      ["ex-attack-up", 40],
      ["weapon-defense-up", 25],
      ["special-frame-damage-cap-up", 7],
      ["ex-attack-up", 40],
      ["weapon-defense-up", 25],
      ["special-frame-damage-cap-up", 7],
    ],
  );

  const crossElementFourSwords = resolveCalculatorDeckConfig({
    ...base,
    weapons: [
      weapon(1, "1040023700", 15),
      weapon(2, "1040023700", 15),
      weapon(3, "1040023700", 15),
      weapon(4, "1040004600", 15),
    ],
  });
  assert.deepEqual(
    crossElementFourSwords.deck.effectiveWeaponSkillEffects
      ?.filter((effect) => effect.sourceSkillId === "1913")
      .map((effect) => [effect.kind, effect.effectiveAmountPercent]),
    [
      ["ex-attack-up", 40],
      ["weapon-defense-up", 25],
      ["special-frame-damage-cap-up", 7],
      ["ex-attack-up", 40],
      ["weapon-defense-up", 25],
      ["special-frame-damage-cap-up", 7],
      ["ex-attack-up", 40],
      ["weapon-defense-up", 25],
      ["special-frame-damage-cap-up", 7],
    ],
  );
});

test("connects Crimson Scale Pact, Voltage II, and normal-frame damage cap effects", () => {
  const weapon = (slot: number, weaponId: string, skillLevel: number) => ({
    slot,
    position: slot === 1 ? "main" as const : "grid" as const,
    weaponId,
    skillLevel,
  });
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 1000, hpOverride: 1000 },
    weapons: [
      weapon(1, "1040315900", 15),
      weapon(2, "1040315900", 15),
      weapon(3, "1040314900", 15),
      weapon(4, "1040314900", 15),
      weapon(5, "1040312800", 15),
      weapon(6, "1040906700", 20),
    ],
    summons: [],
  });
  const effects = result.deck.effectiveWeaponSkillEffects ?? [];

  assert.deepEqual(
    effects.filter((effect) => effect.sourceSkillId === "1788")
      .map((effect) => effect.effectiveAmountFlat),
    [50_000, 50_000],
  );
  assert.deepEqual(
    effects.filter((effect) => effect.sourceSkillId === "1794")
      .map((effect) => [effect.effectiveAmountPercent, effect.gridScaleMultiplier]),
    [[40, 5], [40, 5]],
  );
  assert.deepEqual(
    effects.filter((effect) => effect.sourceSkillId === "1780")
      .map((effect) => effect.effectiveAmountPercent),
    [7, 7],
  );
  assert.deepEqual(
    effects.filter((effect) => effect.sourceSkillId === "601")
      .map((effect) => effect.effectiveAmountPercent),
    [10],
  );
  assert.equal(calculateNormalAttackPower(result.deck).specialExAttackPercent, 80);
});

test("connects only Phoenix's Torch Precocity from the three registered skills", () => {
  const result = resolveCalculatorDeckConfig({
    schemaVersion: 1,
    format: "gbf-helper-calculator-deck",
    protagonist: { elementCode: "1", attackOverride: 1000, hpOverride: 1000 },
    weapons: [
      { slot: 1, position: "main", weaponId: "1040422700", skillLevel: 15 },
      { slot: 2, position: "grid", weaponId: "1040422700", skillLevel: 1 },
    ],
    summons: [],
  });
  const effects = result.deck.effectiveWeaponSkillEffects ?? [];

  assert.deepEqual(
    effects.map((effect) => [effect.sourceSkillId, effect.kind, effect.effectiveAmountPercent]),
    [
      ["2347", "critical-rate-up", 10],
      ["2347", "healing-cap-up", 15],
      ["2347", "critical-rate-up", 4.4],
      ["2347", "healing-cap-up", 5],
    ],
  );
  assert.equal(effects.some((effect) => effect.sourceSkillId === "2353"), false);
  assert.equal(effects.some((effect) => effect.sourceSkillId === "2354"), false);
});
