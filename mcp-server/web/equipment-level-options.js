function verifiedLevels(progression) {
  if (!progression?.points) return [];
  return [...new Set(
    progression.points
      .map((point) => Number(point.level))
      .filter((level) => Number.isInteger(level) && level >= 1),
  )].sort((left, right) => left - right);
}

/**
 * Builds UI options from measured catalog breakpoints only. A legacy or
 * imported intermediate level is retained as a disabled option so opening the
 * visual editor never silently rewrites saved data.
 */
export function createEquipmentLevelOptions(progression, currentLevel) {
  const verified = new Set(verifiedLevels(progression));
  const levels = [...verified];
  const current = Number(currentLevel);
  if (Number.isInteger(current) && current >= 1 && !levels.includes(current)) {
    levels.push(current);
    levels.sort((left, right) => left - right);
  }
  return levels.map((level) => ({
    level,
    verified: verified.has(level),
  }));
}
