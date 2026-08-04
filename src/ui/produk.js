// UI Produk — list, tambah, edit
import { listProduk, buatProduk, updateProduk, nonaktifkanProduk } from '../services/productService.js';

let produkList = [];

export async function initProdukUI() {
  await renderList();
}

async function renderList() {
  produkList = await listProduk({ aktif: true });
  
  const container = document.getElementById('produk-content');
  container.innerHTML = `
    <div class="flex gap-2 mb-2">
      <button class="primary" onclick="window.showFormTambahProduk()">+ Tambah Produk</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>Barcode</th>
          <th>Nama</th>
          <th>Kategori</th>
          <th>Satuan</th>
          <th>Harga Jual</th>
          <th>HPP</th>
          <th>Stok</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${produkList.map(p => `
          <tr>
            <td>${p.barcode || '-'}</td>
            <td>${p.nama}</td>
            <td>${p.kategori || '-'}</td>
            <td>${p.satuan}</td>
            <td class="text-right">${formatRupiah(p.hargaJual)}</td>
            <td class="text-right">${formatRupiah(p.hpp)}</td>
            <td class="text-right ${p.stok <= p.stokMin ? 'text-red' : ''}">${p.stok}</td>
            <td>
              <button class="secondary" onclick="window.editProduk('${p.id}')">Edit</button>
              <button class="secondary" onclick="window.hapusProduk('${p.id}')">Hapus</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.showFormTambahProduk = () => {
  const container = document.getElementById('produk-content');
  container.innerHTML = `
    <h2>Tambah Produk</h2>
    <form id="form-produk" class="mt-2" style="max-width: 500px;">
      <div class="mb-1">
        <label>Barcode (opsional)</label>
        <input type="text" name="barcode">
      </div>
      <div class="mb-1">
        <label>Nama <span class="text-red">*</span></label>
        <input type="text" name="nama" required>
      </div>
      <div class="mb-1">
        <label>Kategori</label>
        <input type="text" name="kategori">
      </div>
      <div class="mb-1">
        <label>Satuan</label>
        <input type="text" name="satuan" value="pcs">
      </div>
      <div class="mb-1">
        <label>Harga Jual <span class="text-red">*</span></label>
        <input type="number" name="hargaJual" required>
      </div>
      <div class="mb-1">
        <label>Stok Minimum</label>
        <input type="number" name="stokMin" value="0">
      </div>
      <div class="flex gap-1 mt-2">
        <button type="submit" class="primary">Simpan</button>
        <button type="button" class="secondary" onclick="window.initProdukUI()">Batal</button>
      </div>
    </form>
  `;

  document.getElementById('form-produk').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      barcode: form.barcode.value,
      nama: form.nama.value,
      kategori: form.kategori.value,
      satuan: form.satuan.value,
      hargaJual: form.hargaJual.value,
      stokMin: form.stokMin.value
    };
    try {
      await buatProduk(data);
      alert('Produk ditambahkan');
      initProdukUI();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };
};

window.editProduk = async (id) => {
  const p = produkList.find(x => x.id === id);
  if (!p) return;

  const container = document.getElementById('produk-content');
  container.innerHTML = `
    <h2>Edit Produk</h2>
    <form id="form-produk" class="mt-2" style="max-width: 500px;">
      <div class="mb-1">
        <label>Barcode</label>
        <input type="text" name="barcode" value="${p.barcode}">
      </div>
      <div class="mb-1">
        <label>Nama <span class="text-red">*</span></label>
        <input type="text" name="nama" value="${p.nama}" required>
      </div>
      <div class="mb-1">
        <label>Kategori</label>
        <input type="text" name="kategori" value="${p.kategori}">
      </div>
      <div class="mb-1">
        <label>Satuan</label>
        <input type="text" name="satuan" value="${p.satuan}">
      </div>
      <div class="mb-1">
        <label>Harga Jual <span class="text-red">*</span></label>
        <input type="number" name="hargaJual" value="${p.hargaJual}" required>
      </div>
      <div class="mb-1">
        <label>Stok Minimum</label>
        <input type="number" name="stokMin" value="${p.stokMin}">
      </div>
      <p class="text-gray mt-1">Stok & HPP tidak bisa diubah manual — lewat Barang Masuk / Opname.</p>
      <div class="flex gap-1 mt-2">
        <button type="submit" class="primary">Update</button>
        <button type="button" class="secondary" onclick="window.initProdukUI()">Batal</button>
      </div>
    </form>
  `;

  document.getElementById('form-produk').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      nama: form.nama.value,
      kategori: form.kategori.value,
      satuan: form.satuan.value,
      hargaJual: form.hargaJual.value,
      stokMin: form.stokMin.value
    };
    try {
      await updateProduk(id, data);
      alert('Produk diupdate');
      initProdukUI();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };
};

window.hapusProduk = async (id) => {
  if (!confirm('Nonaktifkan produk ini?')) return;
  try {
    await nonaktifkanProduk(id);
    alert('Produk dinonaktifkan');
    initProdukUI();
  } catch (err) {
    alert('Gagal: ' + err.message);
  }
};

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

window.initProdukUI = initProdukUI;
