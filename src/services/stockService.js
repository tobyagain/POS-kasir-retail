// stockService — opname, mutasi, query
import { getByKey, getByIndex, transaction, generateId } from '../data/db.js';

// Opname stok — koreksi stok fisik vs sistem (INV-6)
export async function opnameStok(produkId, stokFisik, catatan) {
  const now = Date.now();

  return transaction(['products', 'stockMoves'], 'readwrite', (stores) => {
    const prodReq = stores.products.get(produkId);
    prodReq.onsuccess = () => {
      const produk = prodReq.result;
      if (!produk) throw new Error('Produk tidak ditemukan');

      const stokSistem = produk.stok;
      const selisih = stokFisik - stokSistem;

      if (selisih === 0) return; // tidak ada koreksi

      produk.stok = stokFisik;
      produk.diubah = now;
      stores.products.put(produk);

      // Catat mutasi opname (INV-6)
      const move = {
        id: generateId('stk'),
        produkId: produk.id,
        tanggal: now,
        tipe: 'opname',
        qty: selisih,
        saldoSesudah: stokFisik,
        refId: null,
        refNo: '',
        catatan: catatan || `Opname: sistem ${stokSistem} → fisik ${stokFisik}`
      };
      stores.stockMoves.put(move);
    };
  });
}

// Riwayat mutasi stok produk
export async function riwayatMutasi(produkId, { limit = 50 } = {}) {
  const moves = await getByIndex('stockMoves', 'produkId', produkId);
  return moves
    .sort((a, b) => b.tanggal - a.tanggal)
    .slice(0, limit);
}

// List produk stok menipis (stok <= stokMin)
export async function produkMenurun() {
  const { getAll } = await import('../data/db.js');
  const produk = await getAll('products');
  return produk
    .filter(p => p.aktif && p.stok <= p.stokMin)
    .sort((a, b) => a.stok - b.stok);
}
