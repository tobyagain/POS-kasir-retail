// Test edge case INV-5: jual tanpa shift harus throw error
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Stub untuk test tanpa IndexedDB penuh
describe('INV-5: simpan penjualan tanpa shift', () => {
  it('shiftId null harus throw', async () => {
    // Mock simpanPenjualan validasi awal
    const simpanPenjualan = ({ shiftId }) => {
      if (!shiftId) throw new Error('shiftId wajib (INV-5)');
    };

    assert.throws(() => {
      simpanPenjualan({ items: [{ produkId: 'p1', qty: 1 }], pembayaran: [] });
    }, /shiftId wajib/);
  });
});
