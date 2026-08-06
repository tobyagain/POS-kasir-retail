// core/purchase.js — perhitungan nilai barang masuk. FUNGSI MURNI.
export function hitungTotalPembelian(items) {
  if (!Array.isArray(items)) throw new Error('items harus array');
  return items.reduce((total, item) => {
    const qty = Number(item.qty);
    const hargaBeli = Number(item.hargaBeli);
    if (!Number.isSafeInteger(qty) || qty <= 0) throw new Error('qty harus bilangan bulat > 0');
    if (!Number.isSafeInteger(hargaBeli) || hargaBeli < 0) throw new Error('harga beli tidak valid');
    return total + qty * hargaBeli;
  }, 0);
}
