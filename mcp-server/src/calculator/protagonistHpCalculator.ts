import type { DeckSnapshot, EffectiveCharacterHpAura } from "./types.js";

export interface ProtagonistHpResult {
  schemaVersion: 1;
  status: "provisional";
  baseHp: number;
  summonAuraPercent: number;
  hp: number;
  appliedAuras: EffectiveCharacterHpAura[];
  issues: Array<"fractional-rounding-unresolved">;
}

function roundPercentage(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Applies the already de-duplicated passive summon HP auras to the imported pre-aura HP. */
export function calculateProtagonistHp(deck: DeckSnapshot): ProtagonistHpResult | undefined {
  const baseHp = deck.protagonist.hp;
  if (baseHp === undefined) return undefined;

  const appliedAuras = deck.effectiveCharacterHpAuras ?? [];
  const summonAuraPercent = roundPercentage(
    appliedAuras.reduce((sum, aura) => sum + aura.amountPercent, 0),
  );
  const unroundedHp = baseHp * (1 + summonAuraPercent / 100);
  const hasFraction = !Number.isInteger(unroundedHp);

  return {
    schemaVersion: 1,
    status: "provisional",
    baseHp,
    summonAuraPercent,
    hp: Math.floor(unroundedHp),
    appliedAuras,
    issues: hasFraction ? ["fractional-rounding-unresolved"] : [],
  };
}
