import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateConnection, parallelValues, weaponCoverage, summonCoverage, characterCoverage, type CatalogEffectCoverage } from "../src/services/catalogCoverage.ts";
import { createCalculatorCatalogProgressView } from "../src/services/calculatorCatalogProgress.ts";
import { loadIncrementalWeaponCatalog } from "../src/calculator/weaponCatalog.ts";
import { loadIncrementalSummonCatalog } from "../src/calculator/summonCatalog.ts";
const effect = (connection: CatalogEffectCoverage["connection"]): CatalogEffectCoverage => ({ name: "test", structured: connection === "connected", connection, scope: "fixture", verificationStatus: "下書き", evidence: [], observation: "未確認" });
test("empty records and unknown effects cannot imply full calculator support", () => {
  assert.equal(aggregateConnection([]), "unknown");
  assert.equal(aggregateConnection([effect("unknown")]), "unknown");
  assert.equal(aggregateConnection([effect("connected"), effect("unknown")]), "partial");
  assert.equal(aggregateConnection([effect("connected"), effect("unconnected")]), "partial");
  assert.equal(aggregateConnection([effect("unconnected")]), "unconnected");
  assert.equal(aggregateConnection([effect("connected")]), "connected");
});
test("parallel classifications preserve caveats and registered unknown values", () => {
  assert.deepEqual(parallelValues("ヒューマン・エルーン"), ["ヒューマン", "エルーン"]);
  assert.deepEqual(parallelValues("男性・女性"), ["男性", "女性"]);
  assert.deepEqual(parallelValues("不明"), ["不明"]);
  assert.deepEqual(parallelValues("その他(ウーフ:ワーウルフ、レニー:ヒューマン)"), ["その他(ウーフ:ワーウルフ、レニー:ヒューマン)"]);
  assert.deepEqual(parallelValues(""), []);
});
test("no weapon skill records is unknown, while description-only skills remain unconnected", () => {
  const catalog = loadIncrementalWeaponCatalog();
  const empty = [...catalog.weapons.values()].find(weapon => !weapon.skillSlots.length && !weapon.listedSkills?.length)!;
  const result = weaponCoverage(empty, catalog.skills);
  assert.equal(result.connection, "unknown");
  assert.equal(result.missing.some(reason => reason.includes("スキル")), false);
  assert.ok(result.unknown.some(reason => reason.includes("判別")));
  const listed = [...catalog.weapons.values()].find(weapon => !weapon.skillSlots.length && weapon.listedSkills?.length)!;
  const described = weaponCoverage(listed, catalog.skills);
  assert.equal(described.connection, "unconnected");
  assert.ok(described.effects.every(effect => !effect.structured && !effect.evidence.length));
});
test("structured effects retain unsupported parts, SLv coverage and unverified observations", () => {
  const catalog = loadIncrementalWeaponCatalog();
  const skill = [...catalog.skills.values()].find(skill => skill.effects.length && skill.unsupportedEffects?.length)!;
  assert.ok(skill);
  const weapon = [...catalog.weapons.values()].find(weapon => weapon.skillSlots.some(slot => slot.skillId === skill.skillId))!;
  const result = weaponCoverage(weapon, catalog.skills);
  assert.equal(result.connection, "partial");
  assert.ok(result.effects.some(effect => effect.structured && effect.evidence.length));
  assert.ok(result.effects.some(effect => !effect.structured && effect.connection === "unconnected"));
  assert.ok(result.effects.every(effect => effect.observation === "未確認" || effect.observation === "減衰設定のみ確認・全体未確認"));
});
test("summon matrix distinguishes interpolated stats, unregistered stats and absent sub data", () => {
  const catalog = loadIncrementalSummonCatalog();
  const withStats = [...catalog.summons.values()].find(summon => summon.levelStats)!;
  assert.equal(summonCoverage(withStats).matrix?.stats.status, "△");
  const withoutStats = [...catalog.summons.values()].find(summon => !summon.levelStats)!;
  assert.equal(summonCoverage(withoutStats).matrix?.stats.status, "×");
  const utilityOnly = { ...withStats, auraEffects: [{ kind: "utility" as const, description: "fixture" }], auraOverrides: undefined };
  const coverage = summonCoverage(utilityOnly);
  assert.equal(coverage.matrix?.sub.status, "？");
  assert.equal(coverage.matrix?.main.status, "？");
  assert.equal(coverage.matrix?.call.status, "×");
  assert.equal(coverage.effects[0].connection, "unconnected");
});
test("character explicit proficiencies and limited support retain unknown coverage", () => {
  const ilsa = characterCoverage("dark-ssr-ilsa-yukata", "3040456000");
  assert.deepEqual(ilsa.facets.proficiency, ["銃", "弓"]);
  assert.deepEqual(ilsa.facets.series, []);
  assert.equal(ilsa.coverage.connection, "partial");
  assert.ok(ilsa.coverage.effects.some(effect => effect.name.startsWith("奥義") && effect.connection === "connected"));
  const unresolvedStyle = characterCoverage("dark-ssr-ilsa-yukata", "3040456000", 2);
  assert.ok(unresolvedStyle.coverage.effects.every(effect => effect.connection === "unknown"));
});
test("category state counts partition registered entries, not the external reference totals", () => {
  for (const category of createCalculatorCatalogProgressView().categories) {
    const counts = category.stateCounts;
    assert.equal(counts.connected + counts.partial + counts.unconnected + counts.unknown, category.registeredCount);
    assert.equal(counts.missing, category.items.filter(item => item.coverage.missing.length).length);
    for (const item of category.items) for (const effect of item.coverage.effects) {
      assert.ok(["未確認", "減衰設定のみ確認・全体未確認"].includes(effect.observation));
      if (effect.observation === "減衰設定のみ確認・全体未確認") {
        assert.ok(["菓製猛虎", "エクスキューショナーズ・サイス＋"].includes(effect.name));
        assert.equal(effect.verificationStatus, "下書き");
        assert.ok(effect.evidence.some(path => path.startsWith("knowledge/abilities/damage-profiles.md")));
      }
    }
  }
});
import { readFileSync } from "node:fs";
import { weaponEffectTypes, weaponRoutes, summonRoutes, weaponEffectClasses, summonUtilityPositions } from "../src/services/catalogCoverage.ts";
import { resolveCatalogSummonAura } from "../src/calculator/summonCatalog.ts";
import { resolveEffectiveWeaponSkillEffects } from "../src/calculator/weaponEffectResolver.ts";
import { calculateNormalAttackPower } from "../src/calculator/normalAttackPowerCalculator.ts";
import { resolveEffectiveCharacterHpAuras } from "../src/calculator/summonAuraEffectResolver.ts";
import type { DeckSnapshot, DeckWeapon } from "../src/calculator/types.ts";

