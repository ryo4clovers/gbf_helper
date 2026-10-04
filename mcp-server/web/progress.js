import { connectionLabels, facetLabels, categoryFacetKeys, filterCatalogItems, facetOptions } from "/catalog-progress-filter.js";
const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat("ja-JP");
const PAGE_SIZE = 50;
const elementLabels = { "0": "属性可変", "1": "火", "2": "水", "3": "土", "4": "風", "5": "光", "6": "闇" };
const matrixLabels = { stats: "ステータス", main: "メイン加護", sub: "サブ加護", call: "召喚ダメージ" };
const matrixStatuses = { "○": "対応済み", "△": "一部対応", "×": "未対応", "？": "未確認", "―": "対象外" };
let progress, activeCategoryId = "weapons", currentPage = 1;
const savedFilters = {};
function text(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}
function activeCategory() { return progress.categories.find(category => category.id === activeCategoryId); }
function filters() { return savedFilters[activeCategoryId] ??= {}; }
function summaryCard(category) {
  const card = text("article", `summary-card ${category.id}`, "");
  card.append(text("h2", "summary-label", category.label), text("p", "summary-value", `${number.format(category.registeredCount)}件`));
  card.append(text("p", "summary-note", `参考件数 ${number.format(category.targetCount)}（収録範囲の差があるため未収録件数ではありません）`));
  for (const [key, label] of Object.entries(connectionLabels)) card.append(text("p", "summary-state", `${label}: ${number.format(category.stateCounts[key])}件`));
  card.append(text("p", "summary-state", `確認できる欠損あり: ${number.format(category.stateCounts.missing)}件 / 未検証: ${number.format(category.stateCounts.unverified)}件`));
  return card;
}
function renderTabs() {
  $("catalog-tabs").replaceChildren(...progress.categories.map(category => {
    const button = text("button", `catalog-tab${category.id === activeCategoryId ? " active" : ""}`, `${category.label} ${number.format(category.registeredCount)}`);
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(category.id === activeCategoryId));
    button.addEventListener("click", () => { activeCategoryId = category.id; currentPage = 1; renderTabs(); renderFilters(); renderList(); });
    return button;
  }));
}
function selectFilter(key, label, options) {
  const root = text("label", "filter-field", label);
  const input = document.createElement("select");
  input.id = `filter-${key}`;
  input.append(new Option("すべて", ""), ...options.map(option => new Option(option.label, option.value)));
  input.value = filters()[key] ?? "";
  input.addEventListener("change", () => { filters()[key] = input.value; currentPage = 1; renderList(); });
  root.append(input);
  return root;
}
function skillNameFilter() {
  const root = text("label", "filter-field", "スキル名を検索（部分一致）");
  const input = document.createElement("input"); input.type = "search"; input.id = "filter-skills";
  input.placeholder = "例: 神威 / 守護"; input.value = filters().skills ?? "";
  input.addEventListener("input", () => { filters().skills = input.value; currentPage = 1; renderList(); });
  root.append(input); return root;
}
function renderFilters() {
  const category = activeCategory();
  $("skill-filter-note").hidden = category.id !== "weapons";
  $("catalog-search").value = filters().query ?? "";
  const nodes = [
    selectFilter("rarity", "レアリティ", [...new Set(category.items.map(item => item.rarity))].sort().map(value => ({ value, label: value }))),
    selectFilter("element", "属性", [...new Set(category.items.map(item => item.elementCode))].sort().map(value => ({ value, label: elementLabels[value] ?? "属性不明" }))),
    ...categoryFacetKeys(category.id).map(key => key === "skills" ? skillNameFilter() : selectFilter(key, facetLabels[key], facetOptions(category.items, key))),
    selectFilter("connection", "登録効果の接続", Object.entries(connectionLabels).map(([value, label]) => ({ value, label }))),
    selectFilter("verification", "登録情報の検証", ["検証済み", "下書き", "未着手"].map(value => ({ value, label: value }))),
  ];
  for (const [key, label] of [["missing", "欠損あり"], ["unknown", "未確認事項あり"]]) {
    const root = text("label", "filter-check", "");
    const input = document.createElement("input"); input.type = "checkbox"; input.checked = !!filters()[key]; input.id = `filter-${key}`;
    input.addEventListener("change", () => { filters()[key] = input.checked; currentPage = 1; renderList(); });
    root.append(input, document.createTextNode(label)); nodes.push(root);
  }
  $("catalog-filters").replaceChildren(...nodes);
}
function effectDetail(effect) {
  const row = text("li", "effect-detail", "");
  row.append(text("strong", "", effect.name), text("p", "", `${effect.structured ? "数値効果あり" : "説明・未構造化"} / ${connectionLabels[effect.connection]} / ${effect.verificationStatus} / 実測: ${effect.observation}`), text("p", "", effect.scope));
  if (effect.evidence.length) row.append(text("p", "evidence", `接続根拠: ${effect.evidence.join(" → ")}`));
  if (effect.source) row.append(text("p", "evidence", `出典: ${effect.source}${effect.confirmedAt ? ` / 確認日: ${effect.confirmedAt}` : " / 確認日未登録"}`));
  return row;
}
function details(item) {
  const root = document.createElement("details"); root.className = "coverage-details";
  root.append(text("summary", "", `詳細・不足理由・効果 (${item.coverage.effects.length})`));
  if (item.coverage.missing.length) root.append(text("p", "missing-reasons", `欠損: ${item.coverage.missing.join(" / ")}`));
  else root.append(text("p", "", "確認対象の欠損なし（全情報の完全性を保証するものではありません）"));
  for (const key of categoryFacetKeys(activeCategoryId)) root.append(text("p", "", `${facetLabels[key]}: ${item.facets[key].join(" / ") || "未登録（なしとの区別は未確認）"}`));
  root.append(text("p", "", `未確認: ${item.coverage.unknown.join(" / ")}`));
  for (const [key, cell] of Object.entries(item.coverage.matrix ?? {})) root.append(text("p", "", `${matrixLabels[key]} ${cell.status} ${matrixStatuses[cell.status]}: ${cell.reason}`));
  if (item.coverage.source) root.append(text("p", "evidence", `登録情報の出典: ${item.coverage.source}${item.coverage.confirmedAt ? ` / ${item.coverage.confirmedAt}` : " / 確認日未登録"}`));
  const list = document.createElement("ul"); list.append(...item.coverage.effects.map(effectDetail)); root.append(list);
  return root;
}
function catalogRow(item) {
  const row = text("article", "catalog-entry", "");
  const heading = text("div", "catalog-row", "");
  const identity = text("div", "catalog-identity", "");
  identity.append(text("strong", "catalog-name", item.name), text("code", "catalog-id", item.id));
  const badges = text("div", "catalog-badges", "");
  badges.append(text("span", `catalog-badge element-${item.elementCode}`, elementLabels[item.elementCode] ?? "属性不明"), text("span", "catalog-badge rarity", item.rarity), text("span", "catalog-badge", item.verificationStatus), text("span", "catalog-badge", connectionLabels[item.coverage.connection]));
  heading.append(identity, text("span", "catalog-detail", item.detail), badges);
  row.append(heading, details(item)); return row;
}
function summonTable(items) {
  const wrapper = text("div", "matrix-scroll", "");
  const table = document.createElement("table"); table.className = "coverage-matrix";
  const caption = text("caption", "", "召喚石の対応表（現在の登録範囲。実測検証は別表示）");
  const head = document.createElement("thead"), headRow = document.createElement("tr");
  for (const label of ["召喚石", ...Object.values(matrixLabels), "検証・詳細"]) { const th = text("th", "", label); th.scope = "col"; headRow.append(th); }
  head.append(headRow); const body = document.createElement("tbody");
  for (const item of items) {
    const row = document.createElement("tr"); const identity = text("th", "matrix-identity", ""); identity.scope = "row";
    identity.append(text("strong", "", item.name), text("p", "", `${elementLabels[item.elementCode]} / ${item.rarity}`), text("code", "catalog-id", item.id)); row.append(identity);
    for (const key of Object.keys(matrixLabels)) {
      const cell = item.coverage.matrix[key]; const td = text("td", "", "");
      const button = text("button", "matrix-cell", `${cell.status} ${matrixStatuses[cell.status]}`); button.type = "button"; button.title = cell.reason;
      button.setAttribute("aria-label", `${item.name} ${matrixLabels[key]} ${matrixStatuses[cell.status]}: ${cell.reason}`);
      button.addEventListener("click", () => { const detail = row.querySelector("details"); detail.open = true; detail.scrollIntoView({ block: "nearest" }); });
      td.append(button); row.append(td);
    }
    const last = text("td", "matrix-details", ""); last.append(text("p", "", `${item.verificationStatus} / 実測範囲未確認`), details(item)); row.append(last); body.append(row);
  }
  table.append(caption, head, body); wrapper.append(table); return wrapper;
}
function renderList() {
  const category = activeCategory(); const items = filterCatalogItems(category.items, filters());
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE)); currentPage = Math.min(currentPage, totalPages);
  const visible = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  $("list-status").textContent = `${category.label}: ${number.format(items.length)}件 / 登録${number.format(category.items.length)}件（${currentPage} / ${totalPages}ページ）`;
  $("catalog-list").replaceChildren(...(category.id === "summons" && visible.length ? [summonTable(visible)] : visible.map(catalogRow)));
  if (!visible.length) $("catalog-list").append(text("p", "empty-state", "条件に一致する登録データはありません。条件を変更するか、絞り込みをクリアしてください。"));
  const buttons = [];
  if (totalPages > 1) for (const [label, page, disabled] of [["前へ", currentPage - 1, currentPage === 1], [`${currentPage} / ${totalPages}`, currentPage, true], ["次へ", currentPage + 1, currentPage === totalPages]]) {
    const button = text("button", "", label); button.type = "button"; button.disabled = disabled; button.addEventListener("click", () => { currentPage = page; renderList(); }); buttons.push(button);
  }
  $("pagination").replaceChildren(...buttons);
}
async function initialize() {
  try {
    const response = await fetch("/api/catalog-progress"); if (!response.ok) throw new Error("カタログを読み込めませんでした"); progress = await response.json();
    $("target-note").textContent = `参考母数: ${progress.targetSource}（${progress.targetConfirmedAt}）。基準と登録の収録範囲の一致は未確認です。`;
    $("summary-grid").replaceChildren(...progress.categories.map(summaryCard)); renderTabs(); renderFilters(); renderList();
    $("catalog-search").addEventListener("input", () => { filters().query = $("catalog-search").value; currentPage = 1; renderList(); });
    $("clear-filters").addEventListener("click", () => { savedFilters[activeCategoryId] = {}; currentPage = 1; renderFilters(); renderList(); });
    $("progress-state").hidden = true;
  } catch (error) { $("progress-state").textContent = error instanceof Error ? error.message : "カタログを読み込めませんでした"; $("progress-state").classList.add("error-text"); }
}
initialize();
