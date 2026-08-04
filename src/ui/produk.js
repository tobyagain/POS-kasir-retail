// UI Produk — list, tambah, edit (Blue theme redesign)
import { listProduk, buatProduk, updateProduk, nonaktifkanProduk } from '../services/productService.js';

let produkList = [];

export async function initProdukUI() {
  await renderList();
}

async function renderList() {
  produkList = await listProduk({ aktif: true });
  
  const container = document.querySelector('[data-panel="produk"]');
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
      <h2 style="color:#0284c7; margin:0;">📦 Daftar Produk (${produkList.length})</h2>
      <button class="primary" onclick="window.showFormTambahProduk()">+ Tambah Produk</button>
    </div>

    ${produkList.length === 0 ? `
      <div class="card" style="text-align:center; padding:3rem; color:#64748b;">
        <div style="font-size:48px; margin-bottom:1rem;">📦</div>
        <h3 style="color:#94a3b8; margin-bottom:0.5rem;">Belum Ada Produk</h3>
        <p>Klik "Tambah Produk" untuk mulai menambahkan barang jualan</p>
      </div>
    ` : `
      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Nama Produk</th>
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
              <td><span class="badge badge-info">${p.barcode || '-'}</span></td>
              <td style="font-weight:600; color:#0f172a;">${p.nama}</td>
              <td style="color:#64748b;">${p.kategori || '-'}</td>
              <td style="color:#64748b;">${p.satuan}</td>
              <td class="text-right font-bold" style="color:#0284c7;">${formatRupiah(p.hargaJual)}</td>
              <td class="text-right" style="color:#64748b;">${formatRupiah(p.hpp)}</td>
              <td class="text-right">
                <span class="${p.stok <= p.stokMin ? 'badge badge-danger' : 'badge badge-success'}">
                  ${p.stok} ${p.satuan}
                </span>
              </td>
              <td>
                <button class="secondary" style="padding:6px 12px; font-size:12px;" onclick="window.editProduk('${p.id}')">Edit</button>
                <button class="secondary" style="padding:6px 12px; font-size:12px; background:#fee2e2; color:#dc2626; border-color:#dc2626;" onclick="window.hapusProduk('${p.id}')">Hapus</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}
  `;
}

window.showFormTambahProduk = () => {
  const container = document.querySelector('[data-panel="produk"]');
  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
      <button class="secondary" onclick="window.initProdukUI()">← Kembali</button>
      <h2 style="color:#0284c7; margin:0;">Tambah Produk Baru</h2>
    </div>

    <div class="card" style="max-width:600px;">
      <form id="form-produk">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div>
            <label>Barcode (opsional)</label>
            <input type="text" name="barcode" placeholder="Scan atau ketik barcode">
          </div>
          <div>
            <label>Kategori</label>
            <input type="text" name="kategori" placeholder="Misal: Makanan, Minuman">
          </div>
        </div>

        <div class="mt-1">
          <label>Nama Produk <span class="text-red">*</span></label>
          <input type="text" name="nama" required placeholder="Misal: Indomie Goreng">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1rem;">
          <div>
            <label>Satuan <span class="text-red">*</span></label>
            <select name="satuan" required>
              <option value="pcs">pcs</option>
              <option value="box">box</option>
              <option value="dus">dus</option>
              <option value="kg">kg</option>
              <option value="liter">liter</option>
            </select>
          </div>
          <div>
            <label>Stok Minimum</label>
            <input type="number" name="stokMin" value="10" min="0" placeholder="Alert stok habis">
          </div>
        </div>

        <div class="mt-1">
          <label>Harga Jual (Rp) <span class="text-red">*</span></label>
          <input type="number" name="hargaJual" required min="0" placeholder="Harga jual ke pelanggan" style="font-size:16px; font-weight:600;">
        </div>

        <div style="margin-top:1.5rem; padding:1rem; background:#f0f9ff; border:2px solid #bae6fd; border-radius:6px;">
          <div style="font-size:12px; color:#0369a1; margin-bottom:4px;">ℹ️ <strong>Catatan HPP & Stok</strong></div>
          <p style="font-size:12px; color:#64748b; margin:0; line-height:1.5;">
            HPP (Harga Pokok Penjualan) dan Stok akan otomatis terisi saat input <strong>Barang Masuk</strong> di tab Barang Masuk. 
            Tidak perlu diisi manual.
          </p>
        </div>

        <div class="flex gap-1 mt-2">
          <button type="submit" class="primary" style="flex:1;">Simpan Produk</button>
          <button type="button" class="secondary" onclick="window.initProdukUI()">Batal</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-produk').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await buatProduk({
        barcode: form.barcode.value.trim() || null,
        nama: form.nama.value.trim(),
        kategori: form.kategori.value.trim() || null,
        satuan: form.satuan.value,
        hargaJual: form.hargaJual.value,
        stokMin: form.stokMin.value || 0
      });
      alert('✅ Produk berhasil ditambahkan');
      initProdukUI();
    } catch (err) {
      alert('❌ Gagal: ' + err.message);
    }
  };
};

