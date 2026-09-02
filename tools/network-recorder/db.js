// Shared IndexedDB helper, used by both background.js (service worker) and
// viewer.js (extension page). Two object stores:
//
//  - "assets": static resources (images/scripts/stylesheets/fonts/media).
//    Keyed by URL, so re-requesting the same asset overwrites instead of
//    duplicating (these are effectively cacheable-by-URL in the game client).
//
//  - "apiCalls": XHR/Fetch/Document responses. Auto-incrementing id, since
//    each response is a meaningful point-in-time snapshot even if the URL
//    repeats (e.g. the same job_equipped endpoint queried at different times).

const DB_NAME = "gbf_network_recorder";
const DB_VERSION = 1;
const ASSETS_STORE = "assets";
const API_CALLS_STORE = "apiCalls";

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        db.createObjectStore(ASSETS_STORE, { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains(API_CALLS_STORE)) {
        const store = db.createObjectStore(API_CALLS_STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("url", "url", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function putRecord(storeName, record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function putAsset(record) {
  return putRecord(ASSETS_STORE, record);
}

export function putApiCall(record) {
  return putRecord(API_CALLS_STORE, record);
}

async function getAll(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getAllAssets() {
  return getAll(ASSETS_STORE);
}

export function getAllApiCalls() {
  return getAll(API_CALLS_STORE);
}

async function count(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCounts() {
  const [assets, apiCalls] = await Promise.all([count(ASSETS_STORE), count(API_CALLS_STORE)]);
  return { assets, apiCalls };
}

export async function clearAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([ASSETS_STORE, API_CALLS_STORE], "readwrite");
    tx.objectStore(ASSETS_STORE).clear();
    tx.objectStore(API_CALLS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
