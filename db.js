const DB_NAME = "financas_pwa";
const DB_VER = 1;

let db = null;

/* ======================
   ABRIR / CRIAR BANCO
====================== */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = () => {
      const dbx = req.result;

      if (!dbx.objectStoreNames.contains("categories")) {
        const s = dbx.createObjectStore("categories", { keyPath: "id" });
        s.createIndex("byType", "type", { unique: false });
      }

      if (!dbx.objectStoreNames.contains("rules")) {
        const s = dbx.createObjectStore("rules", { keyPath: "id" });
        s.createIndex("byActive", "isActive", { unique: false });
        s.createIndex("byType", "type", { unique: false });
      }

      if (!dbx.objectStoreNames.contains("entries")) {
        const s = dbx.createObjectStore("entries", { keyPath: "id" });
        s.createIndex("byMonth", "monthKey", { unique: false });
        s.createIndex("byStatusMonth", ["status", "monthKey"], { unique: false });
        s.createIndex("byRuleMonth", ["ruleId", "monthKey"], { unique: false });
      }
    };

    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

/* ======================
   UTILITÁRIOS
====================== */
function uid() {
  return crypto.randomUUID();
}

function store(name, mode = "readonly") {
  return db.transaction(name, mode).objectStore(name);
}

/* ======================
   OPERAÇÕES BÁSICAS
====================== */
function put(storeName, value) {
  return new Promise((resolve, reject) => {
    const req = store(storeName, "readwrite").put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = store(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function del(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = store(storeName, "readwrite").delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

function clear(storeName) {
  return new Promise((resolve, reject) => {
    const req = store(storeName, "readwrite").clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/* ======================
   CONSULTAS ESPECÍFICAS
====================== */
function getEntriesByStatusMonth(status, monthKey) {
  return new Promise((resolve, reject) => {
    const idx = store("entries").index("byStatusMonth");
    const req = idx.getAll([status, monthKey]);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function existsEntryForRuleMonth(ruleId, monthKey) {
  return new Promise((resolve, reject) => {
    const idx = store("entries").index("byRuleMonth");
    const req = idx.count([ruleId, monthKey]);
    req.onsuccess = () => resolve((req.result || 0) > 0);
    req.onerror = () => reject(req.error);
  });
}

/* ======================
   BACKUP / RESTORE
====================== */
async function exportAll() {
  return {
    exportedAt: new Date().toISOString(),
    categories: await getAll("categories"),
    rules: await getAll("rules"),
    entries: await getAll("entries")
  };
}

async function importAll(data) {
  await clear("entries");
  await clear("rules");
  await clear("categories");

  for (const c of (data.categories || [])) await put("categories", c);
  for (const r of (data.rules || [])) await put("rules", r);
  for (const e of (data.entries || [])) await put("entries", e);

  return true;
}
