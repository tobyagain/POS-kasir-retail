// shiftService — buka/tutup shift, hitung kas sistem (INV-4)
import { getByKey, getByIndex, put, generateId } from '../data/db.js';
import { hitungKasSistem, hitungSelisih, ringkasanPerMetode } from '../core/shift.js';

// Buka shift baru
export async function bukaShift({ kasir, modalAwal }) {
  // Cek shift open
  const openShifts = await getByIndex('shifts', 'status', 'open');
  if (openShifts.length > 0) {
    throw new Error('Masih ada shift terbuka. Tutup dulu sebelum buka baru.');
  }

  modalAwal = Number(modalAwal);
  if (!kasir || !Number.isSafeInteger(modalAwal) || modalAwal < 0) {
    throw new Error('Kasir dan modal awal harus valid');
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

  kasFisik = Number(kasFisik);
  if (!Number.isSafeInteger(kasFisik) || kasFisik < 0) {
    throw new Error('Kas fisik harus bilangan bulat rupiah >= 0');
  }

  // Ambil sales & cashflow milik shift ini
  const { openDB } = await import('../data/db.js');
  const db = await openDB();

  const salesAll = await new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readonly');
    const req = tx.objectStore('sales').index('shiftId').getAll(shiftId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const sales = salesAll.filter(s => !s.void);

  const cashflow = await new Promise((resolve, reject) => {
    const tx = db.transaction('cashflow', 'readonly');
    const req = tx.objectStore('cashflow').index('shiftId').getAll(shiftId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  // Hitung kas sistem (INV-4)
  const kasSistem = hitungKasSistem(shift, salesAll, cashflow);
  const selisih = hitungSelisih(kasFisik, kasSistem);

  // Ringkasan per metode bayar memakai omzet netto, bukan uang lebih.
  const metodeCounts = {};
  const perMetode = ringkasanPerMetode(sales);
  for (const [metode, total] of Object.entries(perMetode)) {
    metodeCounts[metode] = {
      count: sales.filter(s => !s.void && (s.pembayaran || []).some(p => p.metode === metode)).length,
      total
    };
  }

  shift.status = 'closed';
  shift.tutup = Date.now();
  shift.kasFisik = kasFisik;
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
