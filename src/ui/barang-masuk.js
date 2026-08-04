// UI Barang Masuk
import { simpanBarangMasuk, listBarangMasuk } from '../services/purchaseService.js';
import { listProduk } from '../services/productService.js';

let purchaseList = [];
let produkOptions = [];
let itemsCart = [];

export async function initBarangMasukUI() {
  await renderList();
}

async function renderList() {
  purchaseList = await listBarangMasuk();
  
  const container = document.getElementById('barang-masuk-content');
  container.innerHTML = `
    <div class="flex gap-2 mb-2">
      <button class="primary" onclick="window.showFormBarangMasuk()">+ Input Barang Masuk</button>
    </div>

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
            <td>${p.noNota}</td>
            <td>${formatTanggal(p.tanggal)}</td>
            <td>${p.supplier}</td>
            <td>${p.items.length} item</td>
            <td class="text-right">${formatRupiah(p.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.showFormBarangMasuk = async () => {
  produkOptions = await listProduk({ aktif: true });
  itemsCart = [];

  const container = document.getElementById('barang-masuk-content');
  container.innerHTML = `
    <h2>Input Barang Masuk</h2>
    <form id="form-header" class="mt-2" style="max-width: 500px;">
      <div class="mb-1">
        <label>Supplier <span class="text-red">*</span></label>
        <input type="text" name="supplier" required>
      </div>
      <div class="mb-1">
        <label>Catatan</label>
        <textarea name="catatan" rows="2"></textarea>
      </div>
    </form>

    <h3 class="mt-2">Item</h3>
    <div class="flex gap-1 mb-2">
      <select id="select-produk" style="flex:1;">
        <option value="">-- Pilih Produk --</option>
        ${produkOptions.map(p => `<option value="${p.id}">${p.nama} (${p.barcode || 'no barcode'})</option>`).join('')}
      </select>
      <input type="number" id="input-qty" placeholder="Qty" style="width:80px;" min="1">
      <input type="number" id="input-harga" placeholder="Harga Beli" style="width:120px;" min="0">
      <button class="primary" onclick="window.tambahItemBM()">+ Tambah</button>
    </div>

    <table id="table-items">
      <thead>
        <tr>
          <th>Produk</th>
          <th>Qty</th>
          <th>Harga Beli</th>
          <th>Subtotal</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody></tbody>
      <tfoot>
        <tr>
          <th colspan="3" class="text-right">Total</th>
          <th class="text-right" id="total-bm">Rp 0</th>
          <th></th>
        </tr>
      </tfoot>
    </table>

    <div class="flex gap-1 mt-2">
      <button class="primary" onclick="window.simpanBM()">Simpan</button>
      <button class="secondary" onclick="window.initBarangMasukUI()">Batal</button>
    </div>
  `;

  renderItemsCart();
};

window.tambahItemBM = () => {
  const produkId = document.getElementById('select-produk').value;
  const qty = parseInt(document.getElementById('input-qty').value);
  const hargaBeli = parseInt(document.getElementById('input-harga').value);

  if (!produkId || !qty || !hargaBeli) {
    alert('Pilih produk, qty, dan harga beli');
    return;
  }

  const produk = produkOptions.find(p => p.id === produkId);
  if (!produk) return;

  itemsCart.push({
    produkId: produk.id,
    nama: produk.nama,
    qty,
    hargaBeli
  });

  document.getElementById('select-produk').value = '';
  document.getElementById('input-qty').value = '';
  document.getElementById('input-harga').value = '';

  renderItemsCart();
};

window.hapusItemBM = (index) => {
  itemsCart.splice(index, 1);
  renderItemsCart();
};

function renderItemsCart() {
  const tbody = document.querySelector('#table-items tbody');
  if (!tbody) return;

  const total = itemsCart.reduce((sum, it) => sum + it.qty * it.hargaBeli, 0);

  tbody.innerHTML = itemsCart.map((it, i) => `
    <tr>
      <td>${it.nama}</td>
      <td class="text-right">${it.qty}</td>
      <td class="text-right">${formatRupiah(it.hargaBeli)}</td>
      <td class="text-right">${formatRupiah(it.qty * it.hargaBeli)}</td>
      <td><button class="secondary" onclick="window.hapusItemBM(${i})">Hapus</button></td>
    </tr>
  `).join('');

  document.getElementById('total-bm').textContent = formatRupiah(total);
}

window.simpanBM = async () => {
  const form = document.getElementById('form-header');
  const supplier = form.supplier.value.trim();
  const catatan = form.catatan.value.trim();

  if (!supplier) {
    alert('Supplier wajib diisi');
    return;
  }

  if (itemsCart.length === 0) {
    alert('Tambahkan minimal 1 item');
    return;
  }

  try {
    await simpanBarangMasuk({ supplier, items: itemsCart, catatan });
    alert('Barang masuk disimpan');
    initBarangMasukUI();
  } catch (err) {
    alert('Gagal: ' + err.message);
  }
};

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatTanggal(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

window.initBarangMasukUI = initBarangMasukUI;
