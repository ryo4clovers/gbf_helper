import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCalculatorDeckConfig } from "../src/calculator/calculatorDeckResolver.ts";
import { calculateNormalAttackPower } from "../src/calculator/normalAttackPowerCalculator.ts";
import { calculateCombatHp } from "../src/calculator/protagonistHpCalculator.ts";
import { resolveEffectiveCharacterHpAuras } from "../src/calculator/summonAuraEffectResolver.ts";
import { loadIncrementalSummonCatalog, resolveBattleSupportSummon, resolveCatalogSummonAura } from "../src/calculator/summonCatalog.ts";
import { resolveEffectiveWeaponSkillEffects } from "../src/calculator/weaponEffectResolver.ts";
import type { DeckSummon, DeckWeapon, ResolvedSupportSummon } from "../src/calculator/types.ts";

const series = [
  ["2040094000", "Agni", "1", ["火", "業火", "紅蓮"]],
  ["2040100000", "Varuna", "2", ["水", "渦潮", "霧氷"]],
  ["2040084000", "Titan", "3", ["土", "大地", "地裂"]],
  ["2040098000", "Zephyrus", "4", ["風", "竜巻", "乱気"]],
  ["2040080000", "Zeus", "5", ["光", "雷電", "天光"]],
  ["2040090000", "Hades", "6", ["闇", "憎悪", "奈落"]],
] as const;

// Exercise the real deck-config path, including selected level/uncap and provenance.
function summon(id: string, position: DeckSummon["position"], level = 250, uncapLevel = 6): DeckSummon {
  return resolveCalculatorDeckConfig({ schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: { attackOverride: 10000, hpOverride: 10000 }, weapons: [],
    summons: [{ summonId: id, slot: 1, position, level, uncapLevel, attackOverride: 0, hpOverride: 0 }],
  }).deck.summons[0];
}

function auraTotals(summons: DeckSummon[], elementCode: string, supportSummon?: ResolvedSupportSummon) {
  const attack = calculateNormalAttackPower({ schemaVersion: 1,
    protagonist: { attack: 10000, elementCode }, characters: [], weapons: [], summons,
  }, { supportSummon });
  const hp = calculateCombatHp({ baseHp: 10000, elementCode,
    auras: resolveEffectiveCharacterHpAuras(summons, elementCode, supportSummon) })!;
  return [attack.totalElementalSummonAuraPercent, hp.summonAuraPercent, hp.hp];
}

for (const [id, name, element, prefixes] of series) {
  test(`${name} applies level-specific main and sub auras through deck resolution`, () => {
    const master = loadIncrementalSummonCatalog().summons.get(id)!;
    // uncap, level, normal skill boost, main elemental attack, sub elemental attack/HP
    const stages = [
      [0, 1, 80, 0, 0], [1, 100, 80, 0, 0], [2, 100, 80, 0, 0],
      [3, 100, 120, 0, 0], [4, 150, 140, 0, 0], [5, 200, 150, 0, 0],
      [6, 200, 150, 0, 0], [6, 209, 150, 0, 0], [6, 210, 150, 0, 10],
      [6, 220, 150, 0, 10], [6, 229, 150, 0, 10], [6, 230, 160, 0, 10],
      [6, 239, 160, 0, 10], [6, 240, 160, 30, 10], [6, 249, 160, 30, 10], [6, 250, 170, 30, 20],
    ];
    for (const [uncap, level, boost, main, sub] of stages) {
      const aura = resolveCatalogSummonAura(master, uncap, level);
      const skill = aura.auraEffects.find(e => e.kind === "normal-skill-boost");
      assert.equal(skill?.amountPercent, boost, `uncap ${uncap} Lv${level}`);
      assert.deepEqual(skill?.targetSkillNamePrefixes, prefixes);
      assert.equal(skill?.elementCode, element);
      assert.deepEqual(auraTotals([summon(id, "main", level, uncap)], element), [main, 0, 10000]);
      for (const position of ["grid", "sub"] as const) {
        assert.deepEqual(auraTotals([summon(id, position, level, uncap)], element), [sub, sub, 10000 + sub * 100]);
      }
      if (level < 250) assert.equal(aura.verificationStatus, "下書き");
    }
    assert.deepEqual(resolveCatalogSummonAura(master).auraEffects, master.auraEffects);
    assert.equal(resolveCatalogSummonAura(master, 5, 250).auraEffects.length, 1, "uncap condition overrides inconsistent level");
  });

  test(`${name} restricts auras to their attribute/position and keeps the strongest duplicate`, () => {
    const sub = summon(id, "sub");
    const grid = summon(id, "grid", 210);
    const main = summon(id, "main");
    const otherElement = element === "1" ? "2" : "1";
    assert.deepEqual(auraTotals([main, grid, sub], otherElement), [0, 0, 10000]);
    assert.deepEqual(auraTotals([grid, sub], element), [20, 20, 12000]);
    assert.deepEqual(auraTotals([sub, grid], element), [20, 20, 12000]);
    assert.deepEqual(auraTotals([main, grid, sub], element), [30, 20, 12000]);
  });

  test(`${name} boosts matching normal skills from main/support only`, () => {
    const main = summon(id, "main");
    const support = resolveBattleSupportSummon({ schemaVersion: 1, enemies: [],
      supportSummon: { masterId: id } })!;
    assert.ok(support);
    assert.deepEqual(auraTotals([], element, support), [0, 0, 10000]);
    // Synthetic 10% skills isolate each prefix, normal/magna group and attribute.
    const skills: DeckWeapon = { slot: 1, position: "main", masterId: "synthetic",
      skills: prefixes.map((prefix, index) => ({ sourceKey: `skill${index}`, id: `test-${index}`, name: `${prefix}の攻刃`,
        verificationStatus: "下書き", effects: [{ kind: "normal-attack-up", elementCode: element, amountPercent: 10, boostGroup: "normal" }] })),
    };
    skills.skills.push(
      { sourceKey: "magna", id: "magna", name: `${prefixes[0]}の方陣`, verificationStatus: "下書き",
        effects: [{ kind: "magna-attack-up", elementCode: element, amountPercent: 10, boostGroup: "magna" }] },
      { sourceKey: "other", id: "other", name: `${prefixes[0]}の攻刃`, verificationStatus: "下書き",
        effects: [{ kind: "normal-attack-up", elementCode: element === "1" ? "2" : "1", amountPercent: 10, boostGroup: "normal" }] },
    );
    const amounts = (summons: DeckSummon[], friend?: ResolvedSupportSummon) =>
      resolveEffectiveWeaponSkillEffects([skills], summons, friend).effects.map(e => e.effectiveAmountPercent);
    assert.deepEqual(amounts([main]), [27, 27, 27, 10, 10]);
    assert.deepEqual(amounts([], support), [27, 27, 27, 10, 10]);
    assert.deepEqual(amounts([main], support), [44, 44, 44, 10, 10]);
    assert.deepEqual(amounts([summon(id, "grid"), summon(id, "sub")]), [10, 10, 10, 10, 10]);
  });
}

test("Agni preserves the verified Devil HP group across transcendence levels", () => {
  for (const level of [210, 240, 250]) {
    const auras = [summon("2040094000", "grid", level), summon("2040317000", "sub", 200, 5)];
    const devil = loadIncrementalSummonCatalog().summons.get("2040317000");
    assert.equal(devil?.name, "ザ・デビル");
    assert.equal(resolveEffectiveCharacterHpAuras(auras, "1").reduce((sum, e) => sum + e.amountPercent, 0), 30);
  }
});
