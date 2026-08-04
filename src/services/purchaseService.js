// purchaseService — barang masuk, update stok+HPP, stockMoves
import { getByKey, put, transaction, generateId, formatNomorDokumen, getPeriode } from '../data/db.js';
import { hitungHppBaru } from '../core/hpp.js';

// Simpan barang masuk — update stok+HPP+stockMoves atomik
export async function simpanBarangMasuk({ supplier, items, catatan }) {
  const now = Date.now();
  const periode = getPeriode(now);

  return transaction(['purchases', 'products', 'stockMoves', 'meta'], 'readwrite', (stores) => {
    // Counter nota
    const counterReq = stores.meta.get('counterNota');
    counterReq.onsuccess = () => {
      const counter = counterReq.result.value;
      const resetBulanan = counter.periode !== periode;
      const seq = resetBulanan ? 1 : counter.next;
      const noNota = formatNomorDokumen('BM', periode, seq);

      // Update counter
      stores.meta.put({
        key: 'counterNota',
        value: { periode, next: seq + 1 }
      });

      // Hitung total
      const itemsWithSubtotal = items.map(it => ({
        ...it,
        subtotal: it.qty * it.hargaBeli
      }));
      const total = itemsWithSubtotal.reduce((sum, it) => sum + it.subtotal, 0);

      // Simpan purchase
      const purchase = {
        id: generateId('pur'),
        noNota,
        tanggal: now,
        supplier,
        items: itemsWithSubtotal,
        total,
        catatan: catatan || ''
      };
      stores.purchases.put(purchase);

      // Update setiap produk: stok + HPP (INV-3)
      items.forEach(item => {
        const prodReq = stores.products.get(item.produkId);
        prodReq.onsuccess = () => {
          const produk = prodReq.result;
          if (!produk) throw new Error(`Produk ${item.produkId} tidak ditemukan`);

          const stokLama = produk.stok;
          const hppLama = produk.hpp;
          const qtyMasuk = item.qty;
          const hargaBeli = item.hargaBeli;

          // Hitung HPP baru (INV-3: kasus stok<=0 ditangani di core/hpp.js)
          const { hppBaru, stokBaru } = hitungHppBaru({ stokLama, hppLama, qtyMasuk, hargaBeli });

          produk.stok = stokBaru;
          produk.hpp = hppBaru;
          produk.diubah = now;
          stores.products.put(produk);

          // Catat mutasi stok (INV-6)
          const move = {
            id: generateId('stk'),
            produkId: produk.id,
            tanggal: now,
            tipe: 'masuk',
            qty: qtyMasuk,
            saldoSesudah: stokBaru,
            refId: purchase.id,
            refNo: noNota,
            catatan: `Barang masuk dari ${supplier}`
          };
          stores.stockMoves.put(move);
        };
      });
    };
  });
}

// List barang masuk (rentang tanggal opsional)
export async function listBarangMasuk({ dariTanggal, sampaiTanggal } = {}) {
  const db = await import('../data/db.js').then(m => m.openDB());
  return new Promise((resolve, reject) => {
    const tx = db.transaction('purchases', 'readonly');
    const store = tx.objectStore('purchases');
    const idx = store.index('tanggal');
    
    const range = dariTanggal && sampaiTanggal
      ? IDBKeyRange.bound(dariTanggal, sampaiTanggal)
      : null;
    
    const req = range ? idx.getAll(range) : store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.tanggal - a.tanggal));
    req.onerror = () => reject(req.error);
  });
}

// Get satu barang masuk
export async function getBarangMasuk(id) {
  return getByKey('purchases', id);
}
