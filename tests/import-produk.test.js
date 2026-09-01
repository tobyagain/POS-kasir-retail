// Test: import produk CSV parser
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectDelimiter, parseCSV, mapHeader, parseAngka, rowToProduk, parseImportProduk, TEMPLATE_CSV
} from '../src/core/importProduk.js';

test('detectDelimiter: titik koma untuk Excel Indonesia', () => {
  assert.equal(detectDelimiter('a;b;c'), ';');
  assert.equal(detectDelimiter('a,b,c'), ',');
  assert.equal(detectDelimiter('nama;hargaJual'), ';');
});

test('parseCSV: baris sederhana delimiter ;', () => {
  const rows = parseCSV('a;b;c\n1;2;3');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('parseCSV: quoted field dengan delimiter di dalam', () => {
  const rows = parseCSV('nama;harga\n"Indomie; Goreng";3500');
  assert.deepEqual(rows, [['nama', 'harga'], ['Indomie; Goreng', '3500']]);
});

test('parseCSV: escaped quote di dalam quoted field', () => {
  const rows = parseCSV('nama\n"Kopi ""Special"" Sachet"');
  assert.deepEqual(rows, [['nama'], ['Kopi "Special" Sachet']]);
});

test('parseCSV: CRLF line ending (Windows Excel)', () => {
  const rows = parseCSV('a;b\r\n1;2\r\n3;4');
  assert.deepEqual(rows, [['a', 'b'], ['1', '2'], ['3', '4']]);
});

test('mapHeader: kenali kolom standar & alias', () => {
  const map = mapHeader(['barcode', 'nama', 'kategori', 'satuan', 'hargaJual', 'stokMin']);
  assert.equal(map.nama, 1);
  assert.equal(map.hargajual, 4);
  assert.equal(map.stokmin, 5);
});

test('mapHeader: kolom wajib hilang -> null', () => {
  assert.equal(mapHeader(['barcode', 'kategori']), null);
  assert.equal(mapHeader(['nama']), null); // tanpa hargaJual
});

test('parseAngka: terima format ribuan Indonesia', () => {
  assert.equal(parseAngka('15000'), 15000);
  assert.equal(parseAngka('15.000'), 15000);
  assert.equal(parseAngka('Rp 15.000'), 15000);
  assert.equal(parseAngka(''), 0);
  assert.equal(parseAngka('abc'), 0);
});

test('rowToProduk: baris valid', () => {
  const colMap = { barcode: 0, nama: 1, kategori: 2, satuan: 3, hargajual: 4, stokmin: 5 };
  const { produk, error } = rowToProduk(['899', 'Indomie', 'Makanan', 'pcs', '3.500', '20'], colMap, 2);
  assert.equal(error, undefined);
  assert.equal(produk.nama, 'Indomie');
  assert.equal(produk.hargaJual, 3500);
  assert.equal(produk.stokMin, 20);
});

test('rowToProduk: nama kosong -> error', () => {
  const colMap = { nama: 0, hargajual: 1 };
  const { error } = rowToProduk(['', '3500'], colMap, 2);
  assert.match(error, /nama kosong/);
});

test('rowToProduk: harga 0 -> error', () => {
  const colMap = { nama: 0, hargajual: 1 };
  const { error } = rowToProduk(['Indomie', '0'], colMap, 2);
  assert.match(error, /harga jual tidak valid/);
});

test('rowToProduk: satuan tidak dikenal -> fallback pcs', () => {
  const colMap = { nama: 0, hargajual: 1, satuan: 2 };
  const { produk } = rowToProduk(['Indomie', '3500', 'pack'], colMap, 2);
  assert.equal(produk.satuan, 'pcs');
});

test('parseImportProduk: template CSV menghasilkan 3 produk', () => {
  const { produkList, errors, skipped } = parseImportProduk(TEMPLATE_CSV);
  assert.equal(produkList.length, 3);
  assert.equal(errors.length, 0);
  assert.equal(skipped, 0);
  assert.equal(produkList[0].nama, 'Indomie Goreng');
  assert.equal(produkList[0].hargaJual, 3500);
  assert.equal(produkList[2].barcode, ''); // barcode boleh kosong
});

test('parseImportProduk: file kosong', () => {
  const { errors } = parseImportProduk('');
  assert.equal(errors.length, 1);
});

test('parseImportProduk: header salah', () => {
  const { errors } = parseImportProduk('foo;bar\n1;2');
  assert.match(errors[0], /Header tidak dikenali/);
});

test('parseImportProduk: baris invalid di-skip, valid tetap masuk', () => {
  const csv = 'nama;hargaJual\nIndomie;3500\n;9999\nAqua;4000';
  const { produkList, errors, skipped } = parseImportProduk(csv);
  assert.equal(produkList.length, 2);
  assert.equal(skipped, 1);
  assert.equal(errors.length, 1);
});
