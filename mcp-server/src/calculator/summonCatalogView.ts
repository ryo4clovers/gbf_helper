import { loadIncrementalSummonCatalog } from "./summonCatalog.js";
import type { SummonAuraEffectDefinition } from "./types.js";

export interface SelectableSummonCatalogEntry {
  summonId: string;
  name: string;
  elementCode: string;
  rarityCode: string;
  auraName: string;
  auraDescription: string;
  auraEffects: SummonAuraEffectDefinition[];
  verificationStatus: "検証済み" | "下書き";
}

export interface SelectableSummonCatalog {
  schemaVersion: 1;
  summons: SelectableSummonCatalogEntry[];
}

/** Browser-safe view model. It contains master data only, never inventory data. */
export function createSelectableSummonCatalog(): SelectableSummonCatalog {
  const catalog = loadIncrementalSummonCatalog();
  const summons = [...catalog.summons.values()]
    .map(
      (summon): SelectableSummonCatalogEntry => ({
        summonId: summon.summonId,
        name: summon.name,
        elementCode: summon.elementCode,
        rarityCode: summon.rarityCode,
        auraName: summon.auraName,
        auraDescription: summon.auraDescription,
        auraEffects: summon.auraEffects,
        verificationStatus: summon.verificationStatus,
      }),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
  return { schemaVersion: 1, summons };
}
