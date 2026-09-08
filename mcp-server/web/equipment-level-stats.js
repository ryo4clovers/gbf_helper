const MAX_EQUIPMENT_LEVEL = 250;

function requireInteger(value, label, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label}は${minimum}〜${maximum}の整数で指定してください`);
  }
}

function validateProgression(progression) {
  if (!progression || !Array.isArray(progression.points) || progression.points.length < 2) {
    throw new Error("装備ステータスの境界値が不足しています");
  }
  requireInteger(progression.maximumLevel, "装備の最大Lv", 1, MAX_EQUIPMENT_LEVEL);
  let previousLevel = 0;
  for (const point of progression.points) {
    requireInteger(point.level, "境界Lv", 1, progression.maximumLevel);
    requireInteger(point.attack, "境界ATK", 0, Number.MAX_SAFE_INTEGER);
    requireInteger(point.hp, "境界HP", 0, Number.MAX_SAFE_INTEGER);
    if (point.level <= previousLevel) throw new Error("装備ステータスの境界Lvは昇順で指定してください");
    previousLevel = point.level;
  }
  if (progression.points[0].level !== 1 || previousLevel !== progression.maximumLevel) {
    throw new Error("装備ステータスにはLv1と最大Lvの境界値が必要です");
  }
}

function interpolateStat(start, end, progress, span) {
  return Math.floor((start * span + (end - start) * progress) / span);
}

/**
 * Calculates base equipment stats from verified level breakpoints.
 * Lv1 is a fixed special point. The first growth segment uses Lv itself as
 * progress (Lv1 -> Lv2 applies two increments), matching observed game data.
 */
export function calculateEquipmentLevelStats(progression, level, plusMark = 0, plusBonus = { attack: 0, hp: 0 }) {
  validateProgression(progression);
  requireInteger(level, "装備Lv", 1, progression.maximumLevel);
  requireInteger(plusMark, "プラスボーナス", 0, 99);

  const first = progression.points[0];
  let attack = first.attack;
  let hp = first.hp;
  if (level !== 1) {
    const endIndex = progression.points.findIndex((point) => point.level >= level);
    const end = progression.points[endIndex];
    const start = progression.points[endIndex - 1];
    const firstGrowthSegment = start.level === 1;
    const span = firstGrowthSegment ? end.level : end.level - start.level;
    const progress = firstGrowthSegment ? level : level - start.level;
    attack = interpolateStat(start.attack, end.attack, progress, span);
    hp = interpolateStat(start.hp, end.hp, progress, span);
  }

  return {
    attack: attack + plusMark * plusBonus.attack,
    hp: hp + plusMark * plusBonus.hp,
  };
}

