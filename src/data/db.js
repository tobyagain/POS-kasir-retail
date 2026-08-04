// IndexedDB wrapper — buka DB, migrasi, operasi dasar
import { DB_NAME, DB_VERSION, STORES } from './schema.js';

let dbInstance = null;

// Buka/upgrade DB — panggil sekali saat app start
export function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Migrasi v0→v1: buat semua store
      if (oldVersion < 1) {
        STORES.forEach(storeDef => {
          const store = db.createObjectStore(storeDef.name, {
            keyPath: storeDef.keyPath,
            autoIncrement: storeDef.autoIncrement || false
          });
          if (storeDef.indexes) {
            storeDef.indexes.forEach(idx => {
              store.createIndex(idx.name, idx.keyPath, { unique: idx.unique || false });
            });
          }
        });

        // Seed data meta awal
        const metaTx = event.target.transaction.objectStore('meta');
        metaTx.add({ key: 'counterStruk', value: { periode: '', next: 1 } });
        metaTx.add({ key: 'counterNota', value: { periode: '', next: 1 } });
        metaTx.add({ key: 'toko', value: { nama: 'Toko Saya', alamat: '', telp: '' } });
        metaTx.add({ key: 'printerEnabled', value: false });
        metaTx.add({ key: 'printerWidth', value: '58' });
        metaTx.add({ key: 'drawerEnabled', value: false });
        metaTx.add({ key: 'printMethod', value: 'browser' });
        metaTx.add({ key: 'resetStrukBulanan', value: true });
        metaTx.add({ key: 'backupTerakhir', value: 0 });
      }

      // Migrasi v1→v2 (contoh placeholder untuk nanti):
      // if (oldVersion < 2) { ... }
    };
  });
}

// Get satu record by key
export async function getByKey(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get semua record dari store
export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get via index
export async function getByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const idx = tx.objectStore(storeName).index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Put (insert/update) satu record
export async function put(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Delete record by key
export async function deleteByKey(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Transaksi manual — untuk operasi atomik lintas store
// Callback terima map { storeName: objectStore }
export async function transaction(storeNames, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    const stores = {};
    storeNames.forEach(name => {
      stores[name] = tx.objectStore(name);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));

    try {
      callback(stores, tx);
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}

// Helper: generate ID dengan prefiks
export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Helper: format nomor dokumen TRX-YYMM-NNNN
export function formatNomorDokumen(prefix, periode, seq) {
  return `${prefix}-${periode}-${String(seq).padStart(4, '0')}`;
}

// Helper: periode YYMM dari epoch ms
export function getPeriode(timestamp) {
  const d = new Date(timestamp);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return yy + mm;
}
