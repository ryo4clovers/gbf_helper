import type { AccountBonusSnapshot, DeckSnapshot, EffectiveWeaponSkillEffect } from "./types.js";

export interface MultiattackRateContribution {
  sourceType:
    | "job-base"
    | "job-level"
    | "master-level"
    | "perfection-proof"
    | "weapon-skill"
    | "account-item"
    | "user-input";
  sourceName: string;
  doubleAttackRatePercent: number;
  tripleAttackRatePercent: number;
  verificationStatus: "検証済み" | "下書き";
}

export interface ProtagonistMultiattackRateResult {
  schemaVersion: 1;
  status: "provisional";
  scope: "job-and-weapon-skills";
  doubleAttackRatePercent: number;
  tripleAttackRatePercent: number;
  uncappedDoubleAttackRatePercent: number;
  uncappedTripleAttackRatePercent: number;
  contributions: MultiattackRateContribution[];
  issues: Array<"job-base-rate-unresolved" | "character-effects-unresolved" | "battle-buffs-unresolved">;
}

function roundPercentage(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function matchingWeaponRateEffects(
  deck: DeckSnapshot,
  kind: "double-attack-rate-up" | "triple-attack-rate-up",
): EffectiveWeaponSkillEffect[] {
  const elementCode = deck.protagonist.elementCode;
  return (deck.effectiveWeaponSkillEffects ?? []).filter(
    (effect) =>
      effect.kind === kind &&
      (elementCode === undefined || effect.elementCode === undefined || effect.elementCode === elementCode),
  );
}

/** Resolves static protagonist rates. Dynamic character effects and battle buffs remain outside this scope. */
export function calculateProtagonistMultiattackRates(
  deck: DeckSnapshot,
  accountBonuses?: AccountBonusSnapshot,
): ProtagonistMultiattackRateResult {
  const job = deck.protagonist.job;
  const contributions: MultiattackRateContribution[] = [];
  if (job?.baseDoubleAttackRate !== undefined || job?.baseTripleAttackRate !== undefined) {
    contributions.push({
      sourceType: "job-base",
      sourceName: `${job.name ?? job.masterId} 基礎率`,
      doubleAttackRatePercent: job.baseDoubleAttackRate ?? 0,
      tripleAttackRatePercent: job.baseTripleAttackRate ?? 0,
      verificationStatus: "下書き",
    });
  }
  for (const bonus of job?.multiattackRateBonuses ?? []) {
    contributions.push({
      sourceType: bonus.sourceType,
      sourceName: `${job?.name ?? job?.masterId ?? "ジョブ"} ${bonus.sourceType} Lv${bonus.level}`,
      doubleAttackRatePercent: bonus.doubleAttackRatePercent,
      tripleAttackRatePercent: bonus.tripleAttackRatePercent,
      verificationStatus: bonus.verificationStatus,
    });
  }
  const doubleEffects = matchingWeaponRateEffects(deck, "double-attack-rate-up");
  const tripleEffects = matchingWeaponRateEffects(deck, "triple-attack-rate-up");
  const weaponEffects = new Map<string, MultiattackRateContribution>();
  for (const effect of [...doubleEffects, ...tripleEffects]) {
    const key = `${effect.sourceWeaponSlot}:${effect.sourceSkillId}`;
    const contribution = weaponEffects.get(key) ?? {
      sourceType: "weapon-skill" as const,
      sourceName: effect.sourceSkillName,
      doubleAttackRatePercent: 0,
      tripleAttackRatePercent: 0,
      verificationStatus: effect.verificationStatus,
    };
    if (effect.kind === "double-attack-rate-up") contribution.doubleAttackRatePercent += effect.effectiveAmountPercent;
    if (effect.kind === "triple-attack-rate-up") contribution.tripleAttackRatePercent += effect.effectiveAmountPercent;
    weaponEffects.set(key, contribution);
  }
  contributions.push(...weaponEffects.values());
  const protagonistElementCode = deck.protagonist.elementCode;
  for (const modifier of accountBonuses?.modifiers ?? []) {
    if (modifier.stage !== "double-attack-rate" && modifier.stage !== "triple-attack-rate") continue;
    if (modifier.elementCode !== undefined && modifier.elementCode !== protagonistElementCode) continue;
    contributions.push({
      sourceType: modifier.sourceType === "account-item" ? "account-item" : "user-input",
      sourceName: modifier.sourceName,
      doubleAttackRatePercent: modifier.stage === "double-attack-rate" ? modifier.amountPercent : 0,
      tripleAttackRatePercent: modifier.stage === "triple-attack-rate" ? modifier.amountPercent : 0,
      verificationStatus: modifier.verificationStatus,
    });
  }

  const uncappedDoubleAttackRatePercent = roundPercentage(
    contributions.reduce((sum, contribution) => sum + contribution.doubleAttackRatePercent, 0),
  );
  const uncappedTripleAttackRatePercent = roundPercentage(
    contributions.reduce((sum, contribution) => sum + contribution.tripleAttackRatePercent, 0),
  );
  return {
    schemaVersion: 1,
    status: "provisional",
    scope: "job-and-weapon-skills",
    doubleAttackRatePercent: Math.min(100, Math.max(0, uncappedDoubleAttackRatePercent)),
    tripleAttackRatePercent: Math.min(100, Math.max(0, uncappedTripleAttackRatePercent)),
    uncappedDoubleAttackRatePercent,
    uncappedTripleAttackRatePercent,
    contributions,
    issues: [
      ...(job?.baseDoubleAttackRate === undefined || job.baseTripleAttackRate === undefined
        ? (["job-base-rate-unresolved"] as const)
        : []),
      ...(deck.characters.length > 0 ? (["character-effects-unresolved"] as const) : []),
      "battle-buffs-unresolved",
    ],
  };
}
