// UI Barang Masuk — Blue theme redesign
import { simpanBarangMasuk, listBarangMasuk } from '../services/purchaseService.js';
import { listProduk } from '../services/productService.js';
import { bindNumericInput, readNumericInput } from './numeric-input.js';

let purchaseList = [];
let produkOptions = [];
let itemsCart = [];
let selectedProdukId = '';

export async function initBarangMasukUI() {
  await renderList();
}

async function renderList() {
  purchaseList = await listBarangMasuk();
  
  const container = document.querySelector('[data-panel="barang-masuk"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
      <h2 style="color:#0284c7; margin:0;">📦 Riwayat Barang Masuk (${purchaseList.length})</h2>
      <button class="primary" onclick="window.showFormBarangMasuk()">+ Input Barang Masuk</button>
    </div>

    <div style="flex:1; overflow-y:auto;">
    ${purchaseList.length === 0 ? `
      <div class="card" style="text-align:center; padding:3rem; color:#64748b;">
        <div style="font-size:48px; margin-bottom:1rem;">📥</div>
        <h3 style="color:#94a3b8; margin-bottom:0.5rem;">Belum Ada Data Barang Masuk</h3>
        <p>Klik "Input Barang Masuk" untuk mencatat pembelian stok</p>
      </div>
    ` : `
      <table>
        <thead>
          <tr>
            <th>No. Nota</th>
            <th>Tanggal</th>
            <th>Supplier</th>
            <th>Item</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${purchaseList.map(p => `
            <tr>
              <td><span class="badge badge-info">${p.noNota}</span></td>
              <td>${formatTanggal(p.tanggal)}</td>
              <td style="font-weight:600; color:#0f172a;">${p.supplier}</td>
              <td style="color:#64748b;">${p.items.length} item</td>
              <td class="text-right font-bold" style="color:#10b981;">${formatRupiah(p.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}
    </div>
    </div>
  `;
}

window.showFormBarangMasuk = async () => {
  produkOptions = await listProduk({ aktif: true });
  itemsCart = [];

  const container = document.querySelector('[data-panel="barang-masuk"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
      <button class="secondary" onclick="window.initBarangMasukUI()">← Kembali</button>
      <h2 style="color:#0284c7; margin:0;">Input Barang Masuk</h2>
    </div>

    <div style="flex:1; overflow-y:auto;">
    <div style="display:grid; grid-template-columns:1fr 400px; gap:1.5rem;">
      <!-- Kiri: Form Header + Add Item -->
      <div class="card">
        <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">📋 Info Pembelian</h3>
        <div class="mb-1">
          <label>Supplier <span class="text-red">*</span></label>
          <input type="text" id="input-supplier" required placeholder="Nama supplier">
        </div>
        <div class="mb-1">
          <label>Catatan</label>
          <textarea id="input-catatan" rows="2" placeholder="Opsional"></textarea>
        </div>

        <hr style="margin:1.5rem 0; border:none; border-top:1px solid #e2e8f0;">

        <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">➕ Tambah Item</h3>
        <div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:8px; margin-bottom:1rem;">
          <div>
            <label>Cari Produk <span class="text-red">*</span></label>
            <input type="text" id="input-cari-produk" placeholder="Ketik nama atau scan barcode" autocomplete="off">
            <div id="hasil-cari-produk" style="position:relative;"></div>
            <div id="produk-terpilih" style="margin-top:6px; font-size:12px; color:#047857;"></div>
          </div>
          <div>
            <label>Qty <span class="text-red">*</span></label>
            <input type="text" id="input-qty" placeholder="0">
          </div>
          <div>
            <label>Harga Beli <span class="text-red">*</span></label>
            <input type="text" id="input-harga" placeholder="0">
          </div>
        </div>
        <button class="primary" onclick="window.tambahItem()" style="width:100%;">+ Tambah ke List</button>
      </div>

      <!-- Kanan: Cart Items + Total -->
      <div>
        <div class="card" style="margin-bottom:1rem;">
          <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">📦 Item List</h3>
          <div id="cart-content"></div>
        </div>

        <div class="card" style="background:linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border:2px solid #10b981;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <span style="font-weight:600; color:#047857;">TOTAL</span>
            <span id="label-total" style="font-size:24px; font-weight:700; color:#047857;">Rp 0</span>
          </div>
          <button onclick="window.simpanBarangMasuk()" class="primary" style="width:100%; padding:14px; font-size:16px;">Simpan Barang Masuk</button>
        </div>
      </div>
    </div>
    </div>
    </div>
  `;

  // Format thousand separator untuk input qty & harga
  const hasilCari = document.getElementById('hasil-cari-produk');
  const qtyInput = document.getElementById('input-qty');
  const hargaInput = document.getElementById('input-harga');
  const cariInput = document.getElementById('input-cari-produk');
  bindNumericInput(qtyInput);
  bindNumericInput(hargaInput);
  selectedProdukId = '';

  const renderHasilCari = (query) => {
    const q = query.trim().toLowerCase();
    const hasil = q ? produkOptions.filter(p => p.nama.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q)).slice(0, 8) : [];
    hasilCari.innerHTML = hasil.map(p => `<button type="button" data-produk-id="${p.id}" style="display:block; width:100%; text-align:left; padding:8px; border:1px solid #e2e8f0; background:#fff; cursor:pointer;">${p.nama}${p.barcode ? ` — ${p.barcode}` : ''}</button>`).join('');
  };
  cariInput.addEventListener('input', () => renderHasilCari(cariInput.value));
  cariInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const exact = produkOptions.find(p => p.barcode === cariInput.value.trim());
      if (exact) pilihProduk(exact);
    }
  });
  hasilCari.addEventListener('click', (e) => {
    const id = e.target.closest('[data-produk-id]')?.dataset.produkId;
    const produk = produkOptions.find(p => p.id === id);
    if (produk) pilihProduk(produk);
  });
  function pilihProduk(produk) {
    selectedProdukId = produk.id;
    cariInput.value = produk.nama;
    hasilCari.innerHTML = '';
    document.getElementById('produk-terpilih').textContent = produk.barcode ? `Barcode: ${produk.barcode}` : 'Produk dipilih';
    qtyInput.focus();
  }

  // Enter key handlers untuk konsistensi dengan kasir
  if (qtyInput) {
    qtyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('input-harga')?.focus();
      }
    });
  }
  if (hargaInput) {
    hargaInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.tambahItem();
      }
    });
  }
  // Render cart AFTER HTML is in DOM (dipanggil ulang setelah tambah/hapus item)
  setTimeout(() => renderCart(), 0);
};

