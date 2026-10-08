export interface JobAbility { id: string; name: string; category: "ex" | "limit" | "base"; description: string; minimumJobLevel?: number; minimumPerfectionProofLevel?: number; battleStatus: string; }
export interface JobAbilityConfig { fixed: { id: string; name: string; minimumJobLevel: number; battleStatus: string }[]; freeSlots: number; caps: { ex: number; limit: number; base: number }; candidates: JobAbility[]; coverage: string; verificationStatus: string; evidence: string; observedOn: string; limitCapIncreaseLevel?: number; }
export function abilityIssue(ability: Partial<JobAbility>, protagonist: { jobLevel?: number; perfectionProofLevel?: number }): string;
export function abilityCaps(protagonist: { jobLevel?: number }, config: JobAbilityConfig): JobAbilityConfig["caps"];
export function validateAbilitySelection(protagonist: { abilityIds?: (string | null)[]; jobLevel?: number; perfectionProofLevel?: number }, config?: JobAbilityConfig): (string | null)[];
export function reconcileAbilitySelection(protagonist: { abilityIds?: (string | null)[]; jobLevel?: number; perfectionProofLevel?: number }, config?: JobAbilityConfig): { selected: (string | null)[]; removed: string[] };
export function fighterLoadoutFromDeck(protagonist: { abilityIds?: (string | null)[]; jobId?: string; jobLevel?: number }): string[] | undefined;
export const FIGHTER_ACTION_IDS: Readonly<Record<string, string>>;
