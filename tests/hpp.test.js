import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitungHppBaru } from '../src/core/hpp.js';

test('rata-rata bergerak dasar', () => {
  // 10 unit @ 2000 + 10 unit @ 3000 -> 20 unit @ 2500
  const r = hitungHppBaru({ stokLama: 10, hppLama: 2000, qtyMasuk: 10, hargaBeli: 3000 });
  assert.equal(r.stokBaru, 20);
  assert.equal(r.hppBaru, 2500);
});

test('pembulatan HPP ke integer rupiah', () => {
  // 3 @ 1000 + 1 @ 1500 = 4500/4 = 1125
  const r = hitungHppBaru({ stokLama: 3, hppLama: 1000, qtyMasuk: 1, hargaBeli: 1500 });
  assert.equal(r.stokBaru, 4);
  assert.equal(r.hppBaru, 1125);
});

test('stok lama 0 -> HPP = harga beli (INV-3 kasus tepi)', () => {
  const r = hitungHppBaru({ stokLama: 0, hppLama: 9999, qtyMasuk: 5, hargaBeli: 2750 });
  assert.equal(r.stokBaru, 5);
  assert.equal(r.hppBaru, 2750);
});

test('stok lama minus -> HPP = harga beli, stok naik dari basis minus', () => {
  const r = hitungHppBaru({ stokLama: -3, hppLama: 2000, qtyMasuk: 10, hargaBeli: 2600 });
  assert.equal(r.stokBaru, 7);
  assert.equal(r.hppBaru, 2600);
});

test('hpp lama 0 (produk baru pertama masuk via stok>0 mustahil, tapi aman)', () => {
  const r = hitungHppBaru({ stokLama: 5, hppLama: 0, qtyMasuk: 5, hargaBeli: 2000 });
  // (5*0 + 5*2000)/10 = 1000
  assert.equal(r.hppBaru, 1000);
});

test('qtyMasuk tidak valid -> error', () => {
  assert.throws(() => hitungHppBaru({ stokLama: 1, hppLama: 1, qtyMasuk: 0, hargaBeli: 1 }));
  assert.throws(() => hitungHppBaru({ stokLama: 1, hppLama: 1, qtyMasuk: -2, hargaBeli: 1 }));
});

test('hargaBeli tidak valid -> error', () => {
  assert.throws(() => hitungHppBaru({ stokLama: 1, hppLama: 1, qtyMasuk: 1, hargaBeli: -5 }));
});
