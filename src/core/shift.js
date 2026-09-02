// core/shift.js — hitung kas sistem & selisih shift. FUNGSI MURNI.
// Lihat CLAUDE.md INV-4. Hanya penjualan TUNAI yang menyentuh laci.
import { alokasiPembayaranNetto } from './reports.js';

/**
 * Total bagian TUNAI dari semua penjualan (mengabaikan yang void).
 * QRIS/transfer/kartu diabaikan — tidak masuk laci.
 * PENTING: hitung tunaiDibayar - kembalian (yang masuk laci netto).
 * @param {Array} sales  array sale (punya .void, .pembayaran[], .kembalian)
 * @returns {number}
 */
export function totalTunaiPenjualan(sales) {
  let total = 0;
  for (const s of sales) {
    if (s.void) {
      // Refund pending belum mengubah laci; refund selesai mengurangi laci.
      if (s.refund?.status === 'selesai') total -= Number(s.refund.tunai || 0);
      continue;
    }
    const tunaiDibayar = (s.pembayaran || []).filter(p => p.metode === 'tunai').reduce((sum, p) => sum + p.jumlah, 0);
    const kembalian = s.kembalian || 0;
    total += (tunaiDibayar - kembalian);
  }
  return total;
}

/**
 * Kas keluar/masuk manual (cashflow) yang menyentuh laci tunai, dalam shift ini.
 * @param {Array} cashflow  array cashflow (punya .jenis 'masuk'|'keluar', .nominal, .tunai)
 * @returns {{masuk:number, keluar:number}}
 */
export function totalKasManual(cashflow) {
  let masuk = 0, keluar = 0;
  for (const c of cashflow) {
    if (c.tunai === false) continue; // non-tunai tidak menyentuh laci
    if (c.jenis === 'masuk') masuk += c.nominal;
    else if (c.jenis === 'keluar') keluar += c.nominal;
  }
  return { masuk, keluar };
}

/**
 * Kas yang seharusnya ada di laci menurut sistem (INV-4).
 * @param {object} shift     punya .modalAwal
 * @param {Array}  sales     penjualan shift ini
 * @param {Array}  cashflow  kas manual shift ini
 * @returns {number}
 */
export function hitungKasSistem(shift, sales, cashflow) {
  const tunai = totalTunaiPenjualan(sales);
  const { masuk, keluar } = totalKasManual(cashflow);
  return shift.modalAwal + tunai + masuk - keluar;
}

/**
 * Selisih = kas fisik (dihitung kasir) - kas sistem.
 * > 0 lebih, < 0 kurang.
 */
export function hitungSelisih(kasFisik, kasSistem) {
  return kasFisik - kasSistem;
}

/**
 * Ringkasan omzet per metode bayar (semua metode, exclude void).
 * Omzet TIDAK sama dengan kas laci — QRIS/transfer tetap omzet.
 * @param {Array} sales
 * @returns {Object<string,number>} mis. { tunai: 500000, qris: 120000 }
 */
export function ringkasanPerMetode(sales) {
  const out = {};
  for (const s of sales) {
    if (s.void) continue;
    for (const p of alokasiPembayaranNetto(s)) {
      out[p.metode] = (out[p.metode] || 0) + p.jumlah;
    }
  }
  return out;
}