window.editProduk = async (produkId) => {
  const produk = produkList.find(p => p.id === produkId);
  if (!produk) return;

  const container = document.querySelector('[data-panel="produk"]');
  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
      <button class="secondary" onclick="window.initProdukUI()">← Kembali</button>
      <h2 style="color:#0284c7; margin:0;">Edit Produk: ${produk.nama}</h2>
    </div>

    <div class="card" style="max-width:600px;">
      <form id="form-edit">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div>
            <label>Barcode</label>
            <input type="text" name="barcode" value="${produk.barcode || ''}">
          </div>
          <div>
            <label>Kategori</label>
            <input type="text" name="kategori" value="${produk.kategori || ''}">
          </div>
        </div>

        <div class="mt-1">
          <label>Nama Produk <span class="text-red">*</span></label>
          <input type="text" name="nama" value="${produk.nama}" required>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1rem;">
          <div>
            <label>Satuan</label>
            <select name="satuan" required>
              <option value="pcs" ${produk.satuan === 'pcs' ? 'selected' : ''}>pcs</option>
              <option value="box" ${produk.satuan === 'box' ? 'selected' : ''}>box</option>
              <option value="dus" ${produk.satuan === 'dus' ? 'selected' : ''}>dus</option>
              <option value="kg" ${produk.satuan === 'kg' ? 'selected' : ''}>kg</option>
              <option value="liter" ${produk.satuan === 'liter' ? 'selected' : ''}>liter</option>
            </select>
          </div>
          <div>
            <label>Stok Minimum</label>
            <input type="number" name="stokMin" value="${produk.stokMin}" min="0">
          </div>
        </div>

        <div class="mt-1">
          <label>Harga Jual (Rp) <span class="text-red">*</span></label>
          <input type="number" name="hargaJual" value="${produk.hargaJual}" required min="0" style="font-size:16px; font-weight:600;">
        </div>

        <div style="margin-top:1rem; padding:1rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:13px;">
            <div>
              <span style="color:#64748b;">HPP Saat Ini:</span>
              <div style="font-weight:700; color:#0284c7;">${formatRupiah(produk.hpp)}</div>
            </div>
            <div>
              <span style="color:#64748b;">Stok Saat Ini:</span>
              <div style="font-weight:700; color:${produk.stok <= produk.stokMin ? '#dc2626' : '#10b981'};">${produk.stok} ${produk.satuan}</div>
            </div>
          </div>
          <p style="font-size:11px; color:#64748b; margin:8px 0 0 0;">
            HPP & Stok tidak bisa diedit manual. Update via tab Barang Masuk atau Stok.
          </p>
        </div>

        <div class="flex gap-1 mt-2">
          <button type="submit" class="primary" style="flex:1;">Update Produk</button>
          <button type="button" class="secondary" onclick="window.initProdukUI()">Batal</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-edit').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await updateProduk(produkId, {
        barcode: form.barcode.value.trim() || null,
        nama: form.nama.value.trim(),
        kategori: form.kategori.value.trim() || null,
        satuan: form.satuan.value,
        hargaJual: form.hargaJual.value,
        stokMin: form.stokMin.value
      });
      alert('✅ Produk berhasil diupdate');
      initProdukUI();
    } catch (err) {
      alert('❌ Gagal: ' + err.message);
    }
  };
};

window.hapusProduk = async (produkId) => {
  const produk = produkList.find(p => p.id === produkId);
  if (!produk) return;

  const konfirm = confirm(`Hapus produk "${produk.nama}"?\n\nProduk akan dinonaktifkan (tidak dihapus permanen).`);
  if (!konfirm) return;

  try {
    await nonaktifkanProduk(produkId);
    alert('✅ Produk dinonaktifkan');
    initProdukUI();
  } catch (err) {
    alert('❌ Gagal: ' + err.message);
  }
};

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

window.initProdukUI = initProdukUI;
