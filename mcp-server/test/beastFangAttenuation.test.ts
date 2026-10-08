import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BEAST_FANG_ATTENUATION, beastFangDamage } from "../src/calculator/beastFangDamage.ts";
import { calculateDamageAttenuation } from "../src/calculator/damageAttenuationCalculator.ts";
import { applyDamageCapPenetration } from "../src/calculator/weaponOverskills.ts";
import { castFighterAbility } from "../src/calculator/fighterOriginAbilities.ts";
import { fighterAbilitiesSchema } from "../src/calculator/fighterOriginState.ts";
import { automaticAbilityPackets } from "../web/battle-turn-client.js";
import { calculateWeaponSkillCriticalProfile } from "../src/calculator/criticalBodyDamageCalculator.ts";
import { resolveWeaponAwakenings } from "../src/calculator/weaponAwakening.ts";

test("shared critical model is preserved outside the provisional Fang exception", () => {
  assert.equal(calculateWeaponSkillCriticalProfile(101.4).criticalDamageBonusPercent, 50.35);
  assert.equal(calculateWeaponSkillCriticalProfile(135.2).criticalDamageBonusPercent, 58.8);
});

test("Hamartia special awakening adds non-aura normal ATK/HP and respects weapon unlock", () => {
  const weapon: any = { slot: 2, position: "grid", masterId: "1040423200", level: 150, uncapLevel: 4,
    awakening: { formCode: "3", level: 10 } };
  const result = resolveWeaponAwakenings([weapon]);
  for (const kind of ["normal-attack-up", "normal-hp-up"]) {
    assert.equal(result.effects.filter(e => e.kind === kind).reduce((n, e) => n + e.effectiveAmountPercent, 0), 20);
  }
  assert.ok(result.effects.every(e => !e.elementCode && e.appliedModifiers.length === 0));
  assert.equal(resolveWeaponAwakenings([{ ...weapon, level: 149 }]).effects.length, 0);
});

const observations = JSON.parse(readFileSync(new URL("./fixtures/beast-fang-attenuation-observations.json", import.meta.url), "utf8"));
test("all 40 observed Fang integers remain in the adopted provisional curve distribution", () => {
  assert.equal(observations.vectors.length, 40);
  for (const v of observations.vectors) {
    const profile = applyDamageCapPenetration(BEAST_FANG_ATTENUATION, v.penetration);
    const candidates = Array.from({ length: 101 }, (_, i) => Math.ceil(calculateDamageAttenuation(
      v.base * v.multiplier * (950 + i) / 1000 * (1 + v.criticalBonus / 100), profile,
      { damageCapUpPercent: v.cap, thresholdRounding: "ceil-increase" }).damage * (1 + v.amplification / 100)));
    assert.ok(candidates.includes(v.observed), `observed ${v.observed}`);
  }
});

const calculation: any = { schemaVersion: 1, deckConfig: { schemaVersion: 1, format: "gbf-helper-calculator-deck",
  protagonist: { elementCode: "6", jobId: "100501", jobLevel: 50, attackOverride: 50000, hpOverride: 1000 },
  weapons: [{ slot: 1, position: "main", weaponId: "1040422300", level: 200, uncapLevel: 5, skillLevel: 15 }],
  characters: [], summons: [] }, enemy: { elementCode: "5", defense: 10 }, modifiers: {} };

test("Fang uses Origin bonuses, labels unknown numeric ID, and selects partial weapon criticals in Web", () => {
  const result = beastFangDamage(calculation);
  assert.equal(result.trace.damageContributions.jobLevel, 0);
  assert.equal(result.trace.capContributions.jobLevelCap, 25);
  assert.equal("tableId" in result.attenuationEvidence, false);
  const event = castFighterAbility({ level: 0, consumedGaugeRemainder: 0,
    abilities: fighterAbilitiesSchema.parse({ loadout: ["beast-fang"] }) }, 1, 0, "beast-fang", "manual", true,
    { calculation, elapsedSeconds: 0 }).event;
  assert.ok(event.criticalBuff!.ratePercent > 0 && event.criticalBuff!.ratePercent < 100);
  assert.ok(event.criticalDamage!.perHit.maximum > event.damage!.perHit.maximum);
  const critical = automaticAbilityPackets(event, "normal", () => 0)[0];
  const regular = automaticAbilityPackets(event, "normal", () => .99)[0];
  assert.ok(critical.note.includes("武器技巧"));
  assert.ok(!regular.note.includes("武器技巧"));
  const neutral = castFighterAbility({ level: 0, consumedGaugeRemainder: 0,
    abilities: fighterAbilitiesSchema.parse({ loadout: ["beast-fang"] }) }, 1, 0, "beast-fang", "manual", true,
    { calculation: { ...calculation, enemy: { elementCode: "6", defense: 10 } }, elapsedSeconds: 0 }).event;
  assert.equal(neutral.criticalDamage, undefined);
});
