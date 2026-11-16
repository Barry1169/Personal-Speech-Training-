// IndexedDB wrapper with explicit, versioned migrations.
// SpeechCoach stores everything locally so progress survives app updates and works offline.

const DB_NAME = "speechcoach";
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      const old = e.oldVersion;
      // ---- Migration to v1: core stores ----
      if (old < 1) {
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "key" });
        const ex = db.createObjectStore("exercises", { keyPath: "id" });
        ex.createIndex("category", "category", { unique: false });
        const lg = db.createObjectStore("logs", { keyPath: "id" });
        lg.createIndex("date", "date", { unique: false });
      }
      // ---- Migration to v2: recordings + audio blobs ----
      if (old < 2) {
        if (!db.objectStoreNames.contains("recordings")) {
          const r = db.createObjectStore("recordings", { keyPath: "id" });
          r.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      }
      // Future migrations: add `if (old < N)` blocks here. Existing data is never dropped.
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("Database open blocked by another tab."));
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  return getDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const out = fn(s);
        t.oncomplete = () => {
          if (out && "result" in out) resolve((out as IDBRequest).result as T);
          else resolve(undefined as T);
        };
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export const idbGet = <T>(store: string, key: string | number): Promise<T | undefined> =>
  run<T | undefined>(store, "readonly", (s) => s.get(key));

export const idbAll = <T>(store: string): Promise<T[]> => run<T[]>(store, "readonly", (s) => s.getAll());

export const idbPut = (store: string, value: unknown, key?: IDBValidKey): Promise<IDBValidKey> =>
  run<IDBValidKey>(store, "readwrite", (s) => (key !== undefined ? s.put(value as any, key) : s.put(value as any)));

export const idbDelete = (store: string, key: string | number): Promise<void> =>
  run<void>(store, "readwrite", (s) => {
    s.delete(key);
  });

export const idbClear = (store: string): Promise<void> =>
  run<void>(store, "readwrite", (s) => {
    s.clear();
  });

// ---- base64 helpers for JSON backup of audio blobs ----
export function blobToB64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const s = String(fr.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

export function b64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
