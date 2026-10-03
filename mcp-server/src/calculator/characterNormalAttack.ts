import { resolveProtagonistNormalAttackSupport } from "./protagonistNormalAttackSupport.js";
import type { CharacterLimitBonuses, DamageCalculationInput } from "./types.js";
import { normalStaminaLimitBonusPercent, resolveCharacterMastery } from "./characterMastery.js";

const SOURCES: Record<string, string> = {
  "3040512000": "https://gbf.wiki/Cidala_(Valentine)",
  "3040611000": "https://gbf.wiki/Sariel",
  "3040456000": "https://gbf.wiki/Ilsa_(Yukata)",
};

const NORMAL_IRRELEVANT_ARTIFACTS = new Set(["攻撃力", "HP", "防御力", "ダブルアタック確率", "トリプルアタック確率",
  "アビリティダメージ", "奥義ダメージ", "弱体耐性"]);

export function resolveCharacterArtifact(input: DamageCalculationInput) {
  const character = selectedCharacter(input);
  let fullHpAmplificationPercent = 0;
  let elementalAttackPercent = 0;
  let normalAttackSupplementalDamage = 0;
  let normalAttackCapPercent = 0;
  let randomStartBuffs = false;
  const unsupportedSkills: string[] = [];
  for (const skill of character?.artifact?.skills ?? []) {
    if (NORMAL_IRRELEVANT_ARTIFACTS.has(skill.name)) continue;
    if (skill.skillId === "50211" && skill.name === "バトル開始時に自分に一定個数ランダムな強化効果") { randomStartBuffs = true; continue; }
    const percent = /^\+(\d+(?:\.\d+)?)%$/.exec(skill.effectValue)?.[1];
    const amount = /^\+(\d+)$/.exec(skill.effectValue)?.[1];
    if (skill.name === "HPが100%の時、与ダメージUP" && percent !== undefined) fullHpAmplificationPercent += Number(percent);
    else if (skill.name === "自属性攻撃力" && percent !== undefined) elementalAttackPercent += Number(percent);
    else if (skill.name === "通常攻撃の与ダメージ上昇" && amount !== undefined) normalAttackSupplementalDamage += Number(amount);
    else if (skill.name === "通常攻撃ダメージ上限" && percent !== undefined) normalAttackCapPercent += Number(percent);
    else unsupportedSkills.push(skill.skillId);
  }
  if (randomStartBuffs && input.attacker?.artifactStartBuffs === undefined) throw new Error("Artifact random start buffs require explicit observed outcomes");
  return { fullHpAmplificationPercent: (input.attacker?.currentHpPercent ?? input.protagonistCurrentHpPercent ?? 100) === 100 ? fullHpAmplificationPercent : 0,
    elementalAttackPercent, normalAttackSupplementalDamage,
    damageCapPercent: normalAttackCapPercent + (randomStartBuffs && input.attacker?.artifactStartBuffs?.damageCapUp ? 10 : 0),
    normalAttackPercent: randomStartBuffs && input.attacker?.artifactStartBuffs?.attackUp ? 50 : 0,
    unsupportedSkills, source: "https://gbf.wiki/Artifacts", verificationStatus: "下書き" as const };
}

export function hasCharacterNormalAttackModel(characterId: string): boolean {
  return Object.hasOwn(SOURCES, characterId);
}

/** Import only damage-related allocations; flat stats already belong to displayed ATK/HP. */
export function importCharacterLimitBonuses(value: unknown): CharacterLimitBonuses {
  const rows = (value as { bonus_list?: unknown[] })?.bonus_list;
  if (!Array.isArray(rows)) throw new Error("Character LB list is missing");
  const byName = (name: string) => rows.flatMap((row) => {
    if (row === null || typeof row !== "object") throw new Error("Invalid character LB entry");
    const bonus = row as { name?: string; current_level?: unknown };
    if (bonus.name !== name) return [];
    if (bonus.current_level === null || typeof bonus.current_level === "boolean" || bonus.current_level === "") {
      throw new Error("Invalid character LB stars");
    }
    const stars = Number(bonus.current_level);
    if (!Number.isInteger(stars) || stars < 0 || stars > 3) throw new Error("Character LB stars must be in 0..3");
    return [stars];
  });
  return { elementAttackLevels: byName("闇属性攻撃力"), staminaLevel: byName("渾身")[0],
    criticalLevels: byName("クリティカル確率") };
}

