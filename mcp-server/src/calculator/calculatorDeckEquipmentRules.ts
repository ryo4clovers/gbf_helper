import {
  createSelectableJobCatalog,
  type SelectableJobCatalog,
} from "./jobCatalogView.js";
import {
  loadJobFallbackWeaponCatalog,
  type JobFallbackWeapon,
  type JobFallbackWeaponCatalog,
} from "./jobFallbackWeaponCatalog.js";
import type { CalculatorDeckConfig, CalculatorDeckWeaponConfig } from "./types.js";
import {
  loadIncrementalWeaponCatalog,
  type IncrementalWeaponCatalog,
} from "./weaponCatalog.js";

export interface CalculatorDeckEquipmentRuleCatalogs {
  jobs: SelectableJobCatalog;
  fallbackWeapons: JobFallbackWeaponCatalog;
  weapons: IncrementalWeaponCatalog;
}

function fallbackWeaponConfig(
  weapon: JobFallbackWeapon,
): CalculatorDeckWeaponConfig {
  return {
    slot: 1,
    position: "main",
    weaponId: weapon.weaponId,
    isJobFallback: true,
    nameHint: weapon.name,
    level: weapon.level,
    uncapLevel: 0,
    plusMark: 0,
    attackOverride: weapon.attack,
    hpOverride: weapon.hp,
  };
}

/**
 * Applies game-like main-weapon rules to a parsed calculator config.
 * Real weapons are never removed here; an incompatible real weapon is handled
 * as a warning by the resolver. Missing/fallback mains follow the job's first
 * proficient weapon kind, and the protagonist element follows the effective main.
 */
export function applyCalculatorDeckEquipmentRules(
  config: CalculatorDeckConfig,
  catalogs: CalculatorDeckEquipmentRuleCatalogs = {
    jobs: createSelectableJobCatalog(),
    fallbackWeapons: loadJobFallbackWeaponCatalog(),
    weapons: loadIncrementalWeaponCatalog(),
  },
): CalculatorDeckConfig {
  const normalized: CalculatorDeckConfig = {
    ...config,
    protagonist: { ...config.protagonist },
    weapons: config.weapons.map((weapon) => ({ ...weapon })),
    summons: config.summons.map((summon) => ({ ...summon })),
    characters: config.characters.map((character) => ({ ...character })),
  };
  const selectedJob = catalogs.jobs.jobs.find(
    (job) => job.jobId === normalized.protagonist.jobId,
  );
  const currentMain = normalized.weapons.find((weapon) => weapon.position === "main");
  if (selectedJob !== undefined && (currentMain === undefined || currentMain.isJobFallback === true)) {
    const preferredKindCode = selectedJob.weaponKinds[0]?.code;
    const fallback = preferredKindCode
      ? catalogs.fallbackWeapons.byWeaponKindCode.get(preferredKindCode)
      : undefined;
    if (fallback !== undefined) {
      normalized.weapons = normalized.weapons.filter(
        (weapon) => weapon.position !== "main" && weapon.slot !== 1,
      );
      normalized.weapons.push(fallbackWeaponConfig(fallback));
    }
  }

  const effectiveMain = normalized.weapons.find((weapon) => weapon.position === "main");
  if (effectiveMain !== undefined) {
    const fallbackMaster = effectiveMain.isJobFallback
      ? catalogs.fallbackWeapons.byWeaponId.get(effectiveMain.weaponId)
      : undefined;
    const regularMaster = catalogs.weapons.weapons.get(effectiveMain.weaponId);
    const elementCode = regularMaster?.elementCode ?? fallbackMaster?.elementCode;
    if (elementCode !== undefined) normalized.protagonist.elementCode = elementCode;
  }
  normalized.weapons.sort((left, right) => left.slot - right.slot);
  return normalized;
}
