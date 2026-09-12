export const CATALOG_ELEMENT_ORDER = ["1", "2", "3", "4", "5", "6", "0"];

const elementOrder = new Map(CATALOG_ELEMENT_ORDER.map((elementCode, index) => [elementCode, index]));

function compareCatalogIds(left, right) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  return String(left).localeCompare(String(right), "ja", { numeric: true });
}

/** Filters by one optional element, then sorts by element order and numeric catalog ID. */
export function filterAndSortCatalogByElement(catalog, selectedElementCode, idKey) {
  return catalog
    .filter((entry) => selectedElementCode === "" || String(entry.elementCode) === selectedElementCode)
    .sort((left, right) => {
      const leftOrder = elementOrder.get(String(left.elementCode)) ?? CATALOG_ELEMENT_ORDER.length;
      const rightOrder = elementOrder.get(String(right.elementCode)) ?? CATALOG_ELEMENT_ORDER.length;
      return leftOrder - rightOrder || compareCatalogIds(left[idKey], right[idKey]);
    });
}
