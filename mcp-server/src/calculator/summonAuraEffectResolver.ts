import type {
  DeckSummon,
  EffectiveCharacterHpAura,
  EffectiveCharacterHpFlatAura,
  ResolvedSupportSummon,
} from "./types.js";

type HpAuraSource = Omit<DeckSummon, "position"> & { position: DeckSummon["position"] | "support" };

function sources(summons: DeckSummon[], support?: ResolvedSupportSummon): HpAuraSource[] {
  return [...summons, ...(support ? [{ ...support, slot: 0, position: "support" as const }] : [])];
}

function sourcePosition(summon: HpAuraSource): "main" | "sub" | "support" {
  return summon.position === "grid" ? "sub" : summon.position;
}

function appliesFromPosition(summon: HpAuraSource, activation: "always" | "main-only" | "sub-only"): boolean {
  if (summon.position === "support") return activation === "always";
  if (summon.position === "main") return activation !== "sub-only";
  return activation === "sub-only";
}

/**
 * Resolves passive character-HP summon auras for one character element.
 * Same-group effects do not stack: the strongest source wins and slot order breaks ties.
 */
export function resolveEffectiveCharacterHpAuras(
  summons: DeckSummon[],
  characterElementCode?: string,
  supportSummon?: ResolvedSupportSummon,
): EffectiveCharacterHpAura[] {
  if (characterElementCode === undefined) return [];

  const candidates = sources(summons, supportSummon).flatMap((summon): EffectiveCharacterHpAura[] => {
    if (summon.aura === undefined) return [];
    const aura = summon.aura;
    return aura.effects.flatMap((effect): EffectiveCharacterHpAura[] =>
      effect.kind === "character-hp-up" &&
      (effect.elementCode === "0" || effect.elementCode === characterElementCode) &&
      appliesFromPosition(summon, effect.activation)
        ? [{
            kind: effect.kind,
            elementCode: effect.elementCode,
            amountPercent: effect.amountPercent,
            stackingGroup: effect.stackingGroup,
            sourceSummonSlot: summon.slot,
            sourcePosition: sourcePosition(summon),
            sourceSummonId: summon.masterId,
            sourceSummonName: summon.name,
            sourceAuraName: aura.name,
            verificationStatus: aura.verificationStatus,
          }]
        : [],
    );
  });

  const strongestByGroup = new Map<string, EffectiveCharacterHpAura>();
  for (const candidate of candidates) {
    const key = candidate.sourcePosition === "sub"
      ? `${candidate.stackingGroup}`
      : `${candidate.sourcePosition}\u0000${candidate.sourceSummonSlot}\u0000${candidate.stackingGroup}`;
    const current = strongestByGroup.get(key);
    if (current === undefined || candidate.amountPercent > current.amountPercent) {
      strongestByGroup.set(key, candidate);
    }
  }
  return [...strongestByGroup.values()];
}

/** Resolves flat character-HP summon auras after weapon and percentage HP stages. */
export function resolveEffectiveCharacterHpFlatAuras(
  summons: DeckSummon[],
  characterElementCode?: string,
  supportSummon?: ResolvedSupportSummon,
): EffectiveCharacterHpFlatAura[] {
  if (characterElementCode === undefined) return [];

  return sources(summons, supportSummon).flatMap((summon): EffectiveCharacterHpFlatAura[] => {
    if (summon.aura === undefined) return [];
    const aura = summon.aura;
    return aura.effects.flatMap((effect): EffectiveCharacterHpFlatAura[] =>
      effect.kind === "character-hp-flat" &&
      (effect.elementCode === "0" || effect.elementCode === characterElementCode) &&
      appliesFromPosition(summon, effect.activation)
        ? [{
            kind: effect.kind,
            elementCode: effect.elementCode,
            amount: effect.amount,
            sourceSummonSlot: summon.slot,
            sourcePosition: sourcePosition(summon),
            sourceSummonId: summon.masterId,
            sourceSummonName: summon.name,
            sourceAuraName: aura.name,
            verificationStatus: aura.verificationStatus,
          }]
        : [],
    );
  });
}
