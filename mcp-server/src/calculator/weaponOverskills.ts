import type { DeckSnapshot } from "./types.js";
import type { DamageAttenuationProfile } from "./damageAttenuationCalculator.js";

/** Weapon frames only: actor buffs and account caps never generate overskills. */
export function calculateWeaponOverskills(deck: DeckSnapshot) {
  const sum = (kind: string) => (deck.effectiveWeaponSkillEffects ?? [])
    .filter(effect => effect.kind === kind && (!effect.elementCode || effect.elementCode === deck.protagonist.elementCode))
    .reduce((total, effect) => total + effect.effectiveAmountPercent, 0);
  const excessCap = Math.max(0, sum("normal-frame-damage-cap-up") - 20)
    + Math.max(0, sum("special-frame-damage-cap-up") - 20);
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  return {
    verificationStatus: "下書き" as const,
    damageCapPenetrationPercent: excessCap < 2 ? 0 : round(Math.min(20, excessCap / 2)),
    addedHitRatePercent: round(Math.min(100, Math.max(0, sum("double-attack-rate-up") - 75) * .4
      + Math.max(0, sum("triple-attack-rate-up") - 75) * .6)),
    sources: ["https://gbf.wiki/Overskills", "https://gbf.wiki/Damage_Cap"],
  };
}

/** Penetration raises the retained fraction, not thresholds or the unattenuated segment. */
export function applyDamageCapPenetration(profile: DamageAttenuationProfile, percent: number): DamageAttenuationProfile {
  if (!Number.isFinite(percent) || percent < 0 || percent > 20) throw new Error("Invalid weapon damage cap penetration");
  if (percent === 0) return profile;
  return { ...profile, lines: profile.lines.map(line => ({ ...line, passRate: Math.min(1, line.passRate * (1 + percent / 100)) })) };
}
