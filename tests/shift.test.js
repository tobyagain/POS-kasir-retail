import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  totalTunaiPenjualan, totalKasManual, hitungKasSistem,
  hitungSelisih, ringkasanPerMetode,
} from '../src/core/shift.js';

const sales = [
  { void: false, pembayaran: [{ metode: 'tunai', jumlah: 10000 }] },
  { void: false, pembayaran: [{ metode: 'qris', jumlah: 25000 }] },
  { void: false, pembayaran: [ // bayar campur
      { metode: 'tunai', jumlah: 5000 },
      { metode: 'qris', jumlah: 5000 },
  ] },
  { void: true, pembayaran: [{ metode: 'tunai', jumlah: 99999 }] }, // diabaikan
];

test('tunai penjualan hanya bagian tunai & exclude void', () => {
  assert.equal(totalTunaiPenjualan(sales), 15000); // 10000 + 5000
});

test('QRIS tidak masuk tunai tapi masuk omzet', () => {
  const rk = ringkasanPerMetode(sales);
  assert.equal(rk.tunai, 15000);
  assert.equal(rk.qris, 30000);
  assert.equal(rk.tunai + rk.qris, 45000); // omzet total (exclude void)
});

test('kas manual: hanya yang tunai memengaruhi laci', () => {
  const cf = [
    { jenis: 'keluar', nominal: 50000, tunai: true },
    { jenis: 'masuk', nominal: 20000, tunai: true },
    { jenis: 'keluar', nominal: 99999, tunai: false }, // transfer, tak sentuh laci
  ];
  assert.deepEqual(totalKasManual(cf), { masuk: 20000, keluar: 50000 });
});

test('kas sistem = modal + tunai + masuk - keluar (INV-4)', () => {
  const shift = { modalAwal: 200000 };
  const cf = [{ jenis: 'keluar', nominal: 50000, tunai: true }];
  // 200000 + 15000 (tunai jual) + 0 - 50000 = 165000
  assert.equal(hitungKasSistem(shift, sales, cf), 165000);
});

test('selisih lebih & kurang', () => {
  assert.equal(hitungSelisih(170000, 165000), 5000);   // lebih
  assert.equal(hitungSelisih(160000, 165000), -5000);  // kurang
  assert.equal(hitungSelisih(165000, 165000), 0);      // pas
});
