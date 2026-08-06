import { getByKey, transaction, generateId, formatNomorDokumen, getPeriode } from '../data/db.js';

function money(value, name) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${name} harus bilangan bulat rupiah >= 0`);
  return n;
}

function itemsValid(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Tidak ada item');
  return items.map(item => {
    const qty = Number(item.qty);
    if (!Number.isSafeInteger(qty) || qty <= 0) throw new Error('qty harus bilangan bulat > 0');
    const hargaJualSnapshot = money(item.hargaJualSnapshot, 'harga jual');
    const hppSnapshot = money(item.hppSnapshot, 'HPP');
    const diskonItem = money(item.diskonItem || 0, 'diskon item');
    const subtotal = qty * hargaJualSnapshot - diskonItem;
    if (subtotal < 0) throw new Error('diskon item melebihi subtotal');
    return { ...item, qty, hargaJualSnapshot, hppSnapshot, diskonItem, subtotal };
  });
}

export async function simpanPenjualan({ shiftId, items, diskonNota = 0, pembayaran, kasir }) {
  if (!shiftId) throw new Error('shiftId wajib (INV-5)');
  items = itemsValid(items);
  diskonNota = money(diskonNota, 'diskon nota');
  pembayaran = Array.isArray(pembayaran) ? pembayaran.map(p => ({ ...p, jumlah: money(p.jumlah, 'jumlah pembayaran') })) : [];
  const totalBruto = items.reduce((sum, item) => sum + item.subtotal, 0);
  if (diskonNota > totalBruto) throw new Error('diskon nota melebihi subtotal');
  const totalNetto = totalBruto - diskonNota;
  const dibayar = pembayaran.reduce((sum, p) => sum + p.jumlah, 0);
  if (dibayar < totalNetto) throw new Error('Pembayaran kurang');

  const now = Date.now();
  const periode = getPeriode(now);
  let savedSale;

  await transaction(['sales', 'products', 'stockMoves', 'meta', 'shifts'], 'readwrite', (stores, tx) => {
    const shiftReq = stores.shifts.get(shiftId);
    shiftReq.onsuccess = () => {
      if (!shiftReq.result || shiftReq.result.status !== 'open') { tx.abort(); return; }
      const counterReq = stores.meta.get('counterStruk');
      counterReq.onsuccess = () => {
        const counter = counterReq.result?.value || { periode: '', next: 1 };
        const seq = counter.periode === periode ? counter.next : 1;
        const noStruk = formatNomorDokumen('TRX', periode, seq);
        stores.meta.put({ key: 'counterStruk', value: { periode, next: seq + 1 } });
        savedSale = { id: generateId('sal'), noStruk, shiftId, tanggal: now, items, diskonNota,
          totalBruto, totalNetto, pembayaran, dibayar, kembalian: dibayar - totalNetto,
          void: false, voidAlasan: null, kasir };
        stores.sales.put(savedSale);
        processStock(stores, tx, items, savedSale, now, false);
      };
      counterReq.onerror = () => tx.abort();
    };
    shiftReq.onerror = () => tx.abort();
  });
  return savedSale;
}

function processStock(stores, tx, items, sale, now, restore) {
  let index = 0;
  const next = () => {
    if (index >= items.length) return;
    const item = items[index++];
    const req = stores.products.get(item.produkId);
    req.onsuccess = () => {
      const produk = req.result;
      if (!produk) { tx.abort(); return; }
      const qty = restore ? item.qty : -item.qty;
      produk.stok += qty;
      produk.diubah = now;
      stores.products.put(produk);
      stores.stockMoves.put({ id: generateId('stk'), produkId: produk.id, tanggal: now,
        tipe: restore ? 'void' : 'jual', qty, saldoSesudah: produk.stok, refId: sale.id,
        refNo: sale.noStruk, catatan: `${restore ? 'Void' : 'Jual'} ${sale.noStruk}` });
      next();
    };
    req.onerror = () => tx.abort();
  };
  next();
}

export async function voidPenjualan(saleId, alasan) {
  const sale = await getPenjualan(saleId);
  if (!sale) throw new Error('Penjualan tidak ditemukan');
  if (sale.void) throw new Error('Sudah void');
  const now = Date.now();
  await transaction(['sales', 'products', 'stockMoves'], 'readwrite', (stores, tx) => {
    const req = stores.sales.get(saleId);
    req.onsuccess = () => {
      const current = req.result;
      if (!current || current.void) { tx.abort(); return; }
      current.void = true;
      current.voidAlasan = alasan || 'Dibatalkan';
      stores.sales.put(current);
      processStock(stores, tx, current.items || [], current, now, true);
    };
    req.onerror = () => tx.abort();
  });
  return getPenjualan(saleId);
}

export async function listPenjualan({ shiftId, dariTanggal, sampaiTanggal, includeVoid = false } = {}) {
  const db = await import('../data/db.js').then(m => m.openDB());
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readonly');
    const store = tx.objectStore('sales');
    const req = shiftId ? store.index('shiftId').getAll(shiftId)
      : dariTanggal && sampaiTanggal ? store.index('tanggal').getAll(IDBKeyRange.bound(dariTanggal, sampaiTanggal)) : store.getAll();
    req.onsuccess = () => {
      let sales = req.result;
      if (!includeVoid) sales = sales.filter(s => !s.void);
      resolve(sales.sort((a, b) => b.tanggal - a.tanggal));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPenjualan(id) { return getByKey('sales', id); }
