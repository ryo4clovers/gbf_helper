const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("ja-JP");
const rarityOrder = ["N", "R", "SR", "SSR"];

function text(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}

function summaryCard(label, value, note, tone) {
  const card = document.createElement("article");
  card.className = `summary-card ${tone}`;
  card.append(text("span", "summary-label", label));
  card.append(text("strong", "summary-value", number.format(value)));
  card.append(text("small", "summary-note", note));
  return card;
}

function metricRow(label, value, maximum, note, tone) {
  const row = document.createElement("div");
  row.className = "collection-metric";
  const heading = document.createElement("div");
  heading.append(text("span", "", label), text("strong", "", `${number.format(value)}件`));
  const track = document.createElement("div");
  track.className = "collection-track";
  track.setAttribute("role", "img");
  track.setAttribute("aria-label", `${label} ${number.format(value)}件`);
  const fill = document.createElement("span");
  fill.className = `collection-fill ${tone}`;
  fill.style.width = `${maximum === 0 ? 0 : Math.max(2, (value / maximum) * 100)}%`;
  track.append(fill);
  row.append(heading, track, text("small", "metric-note", note));
  return row;
}

function countsMap(entries) {
  return new Map(entries.map((entry) => [entry.label, entry.count]));
}

function rarityTable(category) {
  const archive = countsMap(category.archive.byRarity);
  const knowledge = countsMap(category.knowledge.byRarity);
  const calculator = countsMap(category.calculator.byRarity);
  const wrap = document.createElement("div");
  wrap.className = "rarity-table-wrap";
  const table = document.createElement("table");
  table.className = "rarity-table";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(text("th", "", "段階"));
  for (const rarity of rarityOrder) headRow.append(text("th", "", rarity));
  head.append(headRow);
  const body = document.createElement("tbody");
  for (const [label, source] of [["図鑑", archive], ["ナレッジ", knowledge], ["計算機", calculator]]) {
    const row = document.createElement("tr");
    row.append(text("th", "", label));
    for (const rarity of rarityOrder) row.append(text("td", "", number.format(source.get(rarity) ?? 0)));
    body.append(row);
  }
  table.append(head, body);
  wrap.append(table);
  return wrap;
}

function categoryCard(category) {
  const card = document.createElement("article");
  card.className = `surface category-card ${category.id}`;
  const heading = document.createElement("div");
  heading.className = "category-heading";
  const titleGroup = document.createElement("div");
  titleGroup.append(text("span", "category-symbol", category.id === "weapons" ? "剣" : "晶"));
  const copy = document.createElement("div");
  copy.append(text("h2", "", category.label), text("p", "", `最終更新 ${category.knowledge.latestUpdated ?? "未設定"}`));
  titleGroup.append(copy);
  const coverage = document.createElement("div");
  coverage.className = "coverage-value";
  coverage.append(text("strong", "", `${category.calculatorToKnowledgePercent}%`), text("span", "", "件数比（計算機 / ナレッジ）"));
  heading.append(titleGroup, coverage);

  const maximum = Math.max(category.archive.total, category.knowledge.total, category.calculator.total);
  const metrics = document.createElement("div");
  metrics.className = "collection-metrics";
  metrics.append(
    metricRow("図鑑レスポンス取得", category.archive.total, maximum, `${category.archive.capturedAt}・${category.archive.scope}`, "archive"),
    metricRow("ナレッジ登録", category.knowledge.total, maximum, `下書き ${category.knowledge.draft}件・検証済み ${category.knowledge.verified}件`, "knowledge"),
    metricRow("計算機対応", category.calculator.total, maximum, `検証済み ${category.calculator.verified}件・${category.calculator.statReadyLabel} ${category.calculator.statReady}件`, "calculator"),
  );
  card.append(heading, metrics, rarityTable(category));
  return card;
}

function elementPanel(category) {
  const panel = document.createElement("article");
  panel.className = "element-panel";
  panel.append(text("h3", "", category.label));
  const knowledge = countsMap(category.knowledge.byElement);
  const calculator = countsMap(category.calculator.byElement);
  const elements = ["火", "水", "土", "風", "光", "闇"];
  const maximum = Math.max(1, ...elements.map((element) => knowledge.get(element) ?? 0));
  for (const element of elements) {
    const row = document.createElement("div");
    row.className = "element-row";
    const knowledgeCount = knowledge.get(element) ?? 0;
    const calculatorCount = calculator.get(element) ?? 0;
    row.append(text("span", `element-label ${element}`, element));
    const bars = document.createElement("div");
    bars.className = "element-bars";
    const background = document.createElement("span");
    background.className = "element-knowledge-bar";
    background.style.width = `${(knowledgeCount / maximum) * 100}%`;
    const foreground = document.createElement("span");
    foreground.className = "element-calculator-bar";
    foreground.style.width = `${(calculatorCount / maximum) * 100}%`;
    bars.append(background, foreground);
    const values = text("span", "element-values", `${calculatorCount} / ${knowledgeCount}`);
    values.setAttribute("aria-label", `計算機 ${calculatorCount}件、ナレッジ ${knowledgeCount}件`);
    row.append(bars, values);
    panel.append(row);
  }
  return panel;
}

function renderSeries(entries) {
  const root = $("series-breakdown");
  const maximum = Math.max(1, ...entries.map((entry) => entry.count));
  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "series-row";
    row.append(text("span", "series-name", entry.label));
    const track = document.createElement("div");
    track.className = "series-track";
    const fill = document.createElement("span");
    fill.style.width = `${(entry.count / maximum) * 100}%`;
    track.append(fill);
    row.append(track, text("strong", "series-count", number.format(entry.count)));
    root.append(row);
  }
}

async function initialize() {
  try {
    const response = await fetch("/api/collection-progress");
    if (!response.ok) throw new Error("進捗データを読み込めませんでした");
    const progress = await response.json();
    $("summary-grid").append(
      summaryCard("図鑑レスポンス", progress.summary.archiveTotal, "所持済み図鑑から取得", "archive"),
      summaryCard("ナレッジ", progress.summary.knowledgeTotal, "構造化Markdown", "knowledge"),
      summaryCard("計算機対応", progress.summary.calculatorTotal, "計算カタログ登録済み", "calculator"),
    );
    for (const category of progress.categories) $("category-grid").append(categoryCard(category));
    for (const category of progress.categories) $("element-breakdowns").append(elementPanel(category));
    const weapons = progress.categories.find((category) => category.id === "weapons");
    if (weapons) renderSeries(weapons.knowledge.bySeries);
    $("progress-state").hidden = true;
  } catch (error) {
    $("progress-state").textContent = error instanceof Error ? error.message : "進捗データを読み込めませんでした";
    $("progress-state").classList.add("error-text");
  }
}

initialize();
