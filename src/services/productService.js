// productService — CRUD produk
import { getByKey, getAll, getByIndex, put, deleteByKey, generateId } from '../data/db.js';

// Buat produk baru
export async function buatProduk({ barcode, nama, kategori, satuan, hargaJual, stokMin }) {
  const now = Date.now();
  const toNumber = value => Number(String(value ?? '').replace(/\D/g, '')) || 0;
  const produk = {
    id: generateId('prd'),
    barcode: barcode || '',
    nama,
    kategori: kategori || '',
    satuan: satuan || 'pcs',
    hargaJual: toNumber(hargaJual),
    hpp: 0,               // belum ada barang masuk
    stok: 0,              // stok diubah via mutasi, bukan input
    stokMin: toNumber(stokMin),
    aktif: true,
    dibuat: now,
    diubah: now
  };
  await put('products', produk);
  return produk;
}

// Update produk (hanya field yang boleh diubah manual: nama, harga, kategori, stokMin, aktif)
// stok & HPP tidak boleh diubah langsung — harus lewat barang masuk / opname
export async function updateProduk(id, { barcode, nama, kategori, satuan, hargaJual, stokMin, aktif }) {
  const produk = await getByKey('products', id);
  if (!produk) throw new Error('Produk tidak ditemukan');

  const toNumber = value => Number(String(value ?? '').replace(/\D/g, '')) || 0;
  if (barcode !== undefined) produk.barcode = barcode || null;
  if (nama !== undefined) produk.nama = nama;
  if (kategori !== undefined) produk.kategori = kategori;
  if (satuan !== undefined) produk.satuan = satuan;
  if (hargaJual !== undefined) produk.hargaJual = toNumber(hargaJual);
  if (stokMin !== undefined) produk.stokMin = toNumber(stokMin);
  if (aktif !== undefined) produk.aktif = aktif;
  produk.diubah = Date.now();

  await put('products', produk);
  return produk;
}

// Cari produk by barcode — untuk kasir scan
export async function cariByBarcode(barcode) {
  const hasil = await getByIndex('products', 'barcode', barcode);
  return hasil.find(p => p.aktif); // hanya produk aktif
}

// Cari produk by nama (substring case-insensitive) — untuk kasir search
export async function cariByNama(query) {
  const semua = await getAll('products');
  const lower = query.toLowerCase();
  return semua.filter(p => p.aktif && p.nama.toLowerCase().includes(lower));
}

// List semua produk (filter opsional)
export async function listProduk({ aktif, kategori } = {}) {
  let produk = await getAll('products');
  if (aktif !== undefined) produk = produk.filter(p => p.aktif === aktif);
  if (kategori) produk = produk.filter(p => p.kategori === kategori);
  return produk.sort((a, b) => a.nama.localeCompare(b.nama));
}

// Get satu produk
export async function getProduk(id) {
  return getByKey('products', id);
}

// Nonaktifkan produk (soft delete — tidak hapus fisik, INV-6)
export async function nonaktifkanProduk(id) {
  return updateProduk(id, { aktif: false });
}
