// Validasi checkout — logika murni, tanpa DOM/IndexedDB.
// Dipakai UI kasir sebelum simpanPenjualan; dites tanpa mock.

// items: array keranjang (subtotal), pembayaran: array {metode, jumlah}, totalNetto: integer rupiah
export function validateCheckout(items, pembayaran, totalNetto) {
  if (!items || items.length === 0) return { ok: false, reason: 'keranjang-kosong' };
  if (!pembayaran || pembayaran.length === 0) return { ok: false, reason: 'belum-bayar' };
  const dibayar = pembayaran.reduce((s, p) => s + p.jumlah, 0);
  if (dibayar < totalNetto) {
    return { ok: false, reason: 'kurang-bayar', kurang: totalNetto - dibayar };
  }
  return { ok: true };
}

// Kembalian hanya dari kelebihan uang TUNAI.
// QRIS/transfer/kartu selalu dibayar pas; kelebihan non-tunai bukan kembalian.
export function hitungKembalianTunai(pembayaran, totalNetto) {
  const dibayar = pembayaran.reduce((s, p) => s + p.jumlah, 0);
  const kelebihan = dibayar - totalNetto;
  if (kelebihan <= 0) return 0;
  const totalTunai = pembayaran
    .filter(p => p.metode === 'tunai')
    .reduce((s, p) => s + p.jumlah, 0);
  return Math.min(kelebihan, totalTunai);
}
