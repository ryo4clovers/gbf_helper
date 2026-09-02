import { getAllApiCalls, getAllAssets, clearAll } from "./db.js";

const theadRow = document.getElementById("theadRow");
const tbody = document.getElementById("tbody");
const summary = document.getElementById("summary");
const filterInput = document.getElementById("filter");
const tabApiBtn = document.getElementById("tabApi");
const tabAssetsBtn = document.getElementById("tabAssets");

let currentTab = "api"; // "api" | "assets"
let apiCalls = [];
let assets = [];

function fmtTime(ts) {
  return new Date(ts).toLocaleString("ja-JP");
}

function bodyPreviewText(record) {
  if (record.bodyEncoding === "text") return record.body;
  return "(base64バイナリ, " + Math.round((record.body.length * 3) / 4 / 1024) + " KB)";
}

async function loadAll() {
  [apiCalls, assets] = await Promise.all([getAllApiCalls(), getAllAssets()]);
  apiCalls.sort((a, b) => b.timestamp - a.timestamp);
  assets.sort((a, b) => b.timestamp - a.timestamp);
  summary.textContent = `apiCalls: ${apiCalls.length}件 / assets: ${assets.length}件`;
  render();
}

function currentList() {
  const list = currentTab === "api" ? apiCalls : assets;
  const filter = filterInput.value.trim().toLowerCase();
  if (!filter) return list;
  return list.filter((r) => r.url.toLowerCase().includes(filter));
}

function render() {
  const list = currentList();
  if (currentTab === "api") {
    theadRow.innerHTML = "<th>時刻</th><th>status</th><th>type</th><th>mimeType</th><th class='url'>URL</th>";
  } else {
    theadRow.innerHTML = "<th>時刻</th><th>status</th><th>type</th><th>mimeType</th><th class='url'>URL</th>";
  }
  tbody.innerHTML = "";
  for (const record of list) {
    const row = document.createElement("tr");
    row.className = "row";
    row.innerHTML = `<td>${fmtTime(record.timestamp)}</td><td>${record.status}</td><td>${record.resourceType}</td><td>${record.mimeType || ""}</td><td class="url">${record.url}</td>`;
    const detail = document.createElement("tr");
    detail.className = "detail";
    const detailCell = document.createElement("td");
    detailCell.colSpan = 5;
    detail.appendChild(detailCell);

    row.addEventListener("click", () => {
      const showing = detail.style.display === "table-row";
      detail.style.display = showing ? "none" : "table-row";
      if (!showing && !detailCell.dataset.filled) {
        detailCell.dataset.filled = "1";
        if (record.mimeType && record.mimeType.startsWith("image/") && record.bodyEncoding === "base64") {
          const img = document.createElement("img");
          img.src = `data:${record.mimeType};base64,${record.body}`;
          detailCell.appendChild(img);
        } else {
          const pre = document.createElement("pre");
          let text = bodyPreviewText(record);
          if (record.bodyEncoding === "text" && record.mimeType && record.mimeType.includes("json")) {
            try {
              text = JSON.stringify(JSON.parse(text), null, 1);
            } catch {
              /* leave as-is */
            }
          }
          pre.textContent = text;
          detailCell.appendChild(pre);
        }
      }
    });

    tbody.appendChild(row);
    tbody.appendChild(detail);
  }
}

function setTab(tab) {
  currentTab = tab;
  tabApiBtn.classList.toggle("active", tab === "api");
  tabAssetsBtn.classList.toggle("active", tab === "assets");
  render();
}

tabApiBtn.addEventListener("click", () => setTab("api"));
tabAssetsBtn.addEventListener("click", () => setTab("assets"));
filterInput.addEventListener("input", render);
document.getElementById("reload").addEventListener("click", loadAll);

document.getElementById("export").addEventListener("click", async () => {
  const exportObj = {
    exportedAt: new Date().toISOString(),
    apiCalls,
    assets,
  };
  const blob = new Blob([JSON.stringify(exportObj)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gbf-network-recorder-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
});

document.getElementById("clear").addEventListener("click", async () => {
  if (!confirm("記録した全データを削除します。よろしいですか？")) return;
  await clearAll();
  await loadAll();
});

loadAll();
