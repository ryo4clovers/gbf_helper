import type { DeckCharacter } from "./types.js";

const STAMINA_SOURCE = "https://resoleil.hatenablog.com/entry/2021/03/30/010000";
// Displayed ratings are not percentages. The published table has HP plateaus.
const STAMINA_MINIMUMS = [1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5];
const STAMINA_BREAKPOINTS = [1, 1 / 2, 3 / 4, 1, 2 / 3, 5 / 6, 1, 3 / 4, 7 / 8, 1, 4 / 5, 9 / 10];
const NORMAL_IRRELEVANT_BONUSES = new Set(["攻撃力", "HP", "防御力", "アビリティダメージ上限",
  "奥義ダメージ", "奥義ダメージ上限", "トリプルアタック確率", "ダブルアタック確率",
  "弱体成功率", "弱体耐性", "回復性能", "回避率"]);

export function masteryStaminaPercent(rating: number, hpPercent: number): number {
  if (!Number.isInteger(rating) || rating < 1 || rating > 12) throw new Error("Mastery stamina rating must be in 1..12");
  if (!Number.isFinite(hpPercent) || hpPercent < 0 || hpPercent > 100) throw new Error("Mastery stamina HP must be in 0..100");
  const minimum = STAMINA_MINIMUMS[rating - 1];
  return minimum + (rating + 2 - minimum) * Math.min(1, hpPercent / 100 / STAMINA_BREAKPOINTS[rating - 1]);
}

export function normalStaminaLimitBonusPercent(stars: number, hpPercent: number): number {
  if (!Number.isInteger(stars) || stars < 0 || stars > 3) throw new Error("Character stamina LB stars must be in 0..3");
  if (!Number.isFinite(hpPercent) || hpPercent < 0 || hpPercent > 100) throw new Error("Character stamina LB HP must be in 0..100");
  if (stars === 0) return 0;
  const minimum = [0, 1, 1.5, 2][stars];
  const maximum = [0, 3, 4, 6][stars];
  const breakpoint = stars === 2 ? 5 / 6 : 1;
  return minimum + (maximum - minimum) * Math.min(1, hpPercent / 100 / breakpoint);
}

/** ATK/HP already belong to displayed totals. Multiattack affects action count, not one hit. */
export function resolveCharacterMastery(character: DeckCharacter | undefined, hpPercent = 100) {
  let staminaPercent = 0;
  const unsupportedBonuses: string[] = [];
  for (const [source, bonuses] of Object.entries(character?.mastery ?? {})) {
    for (const bonus of bonuses) {
      if (NORMAL_IRRELEVANT_BONUSES.has(bonus.name)) continue;
      if (bonus.name === "渾身" && bonus.unit === "rating") {
        if (source === "ring" && bonus.value > 10) throw new Error("Ring stamina rating cannot exceed 10");
        staminaPercent += masteryStaminaPercent(bonus.value, hpPercent);
      } else unsupportedBonuses.push(`${source}:${bonus.bonusId}`);
    }
  }
  return { staminaPercent, unsupportedBonuses, source: STAMINA_SOURCE, verificationStatus: "下書き" as const };
}
