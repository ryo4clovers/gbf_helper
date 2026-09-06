import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveEffectiveWeaponSkillEffects } from "../src/calculator/weaponEffectResolver.ts";
import type {
  DeckWeapon,
  ResolvedSupportSummon,
  WeaponSkillEffectDefinition,
} from "../src/calculator/types.ts";

function weaponWithSkill(options: {
  slot: number;
  skillLevel?: number;
  skillId: string;
  skillName: string;
  verificationStatus?: "検証済み" | "下書き";
  effects: WeaponSkillEffectDefinition[];
}): DeckWeapon {
  return {
    slot: options.slot,
    position: options.slot === 1 ? "main" : "grid",
    masterId: `weapon-${options.slot}`,
    skillLevel: options.skillLevel,
    skills: [
      {
        sourceKey: "skill1",
        id: options.skillId,
        name: options.skillName,
        verificationStatus: options.verificationStatus ?? "検証済み",
        effects: options.effects,
      },
    ],
  };
}

test("calculates boosted effects while preserving the base value and modifier provenance", () => {
  const result = resolveEffectiveWeaponSkillEffects([
    weaponWithSkill({
      slot: 1,
      skillLevel: 15,
      skillId: "boost",
      skillName: "オプティマスブースト・ファイア",
      effects: [
        {
          kind: "normal-skill-boost",
          elementCode: "1",
          amountPercent: 30,
          skillLevel: 15,
          boostGroup: "normal",
          targetSkillNamePrefixes: ["火", "業火", "紅蓮"],
        },
      ],
    }),
    weaponWithSkill({
      slot: 2,
      skillLevel: 15,
      skillId: "target",
      skillName: "紅蓮の襲刃",
      verificationStatus: "下書き",
      effects: [
        {
          kind: "elemental-pursuit",
          elementCode: "1",
          amountPercent: 4.5,
          skillLevel: 15,
          boostGroup: "normal",
        },
      ],
    }),
  ]);

  assert.equal(result.effects[1].baseAmountPercent, 4.5);
  assert.equal(result.effects[1].effectiveAmountPercent, 5.85);
  assert.deepEqual(result.effects[1].appliedModifiers, [
    {
      kind: "normal-skill-boost",
      sourceType: "weapon-skill",
      sourceWeaponSlot: 1,
      sourceSkillId: "boost",
      sourceSkillName: "オプティマスブースト・ファイア",
      amountPercent: 30,
      verificationStatus: "検証済み",
    },
  ]);
  assert.deepEqual(result.issues, []);
});

test("does not guess effects for a different or missing skill level", () => {
  const result = resolveEffectiveWeaponSkillEffects([
    weaponWithSkill({
      slot: 1,
      skillLevel: 10,
      skillId: "multi-effect",
      skillName: "火の刹那",
      effects: [
        {
          kind: "normal-attack-up",
          amountPercent: 12,
          skillLevel: 15,
          boostGroup: "normal",
        },
        {
          kind: "critical-rate-up",
          amountPercent: 3,
          skillLevel: 15,
          boostGroup: "normal",
        },
      ],
    }),
  ]);

  assert.deepEqual(result.effects, []);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].code, "weapon-skill-level-unresolved");
  assert.equal(result.issues[0].path, "weapons.0.skillLevel");
});

test("reports the provisional additive assumption when multiple boosts match", () => {
  const boostEffect: WeaponSkillEffectDefinition = {
    kind: "normal-skill-boost",
    elementCode: "1",
    amountPercent: 30,
    skillLevel: 15,
    boostGroup: "normal",
    targetSkillNamePrefixes: ["紅蓮"],
  };
  const result = resolveEffectiveWeaponSkillEffects([
    weaponWithSkill({
      slot: 1,
      skillLevel: 15,
      skillId: "boost-1",
      skillName: "ブースト1",
      effects: [boostEffect],
    }),
    weaponWithSkill({
      slot: 2,
      skillLevel: 15,
      skillId: "boost-2",
      skillName: "ブースト2",
      effects: [boostEffect],
    }),
    weaponWithSkill({
      slot: 3,
      skillLevel: 15,
      skillId: "target",
      skillName: "紅蓮の襲刃",
      effects: [
        {
          kind: "elemental-pursuit",
          elementCode: "1",
          amountPercent: 4.5,
          skillLevel: 15,
          boostGroup: "normal",
        },
      ],
    }),
  ]);

  assert.equal(result.effects[2].effectiveAmountPercent, 7.2);
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ["multiple-weapon-skill-boosts-assumed-additive"],
  );
});

test("applies only always-active support aura boosts and records support provenance", () => {
  const supportSummon = {
    masterId: "support-agni",
    name: "サポートアグニス",
    elementCode: "1",
    aura: {
      name: "テスト加護",
      description: "通常加護とメイン限定加護",
      effects: [
        {
          kind: "normal-skill-boost",
          elementCode: "1",
          amountPercent: 170,
          targetSkillNamePrefixes: ["紅蓮"],
          activation: "always",
          description: "通常加護",
        },
        {
          kind: "normal-skill-boost",
          elementCode: "1",
          amountPercent: 999,
          targetSkillNamePrefixes: ["紅蓮"],
          activation: "main-only",
          description: "メイン限定",
        },
      ],
      verificationStatus: "検証済み",
      source: "test",
    },
  } satisfies ResolvedSupportSummon;
  const result = resolveEffectiveWeaponSkillEffects(
    [
      weaponWithSkill({
        slot: 1,
        skillLevel: 15,
        skillId: "target",
        skillName: "紅蓮の攻刃",
        effects: [
          {
            kind: "normal-attack-up",
            amountPercent: 18,
            skillLevel: 15,
            boostGroup: "normal",
          },
        ],
      }),
    ],
    [],
    supportSummon,
  );

  assert.equal(result.effects[0]?.effectiveAmountPercent, 48.6);
  assert.deepEqual(result.effects[0]?.appliedModifiers, [
    {
      kind: "normal-skill-boost",
      sourceType: "summon-aura",
      sourceSummonSlot: 0,
      sourcePosition: "support",
      sourceSummonId: "support-agni",
      sourceSummonName: "サポートアグニス",
      sourceAuraName: "テスト加護",
      amountPercent: 170,
      verificationStatus: "検証済み",
    },
  ]);
});
