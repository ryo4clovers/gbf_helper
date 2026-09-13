export const CATALOG_ELEMENT_ORDER = ["1", "2", "3", "4", "5", "6", "0"];
export const CATALOG_RARITY_ORDER = ["N", "R", "SR", "SSR"];

const elementOrder = new Map(CATALOG_ELEMENT_ORDER.map((elementCode, index) => [elementCode, index]));
const rarityCodeLabels = { "1": "N", "2": "R", "3": "SR", "4": "SSR" };

export function catalogRarity(entry) {
  return entry.rarity ?? rarityCodeLabels[String(entry.rarityCode)] ?? "";
}

export function catalogRarityFilterOptions(catalogKind) {
  return catalogKind === "character"
    ? CATALOG_RARITY_ORDER.slice(1)
    : [...CATALOG_RARITY_ORDER];
}

function compareCatalogIds(left, right) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  return String(left).localeCompare(String(right), "ja", { numeric: true });
}

/** Applies optional element and rarity filters, then sorts by element order and catalog ID. */
export function filterAndSortCatalog(catalog, selectedElementCode, selectedRarity, idKey) {
  return catalog
    .filter((entry) => selectedElementCode === "" || String(entry.elementCode) === selectedElementCode)
    .filter((entry) => selectedRarity === "" || catalogRarity(entry) === selectedRarity)
    .sort((left, right) => {
      const leftOrder = elementOrder.get(String(left.elementCode)) ?? CATALOG_ELEMENT_ORDER.length;
      const rightOrder = elementOrder.get(String(right.elementCode)) ?? CATALOG_ELEMENT_ORDER.length;
      return leftOrder - rightOrder || compareCatalogIds(left[idKey], right[idKey]);
    });
}
