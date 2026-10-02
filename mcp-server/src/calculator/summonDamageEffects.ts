import type { DeckSnapshot } from "./types.js";

export function resolveSummonDamageEffects(deck: DeckSnapshot, targetElementCode?: string, enemyMaxHp?: number, currentHpPercent = 100) {
  const groups = new Map<string, { capPercent: number; amplificationPercent: number; supplementalDamage: number; sourceSummonId: string; source: string }>();
  let enemyHpCapUnresolved = false;
  for (const summon of deck.summons) {
    for (const effect of summon.aura?.effects ?? []) {
      if (effect.kind !== "damage-cap-up" && effect.kind !== "damage-dealt-up" && effect.kind !== "supplemental-damage") continue;
      if ((summon.position === "main" ? effect.activation === "sub-only" : effect.activation === "main-only")
        || (effect.elementCode !== "0" && effect.elementCode !== deck.protagonist.elementCode)
        || ("targetElementCode" in effect && effect.targetElementCode !== undefined && effect.targetElementCode !== targetElementCode)) continue;
      if (effect.kind === "supplemental-damage" && currentHpPercent < (effect.minimumHpPercent ?? 0)) continue;
      const key = `${effect.kind}:${effect.stackingGroup}`;
      const current = groups.get(key);
      let amount = effect.kind === "supplemental-damage" ? effect.amountFlat : effect.amountPercent;
      if (effect.kind === "supplemental-damage" && effect.enemyMaxHpPercent !== undefined) {
        if (enemyMaxHp === undefined) enemyHpCapUnresolved = true;
        else amount = Math.min(amount, Math.ceil(enemyMaxHp * effect.enemyMaxHpPercent / 100));
      }
      const previous = current ? current.capPercent + current.amplificationPercent + current.supplementalDamage : -1;
      if (amount <= previous) continue;
      groups.set(key, {
        capPercent: effect.kind === "damage-cap-up" ? amount : 0,
        amplificationPercent: effect.kind === "damage-dealt-up" ? amount : 0,
        supplementalDamage: effect.kind === "supplemental-damage" ? amount : 0,
        sourceSummonId: summon.masterId, source: summon.aura?.source ?? "unknown",
      });
    }
  }
  const contributions = [...groups.values()];
  return {
    capPercent: contributions.reduce((sum, effect) => sum + effect.capPercent, 0),
    amplificationPercent: contributions.reduce((sum, effect) => sum + effect.amplificationPercent, 0),
    supplementalDamage: contributions.reduce((sum, effect) => sum + effect.supplementalDamage, 0),
    contributions, enemyHpCapUnresolved, verificationStatus: "下書き" as const,
  };
}
