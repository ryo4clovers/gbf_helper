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

function prettyText(record) {
  let text = record.bodyEncoding === "text" ? record.body : bodyPreviewText(record);
  if (record.bodyEncoding === "text" && record.mimeType && record.mimeType.includes("json")) {
    try {
      text = JSON.stringify(JSON.parse(text), null, 1);
    } catch {
      /* leave as-is */
    }
  }
  return text;
}

// --- filename / mimetype helpers for individual export ---

const EXT_BY_MIME = {
  "application/json": "json",
  "text/html": "html",
  "text/css": "css",
  "text/plain": "txt",
  "application/javascript": "js",
  "text/javascript": "js",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "audio/mpeg": "mp3",
};

function extFor(record) {
  if (EXT_BY_MIME[record.mimeType]) return EXT_BY_MIME[record.mimeType];
  const m = record.url.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  if (m) return m[1];
  return record.bodyEncoding === "text" ? "txt" : "bin";
}

function baseNameFor(record) {
  try {
    const u = new URL(record.url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "download";
    return last.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") || "download";
  } catch {
    return "download";
  }
}

function recordToBlob(record) {
  if (record.bodyEncoding === "base64") {
    const bin = atob(record.body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: record.mimeType || "application/octet-stream" });
  }
  return new Blob([record.body], { type: record.mimeType || "text/plain" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function exportRecord(record) {
  const blob = recordToBlob(record);
  downloadBlob(blob, `${baseNameFor(record)}.${extFor(record)}`);
}

async function copyRecord(record, statusEl) {
  try {
    if (record.mimeType && record.mimeType.startsWith("image/") && record.bodyEncoding === "base64") {
      const blob = recordToBlob(record);
      // Clipboard image write only supports a few mime types (png reliably); convert if needed.
      if (record.mimeType !== "image/png") {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d").drawImage(bitmap, 0, 0);
        const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      }
      statusEl.textContent = "画像をコピーしました";
    } else {
      await navigator.clipboard.writeText(prettyText(record));
      statusEl.textContent = "コピーしました";
    }
  } catch (e) {
    statusEl.textContent = "コピー失敗: " + e.message;
  }
  setTimeout(() => (statusEl.textContent = ""), 2500);
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
  theadRow.innerHTML = "<th>時刻</th><th>status</th><th>type</th><th>mimeType</th><th class='url'>URL</th>";
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

        const actions = document.createElement("div");
        actions.className = "actions";

        const copyBtn = document.createElement("button");
        copyBtn.textContent = "コピー";
        const statusEl = document.createElement("span");
        statusEl.className = "action-status";
        copyBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          copyRecord(record, statusEl);
        });

        const exportBtn = document.createElement("button");
        exportBtn.textContent = "この項目をエクスポート";
        exportBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          exportRecord(record);
        });

        actions.appendChild(copyBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(statusEl);
        detailCell.appendChild(actions);

        if (record.mimeType && record.mimeType.startsWith("image/") && record.bodyEncoding === "base64") {
          const img = document.createElement("img");
          img.src = `data:${record.mimeType};base64,${record.body}`;
          detailCell.appendChild(img);
        } else {
          const pre = document.createElement("pre");
          pre.textContent = prettyText(record);
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
  downloadBlob(blob, `gbf-network-recorder-export-${Date.now()}.json`);
});

document.getElementById("clear").addEventListener("click", async () => {
  if (!confirm("記録した全データを削除します。よろしいですか？")) return;
  await clearAll();
  await loadAll();
});

loadAll();
