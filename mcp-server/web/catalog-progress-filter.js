export const connectionLabels = { connected: "登録効果は接続あり", partial: "一部接続", unconnected: "未接続", unknown: "接続未確認" };
export const facetLabels = { weaponKind: "武器種", series: "シリーズ", skills: "スキル名を検索", effectTypes: "効果分類（登録分）", race: "種族", gender: "性別", proficiency: "得意武器" };
export function categoryFacetKeys(categoryId) {
  return categoryId === "characters" ? ["proficiency", "series", "race", "gender"] : categoryId === "weapons" ? ["weaponKind", "series", "skills", "effectTypes"] : ["series"];
}
export function normalize(value) { return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja"); }
export function filterCatalogItems(items, filters = {}) {
  const query = normalize(filters.query).trim();
  return items.filter(item => {
    if (query && !normalize([item.name, item.nameEn, item.id, item.detail].filter(Boolean).join(" ")).includes(query)) return false;
    if (filters.element && item.elementCode !== filters.element) return false;
    if (filters.rarity && item.rarity !== filters.rarity) return false;
    if (filters.verification && item.verificationStatus !== filters.verification) return false;
    if (filters.connection && item.coverage.connection !== filters.connection) return false;
    if (filters.missing && !item.coverage.missing.length) return false;
    if (filters.unknown && !item.coverage.unknown.length && !item.coverage.effects.some(effect => effect.connection === "unknown")) return false;
    for (const key of Object.keys(facetLabels)) {
      if (!filters[key]) continue;
      const values = item.facets[key] ?? [];
      if (filters[key] === "__missing__") { if (values.length) return false; }
      else if (key === "skills") { if (!values.some(value => normalize(value).includes(normalize(filters[key])))) return false; }
      else if (!values.includes(filters[key])) return false;
    }
    return true;
  });
}
export function facetOptions(items, key) {
  const values = [...new Set(items.flatMap(item => item.facets[key] ?? []))].sort((a, b) => a.localeCompare(b, "ja"));
  return [...values.map(value => ({ value, label: value })), ...(items.some(item => !item.facets[key]?.length) ? [{ value: "__missing__", label: key === "skills" ? "スキル記録なし（非該当か未収録か未確認）" : key === "effectTypes" ? "未分類（数値効果の分類なし）" : "未登録" }] : [])];
}
