import { loadIncrementalWeaponCatalog } from "./weaponCatalog.js";

export interface SelectableWeaponCatalogEntry {
  weaponId: string;
  name: string;
  elementCode: string;
  weaponKindCode: string;
  rarityCode: string;
  seriesId?: string;
  verificationStatus: "検証済み" | "下書き";
  skills: Array<{
    skillId: string;
    name: string;
    description: string;
    verificationStatus: "検証済み" | "下書き";
  }>;
}

export interface SelectableWeaponCatalog {
  schemaVersion: 1;
  weapons: SelectableWeaponCatalogEntry[];
}

/** Browser-safe view model. It contains master data only, never inventory data. */
export function createSelectableWeaponCatalog(): SelectableWeaponCatalog {
  const catalog = loadIncrementalWeaponCatalog();
  const weapons = [...catalog.weapons.values()]
    .map((weapon): SelectableWeaponCatalogEntry => ({
      weaponId: weapon.weaponId,
      name: weapon.name,
      elementCode: weapon.elementCode,
      weaponKindCode: weapon.weaponKindCode,
      rarityCode: weapon.rarityCode,
      seriesId: weapon.seriesId,
      verificationStatus: weapon.verificationStatus,
      skills: weapon.skillSlots.flatMap((slot) => {
        const skill = catalog.skills.get(slot.skillId);
        return skill === undefined
          ? []
          : [
              {
                skillId: skill.skillId,
                name: skill.name,
                description: skill.description,
                verificationStatus: skill.verificationStatus,
              },
            ];
      }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
  return { schemaVersion: 1, weapons };
}
