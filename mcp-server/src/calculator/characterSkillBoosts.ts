import type { DeckCharacter } from "./types.js";

export interface CharacterSkillBoost {
  characterSlot: number;
  characterId: string;
  characterName: string;
  passiveName: string;
  elementCode: string;
  boostGroup: "normal" | "magna";
  prefixes: string[];
  amountPercent: number;
  verificationStatus: "検証済み" | "下書き";
  source: string;
}

/** Only the sourced, always-active weapon-skill boost is connected here. */
export function resolveCharacterSkillBoosts(characters: DeckCharacter[]): CharacterSkillBoost[] {
  const sariel = characters.find((character) => character.masterId === "3040611000");
  if (sariel === undefined) return [];
  // This passive also works in the back row. Do not duplicate it if an invalid
  // hand-authored deck includes the same character in more than one slot.
  return (["normal", "magna"] as const).map((boostGroup) => ({
    characterSlot: sariel.slot,
    characterId: sariel.masterId,
    characterName: "サリエル(リミテッド)",
    passiveName: "スコトゥスアルケー",
    elementCode: "6",
    boostGroup,
    prefixes: boostGroup === "normal" ? ["闇", "憎悪", "奈落"] : ["黒霧方陣"],
    amountPercent: 20,
    verificationStatus: "下書き",
    source: "GameWith https://xn--bck3aza1a2if6kra4ee0hf.gamewith.jp/article/show/512605（2026-10-02参照）。前後列とも有効とされる20%強化。個別差分は要実機検証。",
  }));
}
