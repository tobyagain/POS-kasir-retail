import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labaKotor, labaBersih, stokMenipis } from '../src/core/reports.js';

const sales = [
  { void:false, diskonNota:0, items:[
    { qty:2, hargaJualSnapshot:3500, hppSnapshot:2800, diskonItem:0, subtotal:7000 }, // laba 1400
  ], pembayaran:[{metode:'tunai',jumlah:7000}] },
  { void:true, diskonNota:0, items:[
    { qty:5, hargaJualSnapshot:9999, hppSnapshot:0, diskonItem:0, subtotal:49995 },     // void, diabaikan
  ], pembayaran:[] },
];

test('laba kotor pakai snapshot & exclude void', () => {
  assert.equal(labaKotor(sales), 1400);
});

test('laba kotor: diskon item & nota mengurangi (proporsional)', () => {
  const s = [{ void:false, diskonNota:500, items:[
    { qty:1, hargaJualSnapshot:5000, hppSnapshot:3000, diskonItem:200, subtotal:5000 }, // laba item 1800, alok diskon nota 500
  ]}];
  assert.equal(labaKotor(s), 1300); // 1800 - 500
});

test('laba bersih: hanya operasional dikurangi (prive/beli_stok tidak)', () => {
  const cf = [
    { jenis:'keluar', kategori:'operasional', nominal:400 },
    { jenis:'keluar', kategori:'prive', nominal:1000 },      // diabaikan
    { jenis:'keluar', kategori:'beli_stok', nominal:5000 },  // diabaikan
  ];
  assert.equal(labaBersih(sales, cf), 1000); // 1400 - 400
});

test('stok menipis', () => {
  const prods = [
    { nama:'A', stok:5, stokMin:10, aktif:true },
    { nama:'B', stok:20, stokMin:10, aktif:true },
    { nama:'C', stok:0, stokMin:0, aktif:true },
    { nama:'D', stok:1, stokMin:10, aktif:false }, // nonaktif, diabaikan
  ];
  assert.deepEqual(stokMenipis(prods).map(p=>p.nama), ['A','C']);
});
