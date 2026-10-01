import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCharacterSkillBoosts } from "../src/calculator/characterSkillBoosts.ts";
import { resolveEffectiveWeaponSkillEffects } from "../src/calculator/weaponEffectResolver.ts";
import type { DeckWeapon } from "../src/calculator/types.ts";

test("Sariel boosts both dark groups once, excluding other elements and unboosted effects", () => {
  const character = { slot: 1, position: "front" as const, masterId: "3040611000" };
  const boosts = resolveCharacterSkillBoosts([character, { ...character, slot: 4, position: "back" }]);
  assert.equal(boosts.length, 2);
  const weapon: DeckWeapon = {
    slot: 1, position: "grid", masterId: "synthetic",
    skills: [
      { id: "normal", name: "奈落の攻刃", sourceKey: "skill1", effects: [
        { kind: "normal-attack-up", amountPercent: 10, elementCode: "6", boostGroup: "normal" },
      ] },
      { id: "magna", name: "黒霧方陣・攻刃", sourceKey: "skill2", effects: [
        { kind: "normal-attack-up", amountPercent: 10, elementCode: "6", boostGroup: "magna" },
      ] },
      { id: "fire", name: "紅蓮の攻刃", sourceKey: "skill3", effects: [
        { kind: "normal-attack-up", amountPercent: 10, elementCode: "1", boostGroup: "normal" },
      ] },
      { id: "special", name: "奈落の特殊効果", sourceKey: "skill4", effects: [
        { kind: "special-ex-attack-up", amountPercent: 10, elementCode: "6" },
      ] },
    ],
  };
  const result = resolveEffectiveWeaponSkillEffects([weapon], [], undefined, boosts);
  assert.deepEqual(result.effects.map((effect) => effect.effectiveAmountPercent), [12, 12, 10, 10]);
  assert.deepEqual(result.effects.map((effect) => effect.appliedModifiers.length), [1, 1, 0, 0]);
  assert.deepEqual(resolveCharacterSkillBoosts([{ ...character, masterId: "unknown" }]), []);
});
