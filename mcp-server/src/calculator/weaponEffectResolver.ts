import type {
  AppliedWeaponSkillModifier,
  DeckSummon,
  DeckWeapon,
  EffectiveWeaponSkillEffect,
  SummonAuraEffectDefinition,
  ResolvedSupportSummon,
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

interface SummonBoostSource {
  summonId: string;
  summonName?: string;
  summonSlot: number;
  position: "main" | "sub" | "support";
  auraName: string;
  verificationStatus: "検証済み" | "下書き";
  effect: Extract<SummonAuraEffectDefinition, { kind: "normal-skill-boost" }>;
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

function matchesSummonBoost(target: EffectSource, boost: SummonBoostSource): boolean {
  if (
    target.effect.kind === "normal-skill-boost" ||
    target.effect.boostGroup !== (boost.effect.boostGroup ?? "normal")
  ) return false;
  if (
    target.effect.elementCode !== undefined &&
    target.effect.elementCode !== boost.effect.elementCode
  ) {
    return false;
  }
  return boost.effect.targetSkillNamePrefixes.some((prefix) => target.skill.name?.startsWith(prefix));
}

function subAuraIdentity(boost: SummonBoostSource): string {
  return [
    boost.effect.elementCode,
    boost.effect.boostGroup ?? "normal",
    [...boost.effect.targetSkillNamePrefixes].sort().join("\u0000"),
  ].join("\u0001");
}

/** Same-effect sub auras do not stack; keep the strongest source and retain first position on ties. */
function selectStrongestSubAuraBoosts(boosts: SummonBoostSource[]): SummonBoostSource[] {
  const strongestByIdentity = new Map<string, SummonBoostSource>();
  for (const boost of boosts) {
    if (boost.effect.activation !== "sub-only") continue;
    const identity = subAuraIdentity(boost);
    const current = strongestByIdentity.get(identity);
    if (current === undefined || boost.effect.amountPercent > current.effect.amountPercent) {
      strongestByIdentity.set(identity, boost);
    }
  }
  return boosts.filter(
    (boost) =>
      boost.effect.activation !== "sub-only" || strongestByIdentity.get(subAuraIdentity(boost)) === boost,
  );
}

/** Resolves catalogued base effects and records every modifier used to boost them. */
export function resolveEffectiveWeaponSkillEffects(
  weapons: DeckWeapon[],
  summons: DeckSummon[] = [],
  supportSummon?: ResolvedSupportSummon,
): WeaponEffectResolution {
  const issues: WeaponEffectResolutionIssue[] = [];
  const reportedLevelIssues = new Set<string>();
  const sources: EffectSource[] = weapons.flatMap((weapon, weaponIndex) =>
    weapon.skills.flatMap((skill) =>
      (skill.effects ?? []).map((effect) => ({ weaponIndex, weapon, skill, effect })),
    ),
  );
  const summonBoosts: SummonBoostSource[] = summons.flatMap((summon) => {
    if (summon.aura === undefined) return [];
    const aura = summon.aura;
    return aura.effects.flatMap((effect): SummonBoostSource[] =>
      effect.kind === "normal-skill-boost" &&
      ((summon.position === "main" && effect.activation !== "sub-only") ||
        (summon.position !== "main" && effect.activation === "sub-only"))
        ? [{
            summonId: summon.masterId,
            summonName: summon.name,
            summonSlot: summon.slot,
            position: summon.position === "main" ? "main" : "sub",
            auraName: aura.name,
            verificationStatus: aura.verificationStatus,
            effect,
          }]
        : [],
    );
  });
  if (supportSummon !== undefined) {
    summonBoosts.push(
      ...supportSummon.aura.effects.flatMap((effect): SummonBoostSource[] =>
        effect.kind === "normal-skill-boost" && effect.activation === "always"
          ? [{
              summonId: supportSummon.masterId,
              summonName: supportSummon.name,
              summonSlot: 0,
              position: "support",
              auraName: supportSummon.aura.name,
              verificationStatus: supportSummon.aura.verificationStatus,
              effect,
            }]
          : [],
      ),
    );
  }
  const applicableSources = sources.filter((source) => {
    if (effectAppliesAtConfiguredLevel(source)) return true;
    const hasApplicableAlternative = sources.some(
      (candidate) =>
        candidate.weaponIndex === source.weaponIndex &&
        candidate.skill === source.skill &&
        candidate.effect.kind === source.effect.kind &&
        effectAppliesAtConfiguredLevel(candidate),
    );
    if (hasApplicableAlternative) return false;
    const issueKey = `${source.weaponIndex}:${source.skill.id}`;
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
    const matchingSummonBoosts = selectStrongestSubAuraBoosts(
      summonBoosts.filter((boost) => matchesSummonBoost(source, boost)),
    );
    if (matchingBoosts.length > 1) {
      issues.push({
        code: "multiple-weapon-skill-boosts-assumed-additive",
        path: `weapons.${source.weaponIndex}.skills`,
        message: `Multiple normal-skill boosts match skill ${source.skill.id ?? "unknown"}; their percentages are provisionally added.`,
      });
    }
    const appliedModifiers: AppliedWeaponSkillModifier[] = [
      ...matchingBoosts.map(
        (boost): AppliedWeaponSkillModifier => ({
          kind: "normal-skill-boost",
          sourceType: "weapon-skill",
          sourceWeaponSlot: boost.weapon.slot,
          sourceSkillId: boost.skill.id ?? "unknown",
          sourceSkillName: boost.skill.name ?? "unknown",
          amountPercent: boost.effect.amountPercent,
          verificationStatus: boost.skill.verificationStatus ?? "下書き",
        }),
      ),
      ...matchingSummonBoosts.map(
        (boost): AppliedWeaponSkillModifier => ({
          kind: "normal-skill-boost",
          sourceType: "summon-aura",
          sourceSummonSlot: boost.summonSlot,
          sourcePosition: boost.position,
          sourceSummonId: boost.summonId,
          sourceSummonName: boost.summonName,
          sourceAuraName: boost.auraName,
          amountPercent: boost.effect.amountPercent,
          verificationStatus: boost.verificationStatus,
        }),
      ),
    ];
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
      hpDependentCurve: source.effect.hpDependentCurve,
      skillLevel: source.effect.skillLevel,
      verificationStatus: source.effect.verificationStatus ?? source.skill.verificationStatus ?? "下書き",
      appliedModifiers,
    };
  });

  return { effects, issues };
}
