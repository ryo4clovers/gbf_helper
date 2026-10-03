interface JobReference { jobId: string; name: string; classTier?: string }
export function calculateJobCompletionBonuses(
  completedJobIds: string[], jobCatalog: JobReference[], selectedJob: JobReference | undefined,
  mainWeaponKindCode?: string, currentHpPercent?: number,
): { selectedJobIds: string[]; totals: Partial<Record<string, number>> };
