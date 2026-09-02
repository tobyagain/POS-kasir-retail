import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labaKotor, labaBersih, produkTerlaris, stokMenipis, omzetPerMetode, alokasiPembayaranNetto } from '../src/core/reports.js';

const sales = [
  { void:false, diskonNota:0, items:[
    { qty:2, hargaJualSnapshot:3500, hppSnapshot:2800, diskonItem:0, subtotal:7000 },
  ], pembayaran:[{metode:'tunai',jumlah:7000}] },
  { void:true, diskonNota:0, items:[
    { qty:5, hargaJualSnapshot:9999, hppSnapshot:0, diskonItem:0, subtotal:49995 },
  ], pembayaran:[] },
];

test('omzet per metode tidak menghitung kembalian sebagai omzet', () => {
  assert.deepEqual(omzetPerMetode([
    { void: false, totalNetto: 7000, pembayaran: [{ metode: 'tunai', jumlah: 10000 }] }
  ]), { tunai: 7000 });
});

test('alokasi pembayaran netto menjaga total dan proporsi metode', () => {
  assert.deepEqual(alokasiPembayaranNetto({ totalNetto: 10000, pembayaran: [
    { metode: 'tunai', jumlah: 7000 }, { metode: 'qris', jumlah: 5000 }
  ]}), [
    { metode: 'tunai', jumlah: 5833 }, { metode: 'qris', jumlah: 4167 }
  ]);
});
test('laba kotor pakai snapshot & exclude void', () => {
  assert.equal(labaKotor(sales), 1400);
});

test('laba kotor: diskon item & nota mengurangi (proporsional)', () => {
  const s = [{ void:false, diskonNota:500, items:[
    { qty:1, hargaJualSnapshot:5000, hppSnapshot:3000, diskonItem:200, subtotal:5000 },
  ]}];
  assert.equal(labaKotor(s), 1300);
});

test('laba kotor: alokasi diskon nota selalu habis tepat', () => {
  const s = [{ void: false, diskonNota: 1, items: [
    { qty: 1, hargaJualSnapshot: 300, hppSnapshot: 0, diskonItem: 0, subtotal: 300 },
    { qty: 1, hargaJualSnapshot: 300, hppSnapshot: 0, diskonItem: 0, subtotal: 300 },
    { qty: 1, hargaJualSnapshot: 300, hppSnapshot: 0, diskonItem: 0, subtotal: 300 },
  ] }];
  assert.equal(labaKotor(s), 899);
});
test('laba bersih: hanya operasional dikurangi (prive/beli_stok tidak)', () => {
  const cf = [
    { jenis:'keluar', kategori:'operasional', nominal:400 },
    { jenis:'keluar', kategori:'prive', nominal:1000 },
    { jenis:'keluar', kategori:'beli_stok', nominal:5000 },
  ];
  assert.equal(labaBersih(sales, cf), 1000);
});

test('produk terlaris mengembalikan field yang dipakai UI', () => {
  const result = produkTerlaris([{
    void: false,
    items: [{ produkId: 'p1', nama: 'Bambu', qty: 5, subtotal: 25000 }]
  }]);
  assert.deepEqual(result[0], {
    produkId: 'p1', nama: 'Bambu', totalQty: 5, totalOmzet: 25000
  });
});

test('stok menipis', () => {
  const prods = [
    { nama:'A', stok:5, stokMin:10, aktif:true },
    { nama:'B', stok:20, stokMin:10, aktif:true },
    { nama:'C', stok:0, stokMin:0, aktif:true },
    { nama:'D', stok:1, stokMin:10, aktif:false },
  ];
  assert.deepEqual(stokMenipis(prods).map(p=>p.nama), ['A','C']);
});
