export const JOB_CLASS_FILTER_ORDER = [
  "ClassI",
  "ClassII",
  "ClassIII",
  "ClassIV",
  "ClassV",
  "エクストラ",
  "エクストラII",
  "オリジン",
];

function normalizeJobSearch(value) {
  return value.toLocaleLowerCase("ja").replace(/[\s・･._-]/g, "");
}

/** Filters by search text and one optional class, then sorts by numeric job ID. */
export function filterAndSortJobs(jobCatalog, query = "", selectedClassTier = "") {
  const normalized = normalizeJobSearch(query.trim());
  return jobCatalog
    .filter((job) => selectedClassTier === "" || job.classTier === selectedClassTier)
    .filter((job) => normalizeJobSearch(
      [job.name, job.nameEn, job.jobId, job.classTier, ...job.weaponKinds.map((weapon) => weapon.name)].join(" "),
    ).includes(normalized))
    .sort((left, right) => {
      const numericDifference = Number(left.jobId) - Number(right.jobId);
      return Number.isFinite(numericDifference) && numericDifference !== 0
        ? numericDifference
        : left.jobId.localeCompare(right.jobId, "ja", { numeric: true });
    });
}
