import type { DeckSnapshot } from "./types.js";

/** Numeric support values are secondary-source data, not independently verified effects. */
export function resolveProtagonistNormalAttackSupport(deck: DeckSnapshot, currentLevel?: number) {
  if (currentLevel !== undefined && (!Number.isInteger(currentLevel) || currentLevel < 0 || currentLevel > 5)) {
    throw new Error("mythicalLancerLevel must be an integer in 0..5");
  }
  const job = deck.protagonist.job;
  const mainKind = deck.weapons.find((weapon) => weapon.position === "main")?.weaponKindCode;
  const lancer = job?.masterId === "190501";
  const both = lancer && (job.level ?? 0) >= 40;
  const spear = lancer && (both || mainKind === "3");
  const axe = lancer && (both || mainKind === "4");
  const initialMythicalLancerLevel = lancer && (job?.level ?? 0) >= 20
    ? Math.min(5, deck.weapons.filter((weapon) => weapon.weaponKindCode === "3" || weapon.weaponKindCode === "4").length) : 0;
  return {
    initialMythicalLancerLevel,
    mythicalLancerLevel: lancer ? currentLevel ?? initialMythicalLancerLevel : 0,
    levelSource: currentLevel === undefined ? "equipped-weapons-at-battle-start" : "explicit-battle-state",
    perpetuityAttackPercent: lancer ? (currentLevel ?? initialMythicalLancerLevel) * 6 : 0,
    randomTargetHitCount: spear ? 2 : 1,
    supplementalDamage: spear ? 30_000 : 0,
    damageCapPercent: axe ? 10 : 0,
    criticalDamageBonusPercent: axe ? 20 : 0,
    criticalTriggerRatePercent: axe ? 100 : 0,
    verificationStatus: "下書き" as const,
    source: "https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/537572",
  };
}
