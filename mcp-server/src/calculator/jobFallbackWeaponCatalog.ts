import { readFileSync } from "node:fs";
import { z } from "zod";

const fallbackWeaponSchema = z
  .object({
    weaponKindCode: z.string().min(1),
    weaponId: z.string().min(1),
    name: z.string().min(1),
    elementCode: z.string().min(1),
    rarityCode: z.literal("1"),
    level: z.literal(1),
    attack: z.number().int().nonnegative(),
    hp: z.number().int().nonnegative(),
    maxLevel: z.number().int().positive(),
    maxAttack: z.number().int().nonnegative(),
    maxHp: z.number().int().nonnegative(),
    hasSkills: z.literal(false),
    verificationStatus: z.literal("検証済み"),
    source: z.string().min(1),
    confirmedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

const fallbackCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    weapons: z.array(fallbackWeaponSchema).length(10),
  })
  .strict();

export type JobFallbackWeapon = z.infer<typeof fallbackWeaponSchema>;

export interface JobFallbackWeaponCatalog {
  schemaVersion: 1;
  weapons: JobFallbackWeapon[];
  byWeaponKindCode: Map<string, JobFallbackWeapon>;
}

export interface JobFallbackWeaponCatalogView {
  schemaVersion: 1;
  weapons: JobFallbackWeapon[];
}

/** Loads the verified fixed N weapon used when each main-weapon kind is empty. */
export function loadJobFallbackWeaponCatalog(): JobFallbackWeaponCatalog {
  const path = new URL("../../catalog/job-fallback-weapons.v1.json", import.meta.url);
  const file = fallbackCatalogSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  const byWeaponKindCode = new Map<string, JobFallbackWeapon>();
  const weaponIds = new Set<string>();
  for (const weapon of file.weapons) {
    if (byWeaponKindCode.has(weapon.weaponKindCode)) {
      throw new Error(`duplicate fallback weapon kind: ${weapon.weaponKindCode}`);
    }
    if (weaponIds.has(weapon.weaponId)) {
      throw new Error(`duplicate fallback weapon ID: ${weapon.weaponId}`);
    }
    byWeaponKindCode.set(weapon.weaponKindCode, weapon);
    weaponIds.add(weapon.weaponId);
  }
  return { schemaVersion: 1, weapons: file.weapons, byWeaponKindCode };
}

export function resolveJobFallbackWeapon(
  weaponKindCode: string,
  catalog = loadJobFallbackWeaponCatalog(),
): JobFallbackWeapon | undefined {
  return catalog.byWeaponKindCode.get(weaponKindCode);
}

/** Returns the JSON-safe catalog exposed to the Web UI and MCP clients. */
export function createJobFallbackWeaponCatalogView(): JobFallbackWeaponCatalogView {
  const { schemaVersion, weapons } = loadJobFallbackWeaponCatalog();
  return { schemaVersion, weapons };
}
