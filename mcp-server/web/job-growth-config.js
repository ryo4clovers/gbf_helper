function clampInteger(value, minimum, maximum, fallback) {
  return Number.isInteger(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

/** Normalizes the three job-growth controls and fills missing values with their maximums. */
export function normalizeJobGrowthLevels(protagonist, job) {
  if (!job) return protagonist;
  protagonist.jobLevel = clampInteger(
    protagonist.jobLevel,
    1,
    job.maximumJobLevel,
    job.maximumJobLevel,
  );

  if (job.maximumMasterLevel > 0) {
    protagonist.masterLevel = clampInteger(
      protagonist.masterLevel,
      1,
      job.maximumMasterLevel,
      job.maximumMasterLevel,
    );
    if (protagonist.jobLevel < 20) protagonist.masterLevel = 1;
  } else {
    protagonist.masterLevel = 0;
  }

  if (job.maximumPerfectionProofLevel > 0) {
    protagonist.perfectionProofLevel = clampInteger(
      protagonist.perfectionProofLevel,
      0,
      job.maximumPerfectionProofLevel,
      job.maximumPerfectionProofLevel,
    );
    if (protagonist.masterLevel < 30) protagonist.perfectionProofLevel = 0;
  } else {
    protagonist.perfectionProofLevel = 0;
  }
  return protagonist;
}

function stageTotals(rows, currentLevel) {
  return rows
    .filter((row) => row.level <= currentLevel)
    .reduce((totals, row) => ({
      attack: totals.attack + row.attack,
      hp: totals.hp + row.hp,
      doubleAttackRatePercent: totals.doubleAttackRatePercent + row.doubleAttackRatePercent,
      tripleAttackRatePercent: totals.tripleAttackRatePercent + row.tripleAttackRatePercent,
      defensePercent: totals.defensePercent + (row.defensePercent ?? 0),
    }), { attack: 0, hp: 0, doubleAttackRatePercent: 0, tripleAttackRatePercent: 0, defensePercent: 0 });
}

/** Returns current flat ATK/HP and multiattack totals for each growth system. */
export function calculateJobGrowthBonuses(job, protagonist) {
  const jobLevel = stageTotals(job?.jobLevelBonuses ?? [], protagonist.jobLevel ?? 0);
  const masterLevel = stageTotals(job?.masterLevelBonuses ?? [], protagonist.masterLevel ?? 0);
  const perfectionProof = stageTotals(
    job?.perfectionProofBonuses ?? [],
    protagonist.perfectionProofLevel ?? 0,
  );
  return {
    jobLevel,
    masterLevel,
    perfectionProof,
    totals: {
      attack: jobLevel.attack + masterLevel.attack + perfectionProof.attack,
      hp: jobLevel.hp + masterLevel.hp + perfectionProof.hp,
      doubleAttackRatePercent:
        jobLevel.doubleAttackRatePercent
        + masterLevel.doubleAttackRatePercent
        + perfectionProof.doubleAttackRatePercent,
      tripleAttackRatePercent:
        jobLevel.tripleAttackRatePercent
        + masterLevel.tripleAttackRatePercent
        + perfectionProof.tripleAttackRatePercent,
      defensePercent: jobLevel.defensePercent + masterLevel.defensePercent + perfectionProof.defensePercent,
    },
  };
}
