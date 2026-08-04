// reportService — orkestrasi laporan (ambil data, panggil core)
import { openDB } from '../data/db.js';
import { hitungLabaKotor, hitungLabaBersih, produkTerlaris } from '../core/reports.js';

// Laporan omzet & profit (rentang tanggal)
export async function laporanOmzetProfit(dariTanggal, sampaiTanggal) {
  const db = await openDB();

  // Ambil sales & cashflow
  const sales = await querySales(db, dariTanggal, sampaiTanggal);
  const cashflows = await queryCashflow(db, dariTanggal, sampaiTanggal);

  // Hitung
  const labaKotor = hitungLabaKotor(sales);
  const labaBersih = hitungLabaBersih(sales, cashflows);

  // Omzet per metode
  const perMetode = {};
  sales.forEach(s => {
    s.pembayaran.forEach(p => {
      if (!perMetode[p.metode]) perMetode[p.metode] = 0;
      perMetode[p.metode] += p.jumlah;
    });
  });

  const totalOmzet = sales.reduce((sum, s) => sum + s.totalNetto, 0);

  return {
    periode: { dari: dariTanggal, sampai: sampaiTanggal },
    totalTransaksi: sales.length,
    totalOmzet,
    perMetode,
    labaKotor,
    labaBersih
  };
}

// Laporan produk terlaris (rentang)
export async function laporanProdukTerlaris(dariTanggal, sampaiTanggal, limit = 10) {
  const db = await openDB();
  const sales = await querySales(db, dariTanggal, sampaiTanggal);
  return produkTerlaris(sales, limit);
}

// Laporan stok menipis (sudah ada di stockService, tapi untuk konsistensi)
export async function laporanStokMenurun() {
  const { produkMenurun } = await import('../services/stockService.js');
  return produkMenurun();
}

// Riwayat shift (limit)
export async function laporanShift(limit = 20) {
  const { listShifts } = await import('../services/shiftService.js');
  return listShifts({ limit });
}

// Helper: query sales rentang (exclude void)
async function querySales(db, dari, sampai) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readonly');
    const idx = tx.objectStore('sales').index('tanggal');
    const range = IDBKeyRange.bound(dari, sampai);
    const req = idx.getAll(range);
    req.onsuccess = () => resolve(req.result.filter(s => !s.void));
    req.onerror = () => reject(req.error);
  });
}

// Helper: query cashflow rentang
async function queryCashflow(db, dari, sampai) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cashflow', 'readonly');
    const idx = tx.objectStore('cashflow').index('tanggal');
    const range = IDBKeyRange.bound(dari, sampai);
    const req = idx.getAll(range);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Export database (semua data) — untuk backup
export async function exportDatabase() {
  const db = await openDB();
  const stores = ['products', 'purchases', 'sales', 'shifts', 'cashflow', 'stockMoves', 'meta'];
  
  const data = {};
  for (const storeName of stores) {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    data[storeName] = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    version: 1,
    exported: Date.now(),
    data
  };
}

// Import database (restore backup) — WARNING: overwrite semua data
export async function importDatabase(backup) {
  if (backup.version !== 1) throw new Error('Versi backup tidak didukung');

  const db = await openDB();
  const stores = Object.keys(backup.data);

  for (const storeName of stores) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Clear store
    await new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Insert data
    for (const record of backup.data[storeName]) {
      await new Promise((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  }

  // Update backupTerakhir
  const { put } = await import('../data/db.js');
  await put('meta', { key: 'backupTerakhir', value: Date.now() });
}