window.tambahItem = () => {
  const produkId = selectedProdukId;
  const qtyInput = document.getElementById('input-qty');
  const hargaInput = document.getElementById('input-harga');
  
  const qty = readNumericInput(qtyInput);
  const hargaBeli = readNumericInput(hargaInput);

  if (!produkId) {
    alert('Pilih produk');
    return;
  }
  if (!qty || qty <= 0) {
    alert('Isi qty');
    return;
  }
  if (!hargaBeli || hargaBeli <= 0) {
    alert('Isi harga beli');
    return;
  }

  const produk = produkOptions.find(p => p.id === produkId);
  if (!produk) return;

  itemsCart.push({
    produkId: produk.id,
    nama: produk.nama,
    qty,
    hargaBeli,
    subtotal: qty * hargaBeli
  });

  // Reset form item
  selectedProdukId = '';
  document.getElementById('input-cari-produk').value = '';
  qtyInput.value = '';
  hargaInput.value = '';
  const selectedLabel = document.getElementById('produk-terpilih');
  if (selectedLabel) selectedLabel.textContent = '';
  document.getElementById('input-cari-produk')?.focus();

  renderCart();
};

window.hapusItemBarangMasuk = (index) => {
  itemsCart.splice(index, 1);
  renderCart();
};

function renderCart() {
  const panel = document.querySelector('[data-panel="barang-masuk"]');
  const container = panel?.querySelector('#cart-content');
  const totalLabel = panel?.querySelector('#label-total');

  if (!container) return;

  if (itemsCart.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:2rem; color:#94a3b8;">Belum ada item</div>';
  } else {
    container.innerHTML = itemsCart.map((it, i) => `
      <div style="border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin-bottom:8px; background:#fafafa;">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:6px;">
          <div style="flex:1;">
            <div style="font-weight:700; font-size:14px; color:#0f172a;">${it.nama}</div>
            <div style="font-size:12px; color:#64748b;">${it.qty} × ${formatRupiah(it.hargaBeli)}</div>
          </div>
          <div style="font-weight:700; color:#10b981;">${formatRupiah(it.subtotal)}</div>
        </div>
        <button onclick="window.hapusItemBarangMasuk(${i})" style="padding:4px 10px; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">Hapus</button>
      </div>
    `).join('');
  }

  // Update total
  const total = itemsCart.reduce((sum, it) => sum + it.subtotal, 0);
  if (totalLabel) {
    totalLabel.textContent = formatRupiah(total);
    totalLabel.style.color = total > 0 ? '#047857' : '#64748b';
  }
}

window.simpanBarangMasuk = async () => {
  const supplier = document.getElementById('input-supplier').value.trim();
  const catatan = document.getElementById('input-catatan').value.trim();

  if (!supplier) {
    alert('Isi nama supplier');
    return;
  }

  if (itemsCart.length === 0) {
    alert('Tambahkan minimal 1 item');
    return;
  }

  try {
    await simpanBarangMasuk({
      supplier,
      catatan: catatan || null,
      items: itemsCart
    });
    alert('✅ Barang masuk berhasil disimpan.\n\nStok & HPP produk telah diupdate.');
    initBarangMasukUI();
  } catch (err) {
    alert('❌ Gagal: ' + err.message);
  }
};

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatTanggal(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

window.initBarangMasukUI = initBarangMasukUI;
