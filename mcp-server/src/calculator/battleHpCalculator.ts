import { calculateCombatHp, calculateProtagonistHp } from "./protagonistHpCalculator.js";
import { resolveEffectiveCharacterHpAuras, resolveEffectiveCharacterHpFlatAuras } from "./summonAuraEffectResolver.js";
import type { DeckSnapshot, ResolvedSupportSummon } from "./types.js";

/** Starting max HP; does not overwrite the party screen's displayed base HP. */
export function calculateBattleHp(deck: DeckSnapshot, supportSummon?: ResolvedSupportSummon, divineStampBookEnabled = false) {
  return {
    protagonist: calculateProtagonistHp(deck),
    characters: deck.characters.map(character => {
      const perpetuityRingPercent = character.perpetuityRing ? 10 : 0;
      // Same explicitly supported general as the damage model. Never infer from name.
      const divineStampBookPercent = divineStampBookEnabled && character.masterId === "3040512000" ? 10 : 0;
      const result = calculateCombatHp({ baseHp: character.hp, elementCode: character.elementCode,
        effects: deck.effectiveWeaponSkillEffects,
        auras: resolveEffectiveCharacterHpAuras(deck.summons, character.elementCode, supportSummon),
        flatAuras: resolveEffectiveCharacterHpFlatAuras(deck.summons, character.elementCode, supportSummon),
        otherHpPercent: perpetuityRingPercent + divineStampBookPercent,
      });
      return { slot: character.slot, characterId: character.masterId, result,
        perpetuityRingPercent, divineStampBookPercent };
    }),
  };
}
