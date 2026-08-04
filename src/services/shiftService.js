// shiftService — buka/tutup shift, hitung kas sistem (INV-4)
import { getByKey, getByIndex, put, generateId } from '../data/db.js';
import { hitungKasSistem, hitungSelisih } from '../core/shift.js';

// Buka shift baru
export async function bukaShift({ kasir, modalAwal }) {
  // Cek shift open
  const openShifts = await getByIndex('shifts', 'status', 'open');
  if (openShifts.length > 0) {
    throw new Error('Masih ada shift terbuka. Tutup dulu sebelum buka baru.');
  }

  const shift = {
    id: generateId('shf'),
    kasir,
    status: 'open',
    buka: Date.now(),
    tutup: null,
    modalAwal: parseInt(modalAwal),
    kasFisik: null,
    kasSistem: null,
    selisih: null,
    ringkasan: null
  };

  await put('shifts', shift);
  return shift;
}

// Tutup shift — hitung kas sistem (INV-4)
export async function tutupShift(shiftId, kasFisik) {
  const shift = await getByKey('shifts', shiftId);
  if (!shift) throw new Error('Shift tidak ditemukan');
  if (shift.status === 'closed') throw new Error('Shift sudah ditutup');

  // Ambil sales & cashflow milik shift ini
  const { openDB } = await import('../data/db.js');
  const db = await openDB();

  const sales = await new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readonly');
    const req = tx.objectStore('sales').index('shiftId').getAll(shiftId);
    req.onsuccess = () => resolve(req.result.filter(s => !s.void));
    req.onerror = () => reject(req.error);
  });

  const cashflow = await new Promise((resolve, reject) => {
    const tx = db.transaction('cashflow', 'readonly');
    const req = tx.objectStore('cashflow').index('shiftId').getAll(shiftId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  // Hitung kas sistem (INV-4)
  const kasSistem = hitungKasSistem(shift, sales, cashflow);
  const selisih = hitungSelisih(parseInt(kasFisik), kasSistem);

  // Ringkasan per metode bayar
  const metodeCounts = {};
  sales.forEach(s => {
    s.pembayaran.forEach(p => {
      if (!metodeCounts[p.metode]) metodeCounts[p.metode] = { count: 0, total: 0 };
      metodeCounts[p.metode].count++;
      metodeCounts[p.metode].total += p.jumlah;
    });
  });

  shift.status = 'closed';
  shift.tutup = Date.now();
  shift.kasFisik = parseInt(kasFisik);
  shift.kasSistem = kasSistem;
  shift.selisih = selisih;
  shift.ringkasan = {
    totalTransaksi: sales.length,
    omzet: sales.reduce((sum, s) => sum + s.totalNetto, 0),
    perMetode: metodeCounts
  };

  await put('shifts', shift);
  return shift;
}

// Get shift terbuka (null jika tidak ada)
export async function getShiftTerbuka() {
  const open = await getByIndex('shifts', 'status', 'open');
  return open[0] || null;
}

// List shifts
export async function listShifts({ limit = 20 } = {}) {
  const { getAll } = await import('../data/db.js');
  const shifts = await getAll('shifts');
  return shifts
    .sort((a, b) => b.buka - a.buka)
    .slice(0, limit);
}

// Get satu shift
export async function getShift(id) {
  return getByKey('shifts', id);
}
