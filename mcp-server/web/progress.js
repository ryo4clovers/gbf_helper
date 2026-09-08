const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("ja-JP");
const PAGE_SIZE = 100;
const elementLabels = { "1": "火", "2": "水", "3": "土", "4": "風", "5": "光", "6": "闇" };
const categorySymbols = { weapons: "剣", summons: "晶", characters: "人" };
let progress;
let activeCategoryId = "weapons";
let currentPage = 1;

function text(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}

function activeCategory() {
  return progress.categories.find((category) => category.id === activeCategoryId);
}

function summaryCard(category) {
  const card = document.createElement("article");
  card.className = `summary-card ${category.id}${category.exceedsTarget ? " exceeds" : ""}`;
  const heading = document.createElement("div");
  heading.className = "summary-heading";
  heading.append(text("span", "summary-symbol", categorySymbols[category.id]), text("span", "summary-label", category.label));
  const count = document.createElement("p");
  count.className = "summary-count";
  count.append(text("strong", "summary-value", number.format(category.registeredCount)), text("span", "summary-target", `/ ${number.format(category.targetCount)}`));
  const track = document.createElement("div");
  track.className = "catalog-track";
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-valuenow", String(category.registeredCount));
  track.setAttribute("aria-valuemax", String(category.targetCount));
  const fill = document.createElement("span");
  fill.style.width = `${Math.min(category.coveragePercent, 100)}%`;
  track.append(fill);
  const footer = document.createElement("div");
  footer.className = "summary-footer";
  footer.append(
    text("strong", "coverage-value", `${category.coveragePercent}%`),
    text("span", category.exceedsTarget ? "scope-warning" : "summary-note", category.exceedsTarget ? `基準より${number.format(category.registeredCount - category.targetCount)}件多いため要確認` : `残り ${number.format(category.remainingCount)}件`),
  );
  card.append(heading, count, track, footer);
  return card;
}

function tabButton(category) {
  const button = document.createElement("button");
  const active = category.id === activeCategoryId;
  button.type = "button";
  button.className = `catalog-tab${active ? " active" : ""}`;
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", String(active));
  button.dataset.categoryId = category.id;
  button.append(text("span", "tab-symbol", categorySymbols[category.id]), text("span", "", category.label), text("strong", "", number.format(category.registeredCount)));
  button.addEventListener("click", () => {
    activeCategoryId = category.id;
    currentPage = 1;
    renderTabs();
    renderList();
  });
  return button;
}

function renderTabs() {
  $("catalog-tabs").replaceChildren(...progress.categories.map(tabButton));
}

function normalized(value) {
  return value.normalize("NFKC").toLocaleLowerCase("ja");
}

function filteredItems(category) {
  const query = normalized($("catalog-search").value.trim());
  if (!query) return category.items;
  return category.items.filter((item) => normalized([item.name, item.nameEn, item.id, item.detail].filter(Boolean).join(" ")).includes(query));
}

function catalogRow(item) {
  const row = document.createElement("article");
  row.className = "catalog-row";
  const identity = document.createElement("div");
  identity.className = "catalog-identity";
  identity.append(text("strong", "catalog-name", item.name));
  if (item.nameEn && item.nameEn !== item.detail) identity.append(text("span", "catalog-name-en", item.nameEn));
  identity.append(text("code", "catalog-id", item.id));
  const badges = document.createElement("div");
  badges.className = "catalog-badges";
  badges.append(
    text("span", `catalog-badge element-${item.elementCode}`, elementLabels[item.elementCode] ?? "属性不明"),
    text("span", "catalog-badge rarity", item.rarity),
    text("span", `catalog-badge status ${item.verificationStatus === "検証済み" ? "verified" : "draft"}`, item.verificationStatus),
  );
  row.append(identity, text("span", "catalog-detail", item.detail), badges);
  return row;
}

function pageButton(label, page, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", () => {
    currentPage = page;
    renderList();
    $("catalog-list").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  return button;
}

function renderPagination(totalPages) {
  const root = $("pagination");
  if (totalPages <= 1) {
    root.replaceChildren();
    return;
  }
  root.replaceChildren(
    pageButton("前へ", Math.max(1, currentPage - 1), currentPage === 1),
    text("span", "page-position", `${currentPage} / ${totalPages}`),
    pageButton("次へ", Math.min(totalPages, currentPage + 1), currentPage === totalPages),
  );
}

function renderList() {
  const category = activeCategory();
  const items = filteredItems(category);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = items.slice(start, start + PAGE_SIZE);
  $("list-status").textContent = `${category.label}: ${number.format(items.length)}件${items.length !== category.items.length ? ` / 全${number.format(category.items.length)}件` : ""}`;
  $("catalog-list").replaceChildren(...visible.map(catalogRow));
  if (visible.length === 0) $("catalog-list").append(text("p", "empty-state", "条件に一致する登録データはありません"));
  renderPagination(totalPages);
}

async function initialize() {
  try {
    const response = await fetch("/api/catalog-progress");
    if (!response.ok) throw new Error("カタログを読み込めませんでした");
    progress = await response.json();
    $("target-note").textContent = `基準件数: ${progress.targetSource}（${progress.targetConfirmedAt}）`;
    $("summary-grid").replaceChildren(...progress.categories.map(summaryCard));
    renderTabs();
    renderList();
    $("catalog-search").addEventListener("input", () => {
      currentPage = 1;
      renderList();
    });
    $("progress-state").hidden = true;
  } catch (error) {
    $("progress-state").textContent = error instanceof Error ? error.message : "カタログを読み込めませんでした";
    $("progress-state").classList.add("error-text");
  }
}

initialize();
