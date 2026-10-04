import type { CalculatorDeckCharacterConfig } from "./types.js";
import { resolveCharacterModelId } from "./characterIdentity.js";

// Lv80 only. Do not interpolate unverified growth curves or borrow another style.
export const CHARACTER_STAT_PROFILES: Record<string, { attack: number; hp: number; weaponKinds: string[]; source: string }> = {
  "3040456000": { attack: 11200, hp: 1266, weaponKinds: ["6", "8"], source: "https://gbf.wiki/Ilsa_(Yukata)" },
  "3040512000": { attack: 8810, hp: 1118, weaponKinds: ["4"], source: "https://gbf.wiki/Cidala_(Valentine)" },
  "3040611000": { attack: 9190, hp: 1042, weaponKinds: ["4"], source: "https://gbf.wiki/Sariel" },
};

export function characterAwakeningBonuses(level = 1, formCode = "1") {
  const reached = (at: number, amount: number) => level >= at ? amount : 0;
  if (!["1", "2", "3", "4"].includes(formCode)) throw new Error("覚醒タイプは1〜4で指定してください");
  const attack = reached(2, 1000) + (formCode === "3" ? 0 : reached(6, 2000))
    + (formCode === "1" ? reached(10, 1000) : formCode === "2" ? reached(3, 1000) + reached(7, 2000) + reached(9, 2000) : 0);
  const hp = ["1", "3"].includes(formCode) ? reached(3, 500) + reached(7, 1000)
    + (formCode === "1" ? reached(10, 500) : reached(4, 500) + reached(6, 1000) + reached(9, 1000)) : 0;
  const chargeDamagePercent = formCode === "3" ? 0 : reached(4, 5)
    + (formCode === "2" ? reached(5, 5) : 0) + (["1", "2"].includes(formCode) ? reached(8, 15) : 0);
  return { attack, hp, chargeDamagePercent, chargeCapPercent: formCode === "2" ? reached(10, 15) : 0 };
}

export function calculateCharacterDisplayedStats(character: CalculatorDeckCharacterConfig,
  weapons: Array<{ stats?: { attack: number; hp: number }; weaponKindCode?: string }>,
  summons: Array<{ attack: number; hp: number } | undefined>) {
  const mode = character.displayedStatMode ?? "manual";
  const base = CHARACTER_STAT_PROFILES[resolveCharacterModelId(character.characterId)];
  const issues: string[] = [];
  if (mode === "manual") return { slot: character.slot, mode, attack: character.attackOverride, hp: character.hpOverride, issues };
  if (!base || character.level !== 80) issues.push("自動算出は浴衣イルザ・闇シンダラ・サリエルのLv80に対応。その他は表示値を直接入力してください");
  if (weapons.some(w => !w.stats || !w.weaponKindCode) || summons.some(s => !s)) issues.push("装備ステータスまたは武器種が未解決です");
  if (character.awakening && (character.awakening.level === undefined || character.awakening.formCode === undefined)) issues.push("覚醒タイプとLvの両方を設定してください");
  if (issues.length) return { slot: character.slot, mode, issues };
  const awakening = characterAwakeningBonuses(character.awakening?.level, character.awakening?.formCode);
  const total = (key: "attack" | "hp", name: string) => {
    const proficiency = weapons.reduce((sum, w) => sum + (base.weaponKinds.includes(w.weaponKindCode!) ? Math.round(w.stats![key] * .2) : 0), 0);
    const equipment = weapons.reduce((sum, w) => sum + w.stats![key], 0) + summons.reduce((sum, s) => sum + s![key], 0);
    const ring = (character.mastery?.ring ?? []).filter(b => b.name === name && b.unit === "flat").reduce((sum, b) => sum + b.value, 0);
    const artifact = (character.artifact?.skills ?? []).filter(b => b.name === name).reduce((sum, b) => {
      if (!/^\+\d+$/.test(b.effectValue)) throw new Error("ステータス用アーティファクトは固定値で指定してください");
      return sum + Number(b.effectValue.slice(1));
    }, 0);
    const limitBonus = character.limitBonuses?.[key === "attack" ? "attackFlatBonus" : "hpFlatBonus"] ?? 0;
    const plus = (character.plusMark ?? 0) * (key === "attack" ? 3 : 1);
    return { base: base[key], plus, awakening: awakening[key], limitBonus, ring, artifact, equipment, proficiency };
  };
  const attack = total("attack", "攻撃力"), hp = total("hp", "HP");
  return { slot: character.slot, mode, attack: Object.values(attack).reduce((a, b) => a + b, 0),
    hp: Object.values(hp).reduce((a, b) => a + b, 0), breakdown: { attack, hp }, issues,
    verificationStatus: "下書き", source: base.source };
}
