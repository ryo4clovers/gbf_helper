import {
  MAX_SUPPORTED_PLAYER_RANK,
  calculateProtagonistRankBaseStats,
} from "./protagonist-displayed-stats.js";

export { MAX_SUPPORTED_PLAYER_RANK, calculateProtagonistRankBaseStats };

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

function scaledRankDifference(difference, percent) {
  if (difference === 0) return 0;
  const multiplier = 1 + (Number.isFinite(percent) ? percent : 0) / 100;
  return Math.sign(difference) * Math.round(Math.abs(difference) * multiplier);
}

/** Rebases an observed display snapshot by the Rank-only delta. */
export function rebaseProtagonistForRankChange(config, previousRank) {
  const nextRank = config.protagonist.rank;
  if (previousRank === undefined || nextRank === undefined || previousRank === nextRank) return;
  const previous = calculateProtagonistRankBaseStats(previousRank);
  const next = calculateProtagonistRankBaseStats(nextRank);
  if (Number.isFinite(config.protagonist.attackOverride)) {
    config.protagonist.attackOverride += scaledRankDifference(
      next.attack - previous.attack,
      config.protagonist.masterBonusAttackPercent,
    );
  }
  if (Number.isFinite(config.protagonist.hpOverride)) {
    config.protagonist.hpOverride += scaledRankDifference(
      next.hp - previous.hp,
      config.protagonist.masterBonusHpPercent,
    );
  }
}

function rebaseCompletionMultiplier(value, previousPercent, nextPercent) {
  if (!Number.isFinite(value) || !Number.isFinite(previousPercent) || !Number.isFinite(nextPercent) || previousPercent === nextPercent) {
    return value;
  }
  return Math.round(value / (1 + previousPercent / 100) * (1 + nextPercent / 100));
}

/** Rebases an observed display snapshot when completed-job ATK/HP or main-weapon bonuses change. */
export function rebaseProtagonistForCompletionBonusChange(
  config,
  nextAttackPercent,
  nextHpPercent,
  nextMainWeaponAttackContribution = 0,
  nextJobGrowthAttackContribution = 0,
  nextJobGrowthHpContribution = 0,
) {
  const previousAttackPercent = config.protagonist.masterBonusAttackPercent;
  const previousMainContribution = config.protagonist.mainWeaponCompletionAttackContribution;
  const previousGrowthAttack = config.protagonist.jobGrowthAttackContribution;
  const previousGrowthHp = config.protagonist.jobGrowthHpContribution;
  if (Number.isFinite(config.protagonist.attackOverride) && Number.isFinite(previousAttackPercent)) {
    if (Number.isFinite(previousMainContribution) && Number.isFinite(previousGrowthAttack)) {
      const previousMultiplier = 1 + previousAttackPercent / 100;
      const nextMultiplier = 1 + nextAttackPercent / 100;
      config.protagonist.attackOverride = Math.round(
        (config.protagonist.attackOverride / previousMultiplier
          - previousMainContribution
          - previousGrowthAttack
          + nextMainWeaponAttackContribution
          + nextJobGrowthAttackContribution) * nextMultiplier,
      );
    } else {
      config.protagonist.attackOverride = rebaseCompletionMultiplier(
        config.protagonist.attackOverride,
        previousAttackPercent,
        nextAttackPercent,
      );
    }
  }
  if (
    Number.isFinite(config.protagonist.hpOverride)
    && Number.isFinite(config.protagonist.masterBonusHpPercent)
    && Number.isFinite(previousGrowthHp)
  ) {
    const previousMultiplier = 1 + config.protagonist.masterBonusHpPercent / 100;
    const nextMultiplier = 1 + nextHpPercent / 100;
    config.protagonist.hpOverride = Math.round(
      (config.protagonist.hpOverride / previousMultiplier
        - previousGrowthHp
        + nextJobGrowthHpContribution) * nextMultiplier,
    );
  } else {
    config.protagonist.hpOverride = rebaseCompletionMultiplier(
      config.protagonist.hpOverride,
      config.protagonist.masterBonusHpPercent,
      nextHpPercent,
    );
  }
  config.protagonist.mainWeaponCompletionAttackContribution = nextMainWeaponAttackContribution;
  config.protagonist.jobGrowthAttackContribution = nextJobGrowthAttackContribution;
  config.protagonist.jobGrowthHpContribution = nextJobGrowthHpContribution;
}
