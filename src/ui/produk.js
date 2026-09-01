// UI Produk — list, tambah, edit (Blue theme redesign)
import { listProduk, buatProduk, updateProduk, nonaktifkanProduk } from '../services/productService.js';
import { bindNumericInput, readNumericInput } from './numeric-input.js';

let produkList = [];
let selectedRowIndex = -1;

export async function initProdukUI() {
  await renderList();
}

async function renderList() {
  produkList = await listProduk({ aktif: true });
  
  const container = document.querySelector('[data-panel="produk"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
      <h2 style="color:#0284c7; margin:0;">📦 Daftar Produk (<span id="produk-count">${produkList.length}</span>)</h2>
      <div style="display:flex; gap:8px;">
        <button class="secondary" onclick="window.downloadTemplateProduk()">⬇ Template CSV</button>
        <button class="secondary" onclick="window.showImportProduk()">📥 Import CSV</button>
        <button class="primary" onclick="window.showFormTambahProduk()">+ Tambah Produk</button>
      </div>
    </div>
    <div style="margin-bottom:1rem;">
      <input type="text" id="input-cari-produk" placeholder="Cari produk..." style="width:100%; padding:10px; border:2px solid #0284c7; border-radius:6px;">
    </div>

    <div style="flex:1; overflow-y:auto;" id="produk-list-wrap">
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
        <tbody id="produk-tbody">
          ${produkList.map((p, i) => `
            <tr data-produk-row="${i}" data-produk-id="${p.id}" style="cursor:pointer;">
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
                <button class="secondary" style="padding:6px 12px; font-size:12px;" onclick="event.stopPropagation(); window.editProduk('${p.id}')">Edit</button>
                <button class="secondary" style="padding:6px 12px; font-size:12px; background:#fee2e2; color:#dc2626; border-color:#dc2626;" onclick="event.stopPropagation(); window.hapusProduk('${p.id}')">Hapus</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}
    </div>
    </div>
  `;

  bindProdukListEvents();
}

// Filter + interaksi list
function bindProdukListEvents() {
  const input = document.getElementById('input-cari-produk');
  if (!input) return;

  selectedRowIndex = -1;

  input.addEventListener('input', () => {
    selectedRowIndex = -1;
    filterProdukRows(input.value.trim().toLowerCase());
  });

  input.addEventListener('keydown', (e) => {
    const rows = visibleProdukRows();
    if (e.key === 'ArrowDown') { e.preventDefault(); moveRowSelection(rows, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveRowSelection(rows, -1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const target = selectedRowIndex >= 0 && rows[selectedRowIndex] ? rows[selectedRowIndex] : rows[0];
      if (target) window.editProduk(target.dataset.produkId);
    }
    else if (e.key === 'Escape') {
      e.preventDefault();
      input.value = '';
      selectedRowIndex = -1;
      filterProdukRows('');
    }
  });

  // Klik baris = edit (bukan lewat onclick inline)
  document.getElementById('produk-tbody')?.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-produk-row]');
    if (!tr || e.target.closest('button')) return;
    window.editProduk(tr.dataset.produkId);
  });
}

function visibleProdukRows() {
  return Array.from(document.querySelectorAll('#produk-tbody [data-produk-row]'))
    .filter(r => r.style.display !== 'none');
}

function moveRowSelection(rows, delta) {
  if (rows.length === 0) return;
  selectedRowIndex = (selectedRowIndex + delta + rows.length) % rows.length;
  rows.forEach((r) => r.style.background = '');
  const row = rows[selectedRowIndex];
  row.style.background = '#f0f9ff';
  row.scrollIntoView({ block: 'nearest' });
}

function filterProdukRows(q) {
  document.querySelectorAll('#produk-tbody [data-produk-row]').forEach((r, i) => {
    const p = produkList.find(x => x.id === r.dataset.produkId);
    const match = !q || p.nama.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q);
    r.style.display = match ? '' : 'none';
  });
  const count = visibleProdukRows().length;
  const label = document.getElementById('produk-count');
  if (label) label.textContent = count;
}

// ===== Import produk dari CSV =====

window.downloadTemplateProduk = async () => {
  if (!window.__importProdukCore) {
    window.__importProdukCore = await import('../core/importProduk.js');
  }
  const { TEMPLATE_CSV } = window.__importProdukCore;
  const blob = new Blob(['\ufeff' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'template-import-produk.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};

window.showImportProduk = async () => {
  if (!window.__importProdukCore) {
    window.__importProdukCore = await import('../core/importProduk.js');
  }
  const container = document.querySelector('[data-panel="produk"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
      <button class="secondary" onclick="window.initProdukUI()">← Kembali</button>
      <h2 style="color:#0284c7; margin:0;">Import Produk dari CSV</h2>
    </div>

    <div style="flex:1; overflow-y:auto;">
    <div class="card" style="max-width:700px;">
      <div style="background:#f0f9ff; border:2px solid #bae6fd; border-radius:6px; padding:1rem; margin-bottom:1rem;">
        <div style="font-size:13px; color:#0284c7; font-weight:600; margin-bottom:4px;">Cara pakai</div>
        <ol style="font-size:13px; color:#64748b; margin:0; padding-left:1.2rem; line-height:1.6;">
          <li>Download <strong>Template CSV</strong>, buka di Excel</li>
          <li>Isi data produk (kolom: barcode, nama, kategori, satuan, hargaJual, stokMin)</li>
          <li>Save As → <strong>CSV (delimited)</strong></li>
          <li>Pilih file di bawah ini → preview → Import</li>
        </ol>
        <div style="font-size:12px; color:#64748b; margin-top:8px;">
          ⚠ HPP & stok tidak diimport — diisi lewat Barang Masuk. Barcode duplikat akan di-skip.
        </div>
      </div>

      <input type="file" id="file-import-produk" accept=".csv,text/csv" style="margin-bottom:1rem;">
      <div id="import-preview"></div>
    </div>
    </div>
    </div>
  `;

  document.getElementById('file-import-produk').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const { produkList, errors, skipped } = window.__importProdukCore.parseImportProduk(text);
    renderImportPreview(produkList, errors, skipped);
  });
};

function renderImportPreview(produkList, errors, skipped) {
  const el = document.getElementById('import-preview');

  if (produkList.length === 0 && errors.length > 0) {
    el.innerHTML = `
      <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:6px; padding:1rem; color:#dc2626; font-size:13px;">
        ${errors.map(e => `<div>⚠ ${e}</div>`).join('')}
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="margin-bottom:1rem; font-size:14px;">
      <strong style="color:#10b981;">${produkList.length} produk siap diimport</strong>
      ${skipped > 0 ? `<span style="color:#dc2626; margin-left:8px;">(${skipped} baris di-skip)</span>` : ''}
    </div>
    ${errors.length > 0 ? `
      <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:6px; padding:8px 12px; margin-bottom:1rem; font-size:12px; color:#dc2626; max-height:120px; overflow-y:auto;">
        ${errors.map(e => `<div>⚠ ${e}</div>`).join('')}
      </div>` : ''}
    <div style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:1rem;">
      <table style="font-size:13px;">
        <thead><tr><th>Barcode</th><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Harga Jual</th><th>Stok Min</th></tr></thead>
        <tbody>
          ${produkList.map(p => `
            <tr>
              <td>${p.barcode || '-'}</td>
              <td style="font-weight:600;">${p.nama}</td>
              <td>${p.kategori || '-'}</td>
              <td>${p.satuan}</td>
              <td class="text-right">${formatRupiah(p.hargaJual)}</td>
              <td class="text-right">${p.stokMin}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <button class="primary" style="width:100%; padding:14px; font-size:16px;" onclick="window.jalankanImportProduk()">
      Import ${produkList.length} Produk
    </button>
  `;

  window.__importProdukData = produkList;
}

window.jalankanImportProduk = async () => {
  const list = window.__importProdukData || [];
  if (list.length === 0) return;

  const existing = await listProduk({ aktif: true });
  const barcodeAda = new Set(existing.filter(p => p.barcode).map(p => p.barcode));

  let imported = 0, dupSkipped = 0, failed = 0;
  for (const p of list) {
    if (p.barcode && barcodeAda.has(p.barcode)) { dupSkipped++; continue; }
    try {
      await buatProduk(p);
      imported++;
      if (p.barcode) barcodeAda.add(p.barcode);
    } catch (err) {
      failed++;
      console.error('Import gagal:', p.nama, err);
    }
  }

  const el = document.getElementById('import-preview');
  el.innerHTML = `
    <div style="background:#ecfdf5; border:2px solid #10b981; border-radius:6px; padding:1.5rem; text-align:center;">
      <div style="font-size:32px; margin-bottom:8px;">✅</div>
      <div style="font-size:18px; font-weight:700; color:#047857; margin-bottom:8px;">Import selesai</div>
      <div style="font-size:14px; color:#64748b;">
        ${imported} produk ditambahkan
        ${dupSkipped > 0 ? ` · ${dupSkipped} barcode duplikat di-skip` : ''}
        ${failed > 0 ? ` · <span style="color:#dc2626;">${failed} gagal</span>` : ''}
      </div>
      <button class="primary mt-2" onclick="window.initProdukUI()">Lihat Daftar Produk</button>
    </div>
  `;
};

window.showFormTambahProduk = () => {
  const container = document.querySelector('[data-panel="produk"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
      <button class="secondary" onclick="window.initProdukUI()">← Kembali</button>
      <h2 style="color:#0284c7; margin:0;">Tambah Produk Baru</h2>
    </div>

    <div style="flex:1; overflow-y:auto;">
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
            <input type="text" inputmode="numeric" name="stokMin" value="10" placeholder="Alert stok habis">
          </div>
        </div>

        <div class="mt-1">
          <label>Harga Jual (Rp) <span class="text-red">*</span></label>
          <input type="text" name="hargaJual" id="input-harga-jual" required placeholder="Harga jual ke pelanggan" style="font-size:16px; font-weight:600;">
        </div>

        <div style="margin-top:1.5rem; padding:1rem; background:#f0f9ff; border:2px solid #bae6fd; border-radius:6px;">
          <div style="font-size:12px; color:#0284c7; margin-bottom:4px;">ℹ️ <strong>Catatan HPP & Stok</strong></div>
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
    </div>
    </div>
  `;

  bindNumericInput(document.getElementById('input-harga-jual'));
  bindNumericInput(document.querySelector('#form-produk [name="stokMin"]'));

  document.getElementById('form-produk').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await buatProduk({
        barcode: form.barcode.value.trim() || null,
        nama: form.nama.value.trim(),
        kategori: form.kategori.value.trim() || null,
        satuan: form.satuan.value,
        hargaJual: readNumericInput(form.hargaJual),
        stokMin: readNumericInput(form.stokMin)
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
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
      <button class="secondary" onclick="window.initProdukUI()">← Kembali</button>
      <h2 style="color:#0284c7; margin:0;">Edit Produk: ${produk.nama}</h2>
    </div>

    <div style="flex:1; overflow-y:auto;">
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
            <input type="text" inputmode="numeric" name="stokMin" value="${produk.stokMin.toLocaleString('id-ID')}">
          </div>
        </div>

        <div class="mt-1">
          <label>Harga Jual (Rp) <span class="text-red">*</span></label>
          <input type="text" inputmode="numeric" name="hargaJual" value="${produk.hargaJual.toLocaleString('id-ID')}" required style="font-size:16px; font-weight:600;">
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
    </div>
    </div>
  `;

  bindNumericInput(document.querySelector('#form-edit [name="stokMin"]'));
  bindNumericInput(document.querySelector('#form-edit [name="hargaJual"]'));

  document.getElementById('form-edit').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await updateProduk(produkId, {
        barcode: form.barcode.value.trim() || null,
        nama: form.nama.value.trim(),
        kategori: form.kategori.value.trim() || null,
        satuan: form.satuan.value,
        hargaJual: readNumericInput(form.hargaJual),
        stokMin: readNumericInput(form.stokMin)
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
