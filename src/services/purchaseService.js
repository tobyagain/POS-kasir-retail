// purchaseService — barang masuk, update stok+HPP, stockMoves
import { getByKey, transaction, generateId, formatNomorDokumen, getPeriode } from '../data/db.js';
import { hitungHppBaru } from '../core/hpp.js';
import { hitungTotalPembelian } from '../core/purchase.js';

function money(value, name) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${name} harus bilangan bulat rupiah >= 0`);
  return n;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Minimal 1 item');
  return items.map(item => {
    const qty = Number(item.qty);
    if (!Number.isSafeInteger(qty) || qty <= 0) throw new Error('qty harus bilangan bulat > 0');
    const hargaBeli = money(item.hargaBeli, 'harga beli');
    return { ...item, qty, hargaBeli, subtotal: qty * hargaBeli };
  });
}

export async function simpanBarangMasuk({ supplier, items, catatan }) {
  if (!supplier || !String(supplier).trim()) throw new Error('Supplier wajib');
  items = normalizeItems(items);
  const now = Date.now();
  const periode = getPeriode(now);
  let savedPurchase;

  await transaction(['purchases', 'products', 'stockMoves', 'meta'], 'readwrite', (stores, tx) => {
    const counterReq = stores.meta.get('counterNota');
    counterReq.onerror = () => tx.abort();
    counterReq.onsuccess = () => {
      const counter = counterReq.result?.value || { periode: '', next: 1 };
      const seq = counter.periode !== periode ? 1 : counter.next;
      const noNota = formatNomorDokumen('BM', periode, seq);
      stores.meta.put({ key: 'counterNota', value: { periode, next: seq + 1 } });

      savedPurchase = {
        id: generateId('pur'), noNota, tanggal: now, supplier: String(supplier).trim(),
        items, total: hitungTotalPembelian(items), catatan: catatan || ''
      };
      stores.purchases.put(savedPurchase);

      let index = 0;
      const updateNext = () => {
        if (index >= items.length) return;
        const item = items[index++];
        const req = stores.products.get(item.produkId);
        req.onerror = () => tx.abort();
        req.onsuccess = () => {
          const produk = req.result;
          if (!produk) { tx.abort(); return; }
          const { hppBaru, stokBaru } = hitungHppBaru({
            stokLama: produk.stok, hppLama: produk.hpp,
            qtyMasuk: item.qty, hargaBeli: item.hargaBeli
          });
          produk.stok = stokBaru;
          produk.hpp = hppBaru;
          produk.diubah = now;
          stores.products.put(produk);
          stores.stockMoves.put({
            id: generateId('stk'), produkId: produk.id, tanggal: now, tipe: 'masuk',
            qty: item.qty, saldoSesudah: stokBaru, refId: savedPurchase.id, refNo: noNota,
            catatan: `Barang masuk dari ${savedPurchase.supplier}`
          });
          updateNext();
        };
      };
      updateNext();
    };
  });
  return savedPurchase;
}

export async function listBarangMasuk({ dariTanggal, sampaiTanggal } = {}) {
  const db = await import('../data/db.js').then(m => m.openDB());
  return new Promise((resolve, reject) => {
    const tx = db.transaction('purchases', 'readonly');
    const store = tx.objectStore('purchases');
    const idx = store.index('tanggal');
    const req = dariTanggal && sampaiTanggal
      ? idx.getAll(IDBKeyRange.bound(dariTanggal, sampaiTanggal)) : store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.tanggal - a.tanggal));
    req.onerror = () => reject(req.error);
  });
}

export async function getBarangMasuk(id) {
  return getByKey('purchases', id);
}
