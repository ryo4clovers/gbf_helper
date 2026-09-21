const BASE_LEVEL_CAPS_BY_RARITY = {
  "1": [10, 15, 20, 30],
  "2": [20, 25, 30, 40],
  "3": [30, 40, 50, 60],
  "4": [40, 60, 80, 100],
};

/**
 * Resolves selectable uncap stages from the Wiki Cargo uncap range and its
 * collected stat breakpoints. Levels above 3★ are assigned backwards from the
 * highest collected breakpoint so weapons that start at 4★/5★ still resolve
 * without inventing unavailable lower forms.
 */
export function createEquipmentUncapStages(uncaps, rarityCode, progression) {
  if (!uncaps) return [];
  const minimum = Number(uncaps.minimum);
  const maximum = Number(uncaps.maximum);
  if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 0 || maximum < minimum) return [];

  const baseCaps = BASE_LEVEL_CAPS_BY_RARITY[String(rarityCode)] ?? [];
  const baseMaximum = baseCaps[3] ?? 0;
  const extendedPoints = [...new Set(
    (progression?.points ?? [])
      .map((point) => Number(point.level))
      .filter((level) => Number.isInteger(level) && level > baseMaximum),
  )].sort((left, right) => left - right);
  const extendedByStage = new Map();
  let stage = maximum;
  for (let index = extendedPoints.length - 1; index >= 0 && stage >= 4; index -= 1, stage -= 1) {
    extendedByStage.set(stage, extendedPoints[index]);
  }

  const stages = [];
  for (let uncapLevel = minimum; uncapLevel <= maximum; uncapLevel += 1) {
    const maximumLevel = uncapLevel <= 3 ? baseCaps[uncapLevel] : extendedByStage.get(uncapLevel);
    if (Number.isInteger(maximumLevel) && maximumLevel >= 1) stages.push({ uncapLevel, maximumLevel });
  }
  return stages;
}

export function maximumLevelForUncap(stages, uncapLevel) {
  return stages.find((stage) => stage.uncapLevel === Number(uncapLevel))?.maximumLevel;
}

export function uncapLabel(uncapLevel) {
  return `${uncapLevel}凸`;
}
