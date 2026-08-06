// cashflowService — kas masuk/keluar non-penjualan
import { getByKey, getByIndex, put, generateId } from '../data/db.js';

// Catat cashflow
export async function catatCashflow({ shiftId, jenis, kategori, nominal, keterangan, tunai = true }) {
  if (!shiftId) throw new Error('shiftId wajib');
  if (!['masuk', 'keluar'].includes(jenis)) throw new Error('jenis harus masuk/keluar');

  nominal = Number(nominal);
  if (!Number.isSafeInteger(nominal) || nominal <= 0) {
    throw new Error('nominal harus bilangan bulat rupiah > 0');
  }

  // Validasi kategori
  if (!KATEGORI[jenis].includes(kategori)) {
    throw new Error(`Kategori '${kategori}' tidak valid untuk ${jenis}. Pilih dari: ${KATEGORI[jenis].join(', ')}`);
  }

  // Validasi shift masih open
  const shift = await getByKey('shifts', shiftId);
  if (!shift || shift.status !== 'open') {
    throw new Error('Shift tidak terbuka');
  }

  const cashflow = {
    id: generateId('cf'),
    shiftId,
    tanggal: Date.now(),
    jenis,
    kategori: kategori || '',
    nominal,
    keterangan: keterangan || '',
    tunai
  };

  await put('cashflow', cashflow);
  return cashflow;
}

// List cashflow (filter shift/rentang)
export async function listCashflow({ shiftId, dariTanggal, sampaiTanggal } = {}) {
  const db = await import('../data/db.js').then(m => m.openDB());
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cashflow', 'readonly');
    const store = tx.objectStore('cashflow');

    let req;
    if (shiftId) {
      req = store.index('shiftId').getAll(shiftId);
    } else if (dariTanggal && sampaiTanggal) {
      const range = IDBKeyRange.bound(dariTanggal, sampaiTanggal);
      req = store.index('tanggal').getAll(range);
    } else {
      req = store.getAll();
    }

    req.onsuccess = () => resolve(req.result.sort((a, b) => b.tanggal - a.tanggal));
    req.onerror = () => reject(req.error);
  });
}

// Kategori default (bisa ditambah di pengaturan nanti)
export const KATEGORI = {
  keluar: ['operasional', 'beli_stok', 'prive'],
  masuk: ['modal_tambahan', 'lain']
};
