import { calculateCombatHp, calculateProtagonistHp } from "./protagonistHpCalculator.js";
import { resolveEffectiveCharacterHpAuras, resolveEffectiveCharacterHpFlatAuras } from "./summonAuraEffectResolver.js";
import type { DeckSnapshot, EffectiveWeaponSkillEffect, ResolvedSupportSummon } from "./types.js";

/** One-time Bloodshed damage after max HP is resolved. Never changes healing capacity. */
export function calculateBattleStartHp(maxHp: number | undefined, elementCode: string | undefined,
  effects: EffectiveWeaponSkillEffect[] = []) {
  if (maxHp === undefined) return undefined;
  const appliedEffects = effects.filter(effect => effect.kind === "battle-start-hp-damage"
    && (effect.elementCode === undefined || effect.elementCode === "0" || effect.elementCode === elementCode));
  const totalPercent = appliedEffects.reduce((sum, effect) => sum + effect.effectiveAmountPercent, 0);
  // 20% per copy; shared 40% cap is a secondary-source candidate, not measured here.
  const effectivePercent = Math.min(40, Math.max(0, totalPercent));
  const damage = Math.min(maxHp - 1, Math.floor(maxHp * effectivePercent / 100));
  return { maxHp, hp: maxHp - damage, damage, totalPercent, effectivePercent, appliedEffects,
    issues: appliedEffects.length ? ["battle-start-hp-damage-provisional"] : [] };
}

/** Starting max HP; does not overwrite the party screen's displayed base HP. */
export function calculateBattleHp(deck: DeckSnapshot, supportSummon?: ResolvedSupportSummon, divineStampBookEnabled = false) {
  const protagonist = calculateProtagonistHp(deck);
  return {
    protagonist,
    protagonistStart: calculateBattleStartHp(protagonist?.hp, deck.protagonist.elementCode, deck.effectiveWeaponSkillEffects),
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
        start: calculateBattleStartHp(result?.hp, character.elementCode, deck.effectiveWeaponSkillEffects),
        perpetuityRingPercent, divineStampBookPercent };
    }),
  };
}
