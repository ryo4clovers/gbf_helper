const statusEl = document.getElementById("status");
const countsEl = document.getElementById("counts");
const toggleBtn = document.getElementById("toggle");
const openViewerBtn = document.getElementById("openViewer");
const errorEl = document.getElementById("error");

function sendMessage(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

async function refresh() {
  const res = await sendMessage({ type: "GET_STATUS" });
  if (!res || !res.ok) return;
  const recording = res.recordingTabId != null;
  statusEl.textContent = recording ? "記録中…" : "未記録";
  statusEl.className = recording ? "on" : "off";
  toggleBtn.textContent = recording ? "記録停止" : "記録開始";
  countsEl.textContent = `assets: ${res.counts.assets} / apiCalls: ${res.counts.apiCalls}`;
}

toggleBtn.addEventListener("click", async () => {
  errorEl.textContent = "";
  const res = await sendMessage({ type: "GET_STATUS" });
  if (res.recordingTabId != null) {
    await sendMessage({ type: "STOP_RECORDING" });
    await refresh();
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/game\.granbluefantasy\.jp\//.test(tab.url || "")) {
    errorEl.textContent = "グラブルのタブ(game.granbluefantasy.jp)をアクティブにしてから開始してください。";
    return;
  }
  const startRes = await sendMessage({ type: "START_RECORDING", tabId: tab.id });
  if (!startRes.ok) {
    errorEl.textContent = "記録開始に失敗しました: " + startRes.error;
  }
  await refresh();
});

openViewerBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
});

refresh();