test("known unsupported Celeste sub aura is not mistaken for unknown placement", () => {
  const summon = loadIncrementalSummonCatalog().summons.get("2040046000")!;
  const coverage = summonCoverage(summon);
  assert.equal(coverage.matrix?.sub.status, "×");
  assert.match(coverage.matrix!.sub.reason, /攻防10%.*未接続/);
  assert.equal(coverage.matrix?.main.status, "△");
  assert.ok(coverage.effects.some(effect => effect.scope.startsWith("サブ加護") && effect.connection === "unconnected"));
  // Changing the exact registered wording must invalidate the display metadata, not guess a position.
  const changed = { ...summon, auraEffects: [{ kind: "utility" as const, description: "different unknown utility" }] };
  assert.equal(summonCoverage(changed).matrix?.sub.status, "？");
  for (const [id, records] of Object.entries(summonUtilityPositions)) {
    const master = loadIncrementalSummonCatalog().summons.get(id)!;
    for (const description of Object.keys(records)) assert.ok(master.auraEffects.some(effect => effect.kind === "utility" && effect.description === description));
  }
  assert.deepEqual(resolveEffectiveCharacterHpAuras([{ slot: 1, position: "sub", masterId: summon.summonId, aura: { name: summon.auraName, description: summon.auraDescription, effects: summon.auraEffects, verificationStatus: summon.verificationStatus, source: summon.source } }], "6"), []);
});

