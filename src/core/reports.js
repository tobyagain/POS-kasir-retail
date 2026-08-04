// core/reports.js — agregasi laporan. FUNGSI MURNI. Baca hppSnapshot/hargaSnapshot
// dari transaksi (INV-1/2), TIDAK dari master produk. Exclude void.
// STUB TAHAP 5: tanda tangan fungsi sudah final; isi lengkap dibangun di Tahap 5.

/** Omzet per metode bayar dari daftar sale (exclude void). */
export function omzetPerMetode(sales) {
  const out = {};
  for (const s of sales) {
    if (s.void) continue;
    for (const p of s.pembayaran || []) out[p.metode] = (out[p.metode] || 0) + p.jumlah;
  }
  return out;
}

/** Laba kotor = SUM((hargaJualSnapshot - hppSnapshot)*qty) - diskon. Exclude void. */
export function labaKotor(sales) {
  let laba = 0;
  for (const s of sales) {
    if (s.void) continue;
    for (const it of s.items || []) {
      laba += (it.hargaJualSnapshot - it.hppSnapshot) * it.qty - (it.diskonItem || 0);
    }
    laba -= (s.diskonNota || 0);
  }
  return laba;
}

/**
 * Laba bersih = laba kotor - biaya operasional.
 * Hanya cashflow keluar kategori 'operasional' yang mengurangi laba.
 * prive & beli_stok DIKECUALIKAN (hindari dobel hitung — stok sudah lewat HPP).
 */
export function labaBersih(sales, cashflow) {
  let biaya = 0;
  for (const c of cashflow) {
    if (c.jenis === 'keluar' && c.kategori === 'operasional') biaya += c.nominal;
  }
  return labaKotor(sales) - biaya;
}

/** Produk dgn stok <= stokMin. */
export function stokMenipis(products) {
  return products.filter(p => p.aktif !== false && p.stok <= p.stokMin);
}
