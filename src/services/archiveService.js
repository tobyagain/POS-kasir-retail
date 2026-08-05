// archiveService — arsip data lama, bersihkan DB untuk performa
import { getAll, transaction, openDB } from '../data/db.js';

/**
 * Arsip transaksi & data terkait lebih lama dari cutoffDate.
 * Export ke JSON, lalu hapus dari IndexedDB.
 * 
 * @param {number} cutoffDate - epoch ms, data sebelum ini diarsipkan
 * @returns {object} { archived: {...}, deletedCounts: {...} }
 */
export async function archiveOldData(cutoffDate) {
  const sales = await getAll('sales');
  const purchases = await getAll('purchases');
  const shifts = await getAll('shifts');
  const cashflow = await getAll('cashflow');
  const stockMoves = await getAll('stockMoves');

  // Filter data lama
  const oldSales = sales.filter(s => s.tanggal < cutoffDate);
  const oldPurchases = purchases.filter(p => p.tanggal < cutoffDate);
  const oldShifts = shifts.filter(sh => sh.buka < cutoffDate);
  const oldCashflow = cashflow.filter(c => c.tanggal < cutoffDate);
  const oldStockMoves = stockMoves.filter(m => m.tanggal < cutoffDate);

  // Shift IDs yang akan dihapus
  const oldShiftIds = new Set(oldShifts.map(s => s.id));

  // Arsip bundle
  const archive = {
    exportDate: Date.now(),
    cutoffDate,
    sales: oldSales,
    purchases: oldPurchases,
    shifts: oldShifts,
    cashflow: oldCashflow,
    stockMoves: oldStockMoves
  };

  // Hapus dari IndexedDB
  const db = await openDB();
  await transaction(
    ['sales', 'purchases', 'shifts', 'cashflow', 'stockMoves'],
    'readwrite',
    (stores) => {
      oldSales.forEach(s => stores.sales.delete(s.id));
      oldPurchases.forEach(p => stores.purchases.delete(p.id));
      oldShifts.forEach(sh => stores.shifts.delete(sh.id));
      oldCashflow.forEach(c => stores.cashflow.delete(c.id));
      oldStockMoves.forEach(m => stores.stockMoves.delete(m.id));
    }
  );

  return {
    archived: archive,
    deletedCounts: {
      sales: oldSales.length,
      purchases: oldPurchases.length,
      shifts: oldShifts.length,
      cashflow: oldCashflow.length,
      stockMoves: oldStockMoves.length
    }
  };
}

/**
 * Arsip otomatis data >1 tahun (atau threshold setting).
 * Panggil dari UI Pengaturan atau cron manual.
 */
export async function autoArchiveOldData(thresholdMonths = 12) {
  const now = Date.now();
  const cutoff = now - (thresholdMonths * 30 * 24 * 60 * 60 * 1000);
  
  const result = await archiveOldData(cutoff);
  
  // Download arsip JSON
  const blob = new Blob([JSON.stringify(result.archived, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arsip-${formatDate(cutoff)}-to-${formatDate(result.archived.exportDate)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  return result.deletedCounts;
}

/**
 * Restore arsip (import kembali ke DB).
 * Untuk audit/laporan data lama.
 */
export async function restoreArchive(archiveJson) {
  const archive = typeof archiveJson === 'string' 
    ? JSON.parse(archiveJson)
    : archiveJson;

  await transaction(
    ['sales', 'purchases', 'shifts', 'cashflow', 'stockMoves'],
    'readwrite',
    (stores) => {
      archive.sales?.forEach(s => stores.sales.put(s));
      archive.purchases?.forEach(p => stores.purchases.put(p));
      archive.shifts?.forEach(sh => stores.shifts.put(sh));
      archive.cashflow?.forEach(c => stores.cashflow.put(c));
      archive.stockMoves?.forEach(m => stores.stockMoves.put(m));
    }
  );

  return {
    restored: {
      sales: archive.sales?.length || 0,
      purchases: archive.purchases?.length || 0,
      shifts: archive.shifts?.length || 0,
      cashflow: archive.cashflow?.length || 0,
      stockMoves: archive.stockMoves?.length || 0
    }
  };
}

function formatDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}
