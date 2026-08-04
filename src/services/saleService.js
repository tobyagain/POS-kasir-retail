// saleService — simpan penjualan, snapshot HPP+harga, update stok, counter struk atomik
import { getByKey, transaction, generateId, formatNomorDokumen, getPeriode } from '../data/db.js';

// Simpan penjualan — INV-1, INV-2, INV-5, INV-6, INV-8
export async function simpanPenjualan({ shiftId, items, diskonNota, pembayaran, kasir }) {
  if (!shiftId) throw new Error('shiftId wajib (INV-5)');
  if (!items || items.length === 0) throw new Error('Tidak ada item');

  const now = Date.now();
  const periode = getPeriode(now);

  return transaction(['sales', 'products', 'stockMoves', 'meta', 'shifts'], 'readwrite', (stores) => {
    // Validasi shift masih open
    const shiftReq = stores.shifts.get(shiftId);
    shiftReq.onsuccess = () => {
      const shift = shiftReq.result;
      if (!shift || shift.status !== 'open') {
        throw new Error('Shift tidak terbuka (INV-5)');
      }

      // Counter struk (INV-8)
      const counterReq = stores.meta.get('counterStruk');
      counterReq.onsuccess = () => {
        const counter = counterReq.result.value;
        const resetBulanan = counter.periode !== periode;
        const seq = resetBulanan ? 1 : counter.next;
        const noStruk = formatNomorDokumen('TRX', periode, seq);

        // Update counter
        stores.meta.put({
          key: 'counterStruk',
          value: { periode, next: seq + 1 }
        });

        // Hitung total
        const totalBruto = items.reduce((sum, it) => sum + it.subtotal, 0);
        const totalNetto = totalBruto - diskonNota;
        const dibayar = pembayaran.reduce((sum, p) => sum + p.jumlah, 0);
        const kembalian = Math.max(0, dibayar - totalNetto);

        // Simpan sale
        const sale = {
          id: generateId('sal'),
          noStruk,
          shiftId,
          tanggal: now,
          items,
          diskonNota: diskonNota || 0,
          totalBruto,
          totalNetto,
          pembayaran,
          dibayar,
          kembalian,
          void: false,
          voidAlasan: null,
          kasir
        };
        stores.sales.put(sale);

        // Update stok & catat mutasi (INV-6)
        items.forEach(item => {
          const prodReq = stores.products.get(item.produkId);
          prodReq.onsuccess = () => {
            const produk = prodReq.result;
            if (!produk) throw new Error(`Produk ${item.produkId} tidak ditemukan`);

            produk.stok -= item.qty;
            produk.diubah = now;
            stores.products.put(produk);

            // Mutasi stok keluar
            const move = {
              id: generateId('stk'),
              produkId: produk.id,
              tanggal: now,
              tipe: 'jual',
              qty: -item.qty,
              saldoSesudah: produk.stok,
              refId: sale.id,
              refNo: noStruk,
              catatan: `Jual via ${noStruk}`
            };
            stores.stockMoves.put(move);
          };
        });
      };
    };
  });
}

// Void penjualan — INV-7 (kembalikan stok, tandai void, jangan hapus)
export async function voidPenjualan(saleId, alasan) {
  const now = Date.now();

  return transaction(['sales', 'products', 'stockMoves'], 'readwrite', (stores) => {
    const saleReq = stores.sales.get(saleId);
    saleReq.onsuccess = () => {
      const sale = saleReq.result;
      if (!sale) throw new Error('Penjualan tidak ditemukan');
      if (sale.void) throw new Error('Sudah void');

      // Tandai void (INV-7)
      sale.void = true;
      sale.voidAlasan = alasan || 'Dibatalkan';
      stores.sales.put(sale);

      // Kembalikan stok
      sale.items.forEach(item => {
        const prodReq = stores.products.get(item.produkId);
        prodReq.onsuccess = () => {
          const produk = prodReq.result;
          if (!produk) return;

          produk.stok += item.qty;
          produk.diubah = now;
          stores.products.put(produk);

          // Mutasi retur
          const move = {
            id: generateId('stk'),
            produkId: produk.id,
            tanggal: now,
            tipe: 'void',
            qty: item.qty,
            saldoSesudah: produk.stok,
            refId: sale.id,
            refNo: sale.noStruk,
            catatan: `Void ${sale.noStruk}: ${alasan || 'Dibatalkan'}`
          };
          stores.stockMoves.put(move);
        };
      });
    };
  });
}

// List penjualan (filter shift/rentang tanggal)
export async function listPenjualan({ shiftId, dariTanggal, sampaiTanggal, includeVoid = false } = {}) {
  const db = await import('../data/db.js').then(m => m.openDB());
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readonly');
    const store = tx.objectStore('sales');

    let req;
    if (shiftId) {
      req = store.index('shiftId').getAll(shiftId);
    } else if (dariTanggal && sampaiTanggal) {
      const range = IDBKeyRange.bound(dariTanggal, sampaiTanggal);
      req = store.index('tanggal').getAll(range);
    } else {
      req = store.getAll();
    }

    req.onsuccess = () => {
      let sales = req.result;
      if (!includeVoid) sales = sales.filter(s => !s.void);
      resolve(sales.sort((a, b) => b.tanggal - a.tanggal));
    };
    req.onerror = () => reject(req.error);
  });
}

// Get satu penjualan
export async function getPenjualan(id) {
  return getByKey('sales', id);
}
