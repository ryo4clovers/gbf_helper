import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateNormalAttackFromRequest } from "../src/calculator/normalAttackCalculationRequest.ts";
import { calculateIlsaDamage } from "../src/calculator/ilsaDamage.ts";
import { loadIncrementalSummonCatalog, resolveCatalogSummonAura } from "../src/calculator/summonCatalog.ts";
import type { CalculatorDeckConfig } from "../src/calculator/types.ts";

function request(position: "main" | "grid" | "sub" = "grid", level = 250, uncapLevel = 6) {
  const deckConfig: CalculatorDeckConfig = { schemaVersion: 1, format: "gbf-helper-calculator-deck",
    protagonist: { jobId: "110001", jobLevel: 20, elementCode: "6", attackOverride: 10000, hpOverride: 10000 },
    weapons: [{ slot: 1, position: "main", weaponId: "1040618800", level: 1, skillLevel: 1, attackOverride: 0, hpOverride: 0 }],
    characters: [{ slot: 1, position: "front", characterId: "3040456000", level: 80, attackOverride: 10000, hpOverride: 2000 }],
    summons: [{ slot: 1, position, summonId: "2040090000", level, uncapLevel, attackOverride: 0, hpOverride: 0 }] };
  return { schemaVersion: 1 as const, deckConfig, enemy: { elementCode: "5", defense: 10, maxHp: 1e9 }, modifiers: {} };
}

test("Hades sub elemental attack and HP follow transcendence level in both sub slot types", () => {
  for (const position of ["grid", "sub"] as const) for (const [level, amount] of [[200, 0], [209, 0], [210, 10], [229, 10], [230, 10], [239, 10], [240, 10], [249, 10], [250, 20]]) {
    const r = calculateNormalAttackFromRequest(request(position, level)).result;
    assert.equal(r.attackPower.totalElementalSummonAuraPercent, amount, `${position} Lv${level}`);
    assert.equal(r.protagonistHp.summonAuraPercent, amount);
    assert.equal(r.protagonistHp.hp, 10000 * (1 + amount / 100));
    assert.equal(r.attackPower.totalEffectiveNormalAttackPercent, 0, "sub aura never boosts weapon skills");
  }
  assert.equal(calculateNormalAttackFromRequest(request("grid", 250, 5)).result.attackPower.totalElementalSummonAuraPercent, 0);
});

test("Hades main/support and off-element actors do not receive sub effects", () => {
  const main = calculateNormalAttackFromRequest(request("main")).result;
  assert.equal(main.attackPower.totalElementalSummonAuraPercent, 30);
  assert.equal(main.protagonistHp.summonAuraPercent, 0);
  const input = request(); input.deckConfig.summons = [];
  const support = calculateNormalAttackFromRequest({ ...input, supportSummon: { summonId: "2040090000" } }).result;
  assert.equal(support.attackPower.totalElementalSummonAuraPercent, 0);
  assert.equal(support.protagonistHp.summonAuraPercent, 0);
  const fire = request(); fire.deckConfig.protagonist.elementCode = "1"; fire.deckConfig.weapons = [];
  const result = calculateNormalAttackFromRequest(fire).result;
  assert.equal(result.attackPower.totalElementalSummonAuraPercent, 0);
  assert.equal(result.protagonistHp.summonAuraPercent, 0);
});

test("duplicate Hades auras keep the strongest value and main elemental aura takes precedence", () => {
  const input = request("grid", 210);
  input.deckConfig.summons.push({ ...input.deckConfig.summons[0], slot: 1, position: "sub", level: 250 });
  const result = calculateNormalAttackFromRequest(input).result;
  assert.equal(result.attackPower.totalElementalSummonAuraPercent, 20);
  assert.equal(result.protagonistHp.summonAuraPercent, 20);
  input.deckConfig.summons.push({ ...input.deckConfig.summons[0], slot: 1, position: "main", level: 250 });
  assert.equal(calculateNormalAttackFromRequest(input).result.attackPower.totalElementalSummonAuraPercent, 30);
});

test("automatic Hades aura matches explicit elemental input for Ilsa ability and CA", () => {
  const automatic = request();
  const explicit = request(); explicit.deckConfig.summons = [];
  for (const kind of ["ability", "charge"] as const) {
    const auto = calculateIlsaDamage({ ...automatic, attacker: { characterSlot: 1, currentHpPercent: 60 } }, kind, 3);
    const manual = calculateIlsaDamage({ ...explicit, attacker: { characterSlot: 1, currentHpPercent: 60 }, battleEffects: { elementAttackPercent: 20 } }, kind, 3);
    assert.deepEqual(auto.predictions, manual.predictions);
  }
});

test("Hades and Shika Kokukirin share the strongest elemental aura when Koku is present", () => {
  const input = request("grid", 210);
  input.deckConfig.summons.push({ slot: 1, position: "sub", summonId: "2040450000", level: 200, uncapLevel: 5 });
  input.deckConfig.characters.push({ slot: 4, position: "back", characterId: "3040571000", level: 80, attackOverride: 10000, hpOverride: 2000 });
  assert.equal(calculateNormalAttackFromRequest(input).result.attackPower.totalElementalSummonAuraPercent, 20);
  input.deckConfig.summons[0].level = 250;
  assert.equal(calculateNormalAttackFromRequest(input).result.attackPower.totalElementalSummonAuraPercent, 20);
});

test("Hades level overrides resolve main aura thresholds and preserve default selection", () => {
  const master = loadIncrementalSummonCatalog().summons.get("2040090000")!;
  for (const [level, boost, main] of [[209, 150, 0], [210, 150, 0], [229, 150, 0], [230, 160, 0], [239, 160, 0], [240, 160, 30], [249, 160, 30], [250, 170, 30]]) {
    const aura = resolveCatalogSummonAura(master, 6, level);
    assert.equal(aura.auraEffects.find(e => e.kind === "normal-skill-boost")?.amountPercent, boost);
    assert.equal(aura.auraEffects.find(e => e.kind === "elemental-attack-up" && e.activation === "main-only")?.amountPercent ?? 0, main);
  }
  assert.deepEqual(resolveCatalogSummonAura(master).auraEffects, master.auraEffects);
});
