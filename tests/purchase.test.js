import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitungTotalPembelian } from '../src/core/purchase.js';

test('total barang masuk menjumlah qty x harga beli semua item', () => {
  assert.equal(hitungTotalPembelian([
    { qty: 2, hargaBeli: 1500 },
    { qty: 3, hargaBeli: 2000 }
  ]), 9000);
});

test('total barang masuk menolak qty/harga tidak valid', () => {
  assert.throws(() => hitungTotalPembelian([{ qty: 0, hargaBeli: 100 }]), /qty/);
  assert.throws(() => hitungTotalPembelian([{ qty: 1, hargaBeli: -1 }]), /harga beli/);
});
