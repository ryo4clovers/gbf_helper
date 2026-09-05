import type {
  AppliedWeaponSkillModifier,
  DeckWeapon,
  EffectiveWeaponSkillEffect,
  WeaponSkillEffectDefinition,
} from "./types.js";

export type WeaponEffectResolutionIssueCode =
  | "weapon-skill-level-unresolved"
  | "multiple-weapon-skill-boosts-assumed-additive";

export interface WeaponEffectResolutionIssue {
  code: WeaponEffectResolutionIssueCode;
  path: string;
  message: string;
}

export interface WeaponEffectResolution {
  effects: EffectiveWeaponSkillEffect[];
  issues: WeaponEffectResolutionIssue[];
}

interface EffectSource {
  weaponIndex: number;
  weapon: DeckWeapon;
  skill: DeckWeapon["skills"][number];
  effect: WeaponSkillEffectDefinition;
}

function roundPercentage(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function effectAppliesAtConfiguredLevel(source: EffectSource): boolean {
  return source.effect.skillLevel === undefined || source.weapon.skillLevel === source.effect.skillLevel;
}

function matchesBoost(target: EffectSource, boost: EffectSource): boolean {
  if (boost.effect.kind !== "normal-skill-boost") return false;
  if (target.effect.kind === "normal-skill-boost") return false;
  if (target.effect.boostGroup !== boost.effect.boostGroup) return false;
  if (
    boost.effect.elementCode !== undefined &&
    target.effect.elementCode !== undefined &&
    boost.effect.elementCode !== target.effect.elementCode
  ) {
    return false;
  }
  const prefixes = boost.effect.targetSkillNamePrefixes ?? [];
  return prefixes.some((prefix) => target.skill.name?.startsWith(prefix));
}

/** Resolves catalogued base effects and records every modifier used to boost them. */
export function resolveEffectiveWeaponSkillEffects(weapons: DeckWeapon[]): WeaponEffectResolution {
  const issues: WeaponEffectResolutionIssue[] = [];
  const reportedLevelIssues = new Set<string>();
  const sources: EffectSource[] = weapons.flatMap((weapon, weaponIndex) =>
    weapon.skills.flatMap((skill) =>
      (skill.effects ?? []).map((effect) => ({ weaponIndex, weapon, skill, effect })),
    ),
  );
  const applicableSources = sources.filter((source) => {
    if (effectAppliesAtConfiguredLevel(source)) return true;
    const issueKey = `${source.weaponIndex}:${source.skill.id}:${source.effect.skillLevel}`;
    if (!reportedLevelIssues.has(issueKey)) {
      reportedLevelIssues.add(issueKey);
      issues.push({
        code: "weapon-skill-level-unresolved",
        path: `weapons.${source.weaponIndex}.skillLevel`,
        message: `Skill ${source.skill.id ?? "unknown"} has data for SLv${source.effect.skillLevel}, but the configured level is ${source.weapon.skillLevel ?? "missing"}.`,
      });
    }
    return false;
  });
  const boosts = applicableSources.filter((source) => source.effect.kind === "normal-skill-boost");

  const effects = applicableSources.map((source): EffectiveWeaponSkillEffect => {
    const matchingBoosts = boosts.filter((boost) => matchesBoost(source, boost));
    if (matchingBoosts.length > 1) {
      issues.push({
        code: "multiple-weapon-skill-boosts-assumed-additive",
        path: `weapons.${source.weaponIndex}.skills`,
        message: `Multiple boosts match skill ${source.skill.id ?? "unknown"}; their percentages are provisionally added.`,
      });
    }
    const appliedModifiers: AppliedWeaponSkillModifier[] = matchingBoosts.map((boost) => ({
      kind: "normal-skill-boost",
      sourceWeaponSlot: boost.weapon.slot,
      sourceSkillId: boost.skill.id ?? "unknown",
      sourceSkillName: boost.skill.name ?? "unknown",
      amountPercent: boost.effect.amountPercent,
      verificationStatus: boost.skill.verificationStatus ?? "下書き",
    }));
    const boostPercent = appliedModifiers.reduce((sum, modifier) => sum + modifier.amountPercent, 0);

    return {
      sourceWeaponSlot: source.weapon.slot,
      sourceWeaponId: source.weapon.masterId,
      sourceSkillId: source.skill.id ?? "unknown",
      sourceSkillName: source.skill.name ?? "unknown",
      kind: source.effect.kind,
      elementCode: source.effect.elementCode,
      baseAmountPercent: source.effect.amountPercent,
      effectiveAmountPercent: roundPercentage(source.effect.amountPercent * (1 + boostPercent / 100)),
      skillLevel: source.effect.skillLevel,
      verificationStatus: source.skill.verificationStatus ?? "下書き",
      appliedModifiers,
    };
  });

  return { effects, issues };
}
