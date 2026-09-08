function contributesStats(summon) {
  return summon.position === "main" || summon.position === "grid";
}

function statTotal(summons, key) {
  return summons
    .filter(contributesStats)
    .reduce((total, summon) => total + (Number.isFinite(summon[key]) ? summon[key] : 0), 0);
}

function reversibleScaledDifference(difference, percent, rounding) {
  if (difference === 0) return 0;
  const absoluteValue = Math.abs(difference) * (1 + percent / 100);
  return Math.sign(difference) * rounding(absoluteValue);
}

/**
 * Rebase imported protagonist display stats after a summon-slot edit.
 *
 * The game response already contains the final protagonist stats, so the editor
 * only applies the changed summon contribution. `sub` (sub-aura) summons do not
 * contribute stats. Attack and HP use the rounding observed in the supplied
 * Wilnas comparisons; the sign handling makes add/remove operations reversible.
 */
export function rebaseProtagonistForSummonChange(config, previousSummons) {
  const attackPercent = config.protagonist.masterBonusAttackPercent;
  const hpPercent = config.protagonist.masterBonusHpPercent;
  const attackDifference = statTotal(config.summons, "attackOverride")
    - statTotal(previousSummons, "attackOverride");
  const hpDifference = statTotal(config.summons, "hpOverride")
    - statTotal(previousSummons, "hpOverride");

  if (config.protagonist.attackOverride != null && Number.isFinite(attackPercent)) {
    config.protagonist.attackOverride += reversibleScaledDifference(
      attackDifference,
      attackPercent,
      Math.ceil,
    );
  }
  if (config.protagonist.hpOverride != null && Number.isFinite(hpPercent)) {
    config.protagonist.hpOverride += reversibleScaledDifference(
      hpDifference,
      hpPercent,
      Math.floor,
    );
  }
}
