// core/hpp.js — HPP rata-rata bergerak. FUNGSI MURNI (tanpa I/O).
// Lihat CLAUDE.md INV-3. Uang = integer rupiah.

/**
 * Hitung HPP & stok baru setelah barang masuk (moving average).
 *
 * @param {object} p
 * @param {number} p.stokLama   stok sebelum barang masuk (boleh <= 0)
 * @param {number} p.hppLama    HPP berjalan sebelumnya (integer rupiah)
 * @param {number} p.qtyMasuk   jumlah masuk (> 0)
 * @param {number} p.hargaBeli  harga beli per unit (integer rupiah)
 * @returns {{stokBaru:number, hppBaru:number}}
 */
export function hitungHppBaru({ stokLama, hppLama, qtyMasuk, hargaBeli }) {
  if (!Number.isFinite(qtyMasuk) || qtyMasuk <= 0) {
    throw new Error('qtyMasuk harus > 0');
  }
  if (!Number.isFinite(hargaBeli) || hargaBeli < 0) {
    throw new Error('hargaBeli tidak valid');
  }

  const stokBaru = stokLama + qtyMasuk;

  // INV-3 kasus tepi: stok lama <= 0 -> HPP mengikuti harga beli terbaru.
  // (Rata-rata bergerak tidak bermakna kalau tak ada / minus stok sebagai basis.)
  if (stokLama <= 0) {
    return { stokBaru, hppBaru: hargaBeli };
  }

  const totalNilai = stokLama * hppLama + qtyMasuk * hargaBeli;
  const hppBaru = Math.round(totalNilai / stokBaru);
  return { stokBaru, hppBaru };
}