test("base aura labels retain level/uncap constraints and match actual resolver stages", () => {
  const masters = [...loadIncrementalSummonCatalog().summons.values()].filter(summon => ["アグニス", "ヴァルナ", "ティターン", "ゼピュロス", "ゼウス", "ハデス"].includes(summon.name));
  assert.equal(masters.length, 6);
  for (const master of masters) {
    assert.equal(master.auraMinimumLevel, 250);
    const baseEffects = summonCoverage(master).effects.filter(effect => effect.name.startsWith("基本登録加護"));
    assert.ok(baseEffects.every(effect => effect.name.includes("Lv250以上") && effect.name.includes("6凸以上")));
    const boost = (level: number) => resolveCatalogSummonAura(master, 6, level).auraEffects.find(effect => effect.kind === "normal-skill-boost");
    assert.equal(boost(249)?.kind === "normal-skill-boost" && boost(249)?.amountPercent, 160);
    assert.equal(boost(250)?.kind === "normal-skill-boost" && boost(250)?.amountPercent, 170);
    assert.ok(summonCoverage(master).effects.some(effect => effect.name.startsWith("6凸 Lv230以上")));
  }
});

test("HP effect classification includes registered Kamui without inferring from skill names", () => {
  const catalog = loadIncrementalWeaponCatalog();
  const kamui = [...catalog.weapons.values()].find(weapon => weapon.skillSlots.some(slot => {
    const skill = catalog.skills.get(slot.skillId)!;
    return skill.name.includes("神威") && skill.effects.some(effect => ["normal-hp-up", "magna-hp-up"].includes(effect.kind));
  }))!;
  assert.ok(weaponEffectTypes(kamui, catalog.skills).includes("HP上昇（守護・神威など）"));
  const nameOnly = { ...kamui, skillSlots: [], listedSkills: [{ sourceKey: "skill1" as const, name: "守護・渾身", description: "fixture" }] };
  assert.deepEqual(weaponEffectTypes(nameOnly, catalog.skills), []);
});

test("all reviewed kind paths name actual consumers and current structured kinds stay classified", () => {
  for (const [catalog, routes] of [["weapon", weaponRoutes], ["summon", summonRoutes]] as const) {
    for (const [kind, route] of Object.entries(routes)) {
      assert.ok(readFileSync(new URL(`../${route}`, import.meta.url), "utf8").includes(`"${kind}"`), `${catalog} ${kind} consumer moved or disappeared: ${route}`);
    }
  }
  for (const skill of loadIncrementalWeaponCatalog().skills.values()) for (const effect of skill.effects) {
    assert.ok(Object.hasOwn(weaponRoutes, effect.kind));
    assert.ok(Object.hasOwn(weaponEffectClasses, effect.kind));
  }
  for (const summon of loadIncrementalSummonCatalog().summons.values()) for (const effect of [summon, ...(summon.auraOverrides ?? [])].flatMap(stage => stage.auraEffects)) {
    assert.equal(Object.hasOwn(summonRoutes, effect.kind), effect.kind !== "utility");
  }
});

test("reviewed attack path resolves and changes output; unsupported descriptions do not", () => {
  const catalog = loadIncrementalWeaponCatalog();
  const skill = [...catalog.skills.values()].find(skill => skill.effects.some(effect => effect.kind === "normal-attack-up" && effect.amountPercent! > 0))!;
  const definition = skill.effects.find(effect => effect.kind === "normal-attack-up" && effect.amountPercent! > 0)!;
  const master = [...catalog.weapons.values()].find(weapon => weapon.skillSlots.some(slot => slot.skillId === skill.skillId))!;
  assert.ok(weaponCoverage(master, catalog.skills).effects.some(effect => effect.connection === "connected" && effect.evidence.includes(weaponRoutes[definition.kind])));
  const weapon: DeckWeapon = { slot: 1, position: "main", masterId: master.weaponId, skillLevel: definition.skillLevel, skills: [{ sourceKey: "skill1", id: skill.skillId, name: skill.name, effects: [definition] }] };
  const resolved = resolveEffectiveWeaponSkillEffects([weapon]).effects;
  const deck = { protagonist: { attack: 1000, elementCode: definition.elementCode }, weapons: [weapon], summons: [], characters: [], effectiveWeaponSkillEffects: resolved } as unknown as DeckSnapshot;
  assert.equal(calculateNormalAttackPower(deck).totalEffectiveNormalAttackPercent, definition.amountPercent);
  assert.ok(calculateNormalAttackPower(deck).normalSkillAdjustedAttack > 1000);
  assert.equal(calculateNormalAttackPower({ ...deck, effectiveWeaponSkillEffects: [] }).normalSkillAdjustedAttack, 1000);
});
