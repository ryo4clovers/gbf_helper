export const MAX_SUPPORTED_PLAYER_RANK = 425;

function assertSupportedRank(rank) {
  if (!Number.isInteger(rank) || rank < 1 || rank > MAX_SUPPORTED_PLAYER_RANK) {
    throw new Error(`Rankは1〜${MAX_SUPPORTED_PLAYER_RANK}の整数で入力してください`);
  }
}

/**
 * Returns the provisional protagonist base stats documented in
 * knowledge/mechanics/protagonist-base-stats.md.
 */
export function calculateProtagonistRankBaseStats(rank) {
  assertSupportedRank(rank);
  let attack;
  if (rank === 1) attack = 1_000;
  else if (rank <= 100) attack = 1_000 + rank * 40;
  else if (rank <= 175) attack = 5_000 + (rank - 100) * 20;
  else if (rank <= 190) attack = 6_500 + (rank - 175) * 10;
  else attack = 6_650 + (rank - 190) * 5;

  let hp;
  if (rank === 1) hp = 600;
  else if (rank === 2) hp = 616;
  else if (rank === 3 || rank === 4) hp = 624;
  else if (rank <= 100) hp = 600 + rank * 8;
  else if (rank <= 175) hp = 1_400 + (rank - 100) * 4;
  else if (rank <= 190) hp = 1_700 + (rank - 175) * 2;
  else hp = 1_730 + (rank - 190);
  // The Rank 425 HP correction is based on a community reproduction and remains provisional.
  if (rank === 425) hp = 1_964;

  return { rank, attack, hp, verificationStatus: "下書き" };
}

function scaledDifference(difference, percent) {
  if (difference === 0) return 0;
  const multiplier = 1 + (Number.isFinite(percent) ? percent : 0) / 100;
  return Math.sign(difference) * Math.round(Math.abs(difference) * multiplier);
}

/**
 * Rebases an observed protagonist display snapshot by the Rank-only delta.
 * The full display formula is unresolved, so existing stats are the reference
 * point and are never rebuilt from Rank alone.
 */
export function rebaseProtagonistForRankChange(config, previousRank) {
  const nextRank = config.protagonist.rank;
  if (previousRank === undefined || nextRank === undefined || previousRank === nextRank) return;
  const previous = calculateProtagonistRankBaseStats(previousRank);
  const next = calculateProtagonistRankBaseStats(nextRank);
  if (Number.isFinite(config.protagonist.attackOverride)) {
    config.protagonist.attackOverride += scaledDifference(
      next.attack - previous.attack,
      config.protagonist.masterBonusAttackPercent,
    );
  }
  if (Number.isFinite(config.protagonist.hpOverride)) {
    config.protagonist.hpOverride += scaledDifference(
      next.hp - previous.hp,
      config.protagonist.masterBonusHpPercent,
    );
  }
}
