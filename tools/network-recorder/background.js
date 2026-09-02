// GBF Network Recorder — background service worker.
//
// IMPORTANT (design intent): this extension only ever *reads* network traffic
// that Chrome already received as a result of the human's own manual play in
// the tab (via the Chrome DevTools Protocol's Network domain — the same
// mechanism the built-in DevTools Network panel uses). It never sends its own
// HTTP requests to game.granbluefantasy.jp. Attaching the debugger shows a
// visible "is debugging this browser" banner in Chrome by design; that's
// expected and confirms nothing is happening silently.

import { putAsset, putApiCall, getCounts, clearAll } from "./db.js";

const ALLOWED_HOSTS_SUFFIX = ["game.granbluefantasy.jp", "akamaized.net"];

// Resource types we bother storing. Others (Font, Media, Ping, Manifest, ...)
// are ignored to keep storage focused on what's actually useful.
const ASSET_TYPES = new Set(["Image", "Script", "Stylesheet"]);
const API_TYPES = new Set(["XHR", "Fetch", "Document"]);

// tabId -> Map(requestId -> {url, status, mimeType, resourceType, method})
const pending = new Map();
// tabId currently being recorded, or null.
let recordingTabId = null;

function isAllowedUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return ALLOWED_HOSTS_SUFFIX.some((suf) => u.hostname === suf || u.hostname.endsWith("." + suf));
  } catch {
    return false;
  }
}

function tabPending(tabId) {
  if (!pending.has(tabId)) pending.set(tabId, new Map());
  return pending.get(tabId);
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  if (tabId == null || tabId !== recordingTabId) return;

  if (method === "Network.responseReceived") {
    const { requestId, response, type } = params;
    if (!response || !isAllowedUrl(response.url)) return;
    if (!ASSET_TYPES.has(type) && !API_TYPES.has(type)) return;
    tabPending(tabId).set(requestId, {
      url: response.url,
      status: response.status,
      mimeType: response.mimeType,
      resourceType: type,
    });
  } else if (method === "Network.loadingFinished") {
    const { requestId } = params;
    const info = tabPending(tabId).get(requestId);
    if (!info) return;
    tabPending(tabId).delete(requestId);

    chrome.debugger.sendCommand({ tabId }, "Network.getResponseBody", { requestId }, (result) => {
      if (chrome.runtime.lastError || !result) return; // body may be gone (e.g. cached/opaque); skip silently
      const record = {
        url: info.url,
        status: info.status,
        mimeType: info.mimeType,
        resourceType: info.resourceType,
        timestamp: Date.now(),
        bodyEncoding: result.base64Encoded ? "base64" : "text",
        body: result.body,
      };
      if (ASSET_TYPES.has(info.resourceType)) {
        putAsset(record).catch(() => {});
      } else {
        putApiCall(record).catch(() => {});
      }
    });
  }
});

chrome.debugger.onDetach.addListener((source, reason) => {
  if (source.tabId === recordingTabId) {
    recordingTabId = null;
    pending.delete(source.tabId);
  }
});

async function startRecording(tabId) {
  if (recordingTabId != null) {
    await stopRecording();
  }
  await new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resolve();
    });
  });
  await new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, "Network.enable", {}, () => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resolve();
    });
  });
  recordingTabId = tabId;
  pending.set(tabId, new Map());
}

function stopRecording() {
  return new Promise((resolve) => {
    if (recordingTabId == null) return resolve();
    const tabId = recordingTabId;
    recordingTabId = null;
    pending.delete(tabId);
    chrome.debugger.detach({ tabId }, () => resolve());
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "START_RECORDING": {
        try {
          await startRecording(msg.tabId);
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: String(e.message || e) });
        }
        break;
      }
      case "STOP_RECORDING": {
        await stopRecording();
        sendResponse({ ok: true });
        break;
      }
      case "GET_STATUS": {
        const counts = await getCounts();
        sendResponse({ ok: true, recordingTabId, counts });
        break;
      }
      case "CLEAR_ALL": {
        await clearAll();
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ ok: false, error: "unknown message type" });
    }
  })();
  return true; // keep the message channel open for the async sendResponse
});
