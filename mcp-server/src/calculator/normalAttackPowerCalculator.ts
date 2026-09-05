import { resolveBattleSupportSummon } from "./summonCatalog.js";
import type {
  BattleSnapshot,
  DeckSnapshot,
  EffectiveWeaponSkillEffect,
  ResolvedSupportSummon,
} from "./types.js";

export interface NormalAttackPowerOptions {
  /** Defaults to the protagonist element when available. */
  elementCode?: string;
  supportSummon?: ResolvedSupportSummon;
}

export interface NormalAttackPowerIssue {
  code:
    | "unverified-normal-attack-up"
    | "unverified-summon-aura"
    | "normal-skill-summon-boost-not-applied"
    | "support-summon-aura-unresolved";
  message: string;
}

export interface ElementalSummonAuraContribution {
  sourceSummonSlot: number;
  sourceSummonId: string;
  sourceSummonName?: string;
  sourcePosition: "main" | "support";
  auraName: string;
  elementCode?: string;
  amountPercent: number;
  verificationStatus: "検証済み" | "下書き";
}

export interface NormalAttackPowerResult {
  schemaVersion: 1;
  /** This stage only applies the normal weapon-skill frame; it is not final damage. */
  stage: "normal-weapon-skill-frame";
  baseAttack: number;
  contributions: EffectiveWeaponSkillEffect[];
  totalEffectiveNormalAttackPercent: number;
  normalAttackSkillMultiplier: number;
  normalSkillAdjustedAttack: number;
  elementalSummonAuraContributions: ElementalSummonAuraContribution[];
  totalElementalSummonAuraPercent: number;
  summonAuraMultiplier: number;
  summonAuraAdjustedAttack: number;
  issues: NormalAttackPowerIssue[];
}

function roundCalculation(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Applies all matching normal-attack-up effects as one additive weapon-skill frame. */
export function calculateNormalAttackPower(
  deck: DeckSnapshot,
  options: NormalAttackPowerOptions = {},
): NormalAttackPowerResult {
  const baseAttack = deck.protagonist.attack;
  if (baseAttack === undefined || !Number.isFinite(baseAttack) || baseAttack < 0) {
    throw new Error("deck protagonist attack must be a finite non-negative number");
  }
  const elementCode = options.elementCode ?? deck.protagonist.elementCode;
  const contributions = (deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      effect.kind === "normal-attack-up" &&
      (elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode),
  );
  const totalEffectiveNormalAttackPercent = roundCalculation(
    contributions.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0),
  );
  const normalAttackSkillMultiplier = roundCalculation(1 + totalEffectiveNormalAttackPercent / 100);
  const normalSkillAdjustedAttack = roundCalculation(baseAttack * normalAttackSkillMultiplier);
  const elementalSummonAuraContributions = deck.summons.flatMap((summon) => {
    if (summon.position !== "main" || summon.aura === undefined) return [];
    const aura = summon.aura;
    return aura.effects.flatMap((effect): ElementalSummonAuraContribution[] => {
      if (
        effect.kind !== "elemental-attack-up" ||
        (elementCode !== undefined && effect.elementCode !== undefined && effect.elementCode !== elementCode)
      ) {
        return [];
      }
      return [
        {
          sourceSummonSlot: summon.slot,
          sourceSummonId: summon.masterId,
          sourceSummonName: summon.name,
          sourcePosition: "main",
          auraName: aura.name,
          elementCode: effect.elementCode,
          amountPercent: effect.amountPercent,
          verificationStatus: aura.verificationStatus,
        },
      ];
    });
  });
  const supportSummon = options.supportSummon;
  if (supportSummon !== undefined) {
    elementalSummonAuraContributions.push(
      ...supportSummon.aura.effects.flatMap((effect): ElementalSummonAuraContribution[] => {
        if (
          effect.kind !== "elemental-attack-up" ||
          effect.activation !== "always" ||
          (elementCode !== undefined && effect.elementCode !== elementCode)
        ) {
          return [];
        }
        return [
          {
            sourceSummonSlot: 0,
            sourceSummonId: supportSummon.masterId,
            sourceSummonName: supportSummon.name,
            sourcePosition: "support",
            auraName: supportSummon.aura.name,
            elementCode: effect.elementCode,
            amountPercent: effect.amountPercent,
            verificationStatus: supportSummon.aura.verificationStatus,
          },
        ];
      }),
    );
  }
  const totalElementalSummonAuraPercent = roundCalculation(
    elementalSummonAuraContributions.reduce((sum, aura) => sum + aura.amountPercent, 0),
  );
  const summonAuraMultiplier = roundCalculation(1 + totalElementalSummonAuraPercent / 100);
  const summonAuraAdjustedAttack = roundCalculation(normalSkillAdjustedAttack * summonAuraMultiplier);
  const issues: NormalAttackPowerIssue[] = [];
  if (contributions.some((effect) => effect.verificationStatus !== "検証済み")) {
    issues.push({
      code: "unverified-normal-attack-up",
      message: "Normal attack-up calculation contains draft skill data.",
    });
  }
  if (elementalSummonAuraContributions.some((aura) => aura.verificationStatus !== "検証済み")) {
    issues.push({
      code: "unverified-summon-aura",
      message: "Elemental attack calculation contains draft summon aura data.",
    });
  }
  const unsupportedNormalSkillBoost = [
    ...deck.summons.flatMap((summon) =>
      summon.position === "main" && summon.aura !== undefined ? summon.aura.effects : [],
    ),
    ...(supportSummon?.aura.effects ?? []).filter(
      (effect) => "activation" in effect && effect.activation === "always",
    ),
  ].some(
    (effect) =>
      effect.kind === "normal-skill-boost" &&
      (elementCode === undefined || effect.elementCode === elementCode),
  );
  if (unsupportedNormalSkillBoost) {
    issues.push({
      code: "normal-skill-summon-boost-not-applied",
      message: "A matching summon aura boosts normal weapon skills, but that boost is not implemented yet.",
    });
  }

  return {
    schemaVersion: 1,
    stage: "normal-weapon-skill-frame",
    baseAttack,
    contributions,
    totalEffectiveNormalAttackPercent,
    normalAttackSkillMultiplier,
    normalSkillAdjustedAttack,
    elementalSummonAuraContributions,
    totalElementalSummonAuraPercent,
    summonAuraMultiplier,
    summonAuraAdjustedAttack,
    issues,
  };
}

/** Resolves the battle's support summon before calculating the attack stages. */
export function calculateBattleNormalAttackPower(
  deck: DeckSnapshot,
  battle: BattleSnapshot,
  options: Omit<NormalAttackPowerOptions, "supportSummon"> = {},
): NormalAttackPowerResult {
  const supportSummon = resolveBattleSupportSummon(battle);
  const result = calculateNormalAttackPower(deck, { ...options, supportSummon });
  if (battle.supportSummon !== undefined && supportSummon === undefined) {
    result.issues.push({
      code: "support-summon-aura-unresolved",
      message: `Support summon ${battle.supportSummon.masterId ?? "unknown"} is not registered in the incremental catalog.`,
    });
  }
  return result;
}
