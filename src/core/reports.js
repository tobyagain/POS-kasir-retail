// core/reports.js — agregasi laporan. FUNGSI MURNI. Baca hppSnapshot/hargaSnapshot
// dari transaksi (INV-1/2), TIDAK dari master produk. Exclude void.

/** Omzet per metode bayar dari daftar sale (exclude void). */
export function omzetPerMetode(sales) {
  const out = {};
  for (const s of sales) {
    if (s.void) continue;
    for (const p of s.pembayaran || []) out[p.metode] = (out[p.metode] || 0) + p.jumlah;
  }
  return out;
}

/** 
 * Laba kotor = SUM((hargaJualSnapshot - hppSnapshot)*qty - diskonItem) - diskonNota.
 * diskonNota didistribusi proporsional ke setiap item berdasarkan subtotal.
 * Exclude void.
 */
export function labaKotor(sales) {
  let laba = 0;
  for (const s of sales) {
    if (s.void) continue;
    
    const items = Array.isArray(s.items) ? s.items : [];
    const totalBruto = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
    const diskonNota = s.diskonNota || 0;
    for (const it of items) {
      // Laba item sebelum diskon nota
      const labaItem = (it.hargaJualSnapshot - it.hppSnapshot) * it.qty - (it.diskonItem || 0);
      
      // Alokasi diskon nota proporsional berdasarkan subtotal item
      const alokDiskonNota = totalBruto > 0 
        ? Math.round(diskonNota * (it.subtotal / totalBruto))
        : 0;
      
      laba += labaItem - alokDiskonNota;
    }
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

/** Produk terlaris (qty terjual tertinggi). */
export function produkTerlaris(sales, limit = 10) {
  const terjual = {};
  for (const s of sales) {
    if (s.void) continue;
    for (const it of (Array.isArray(s.items) ? s.items : [])) {
      if (!terjual[it.produkId]) {
        terjual[it.produkId] = { produkId: it.produkId, nama: it.nama, totalQty: 0, totalOmzet: 0 };
      }
      terjual[it.produkId].totalQty += it.qty;
      terjual[it.produkId].totalOmzet += it.subtotal || 0;
    }
  }
    return Object.values(terjual)
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, limit);
}