export function selectedCharacter(input: DamageCalculationInput) {
  if (!input.attacker) return undefined;
  const character = input.deck.characters.find((entry) => entry.slot === input.attacker!.characterSlot && entry.position === "front");
  if (!character || !hasCharacterNormalAttackModel(character.masterId)) throw new Error("Selected character has no supported normal-attack model");
  if (character.attack === undefined) throw new Error("Selected character displayed attack is required");
  if (character.elementCode !== undefined && character.elementCode !== "6") throw new Error("Supported dark character has inconsistent elementCode");
  if (character.masterId === "3040512000" && input.attacker.coupledConfectionActive === undefined) {
    throw new Error("Cidala requires explicit coupledConfectionActive state");
  }
  if (character.limitBonuses?.criticalLevels?.some((level) => level > 0)) {
    throw new Error("Character random critical LB is not yet supported; do not omit an active allocation");
  }
  return character;
}

/** An immutable actor view lets the shared weapon/crew/element calculations use displayed character ATK. */
export function prepareNormalAttackActor(input: DamageCalculationInput): DamageCalculationInput {
  const character = selectedCharacter(input);
  if (!character) return input;
  const elementalPercent = (character.limitBonuses?.elementAttackLevels ?? []).reduce((sum, stars) => sum + [0, 5, 8, 10][stars], 0)
    + resolveCharacterArtifact(input).elementalAttackPercent;
  return { ...input, protagonistCurrentHpPercent: input.attacker?.currentHpPercent ?? 100,
    incomingDamage: undefined, abilityDamage: undefined,
    deck: { ...input.deck, protagonist: { attack: character.attack, hp: character.hp, elementCode: character.elementCode ?? "6" } },
    accountBonuses: { schemaVersion: 1, issues: input.accountBonuses?.issues ?? [], modifiers: [
      ...(input.accountBonuses?.modifiers ?? []),
      ...(elementalPercent === 0 ? [] : [{ stage: "elemental-attack" as const, amountPercent: elementalPercent,
        sourceType: "user-input" as const, sourceId: "character-element-enhancements", sourceName: "キャラクター属性攻撃LB/アーティファクト",
        elementCode: character.elementCode ?? "6", verificationStatus: "下書き" as const }]),
    ] } };
}

export function resolveNormalAttackSupport(input: DamageCalculationInput) {
  const character = selectedCharacter(input);
  if (!character) {
    const support = resolveProtagonistNormalAttackSupport(input.deck, input.mythicalLancerLevel);
    return { ...support, normalAttackSupplementalDamage: 0, normalAttackAmplificationPercent: 0, sources: [support.source] };
  }
  const cidala = character.masterId === "3040512000" && input.attacker?.coupledConfectionActive;
  const multiattackAwakeningLevel = character.awakening?.formCode === "4" ? character.awakening.level ?? 0 : 0;
  return { initialMythicalLancerLevel: 0, mythicalLancerLevel: 0, levelSource: "explicit-character-state",
    perpetuityAttackPercent: (character.perpetuityRing ? 10 : 0) + (character.masterId === "3040512000" && input.divineStampBookEnabled ? 10 : 0),
    randomTargetHitCount: cidala ? 2 : character.masterId === "3040456000" ? 3 : 1,
    // Coupled Confection is normal-only, not Support Skill B. Its coexistence
    // with Ereshkigal is provisional and verified conditionally against captures.
    supplementalDamage: 0, normalAttackSupplementalDamage: cidala ? 50_000 : 0,
    damageCapPercent: (character.perpetuityRing ? 5 : 0) + (multiattackAwakeningLevel >= 10 ? 5 : 0)
      + resolveCharacterArtifact(input).damageCapPercent,
    normalAttackAmplificationPercent: multiattackAwakeningLevel >= 9 ? 5 : 0,
    criticalDamageBonusPercent: 0, criticalTriggerRatePercent: 0,
    verificationStatus: "下書き" as const, source: SOURCES[character.masterId], sources: [SOURCES[character.masterId],
      ...(character.masterId === "3040512000" && input.divineStampBookEnabled ? ["https://gbf.wiki/Wonders#Other"] : []),
      "https://gbf.wiki/Character_Extended_Mastery_Perks#Awakening", "https://gbf.wiki/Character_Extended_Mastery_Perks#Perpetuity_Ring"] };
}

export function characterStaminaPercent(input: DamageCalculationInput): number {
  const character = selectedCharacter(input);
  const hpPercent = input.protagonistCurrentHpPercent ?? 100;
  // Ordinary LB and ring/earring stamina share one frame, separate from weapon stamina.
  return normalStaminaLimitBonusPercent(character?.limitBonuses?.staminaLevel ?? 0, hpPercent)
    + resolveCharacterMastery(character, hpPercent).staminaPercent;
}
