// UI Kasir — Mobile-optimized, tap-friendly
import { cariByBarcode, cariByNama, listProduk } from '../services/productService.js';
import { simpanPenjualan } from '../services/saleService.js';
import { getShiftTerbuka } from '../services/shiftService.js';
import { cetakStruk } from '../services/printService.js';

let keranjang = [];
let shiftAktif = null;
let produkList = [];

export async function initKasirUI() {
  shiftAktif = await getShiftTerbuka();
  
  if (!shiftAktif) {
    renderGuardShift();
    return;
  }

  produkList = await listProduk({ aktif: true });
  await renderKasir();
}

function renderGuardShift() {
  const container = document.querySelector('[data-panel="kasir"]');
  container.innerHTML = `
    <div style="max-width:500px; margin:2rem auto; text-align:center; padding:2rem; background:#fef2f2; border:1px solid #fca5a5; border-radius:8px;">
      <h2 class="text-red">⚠ Tidak Ada Shift Terbuka</h2>
      <p class="mt-1 text-gray">Buka shift dulu di tab <strong>Shift</strong> sebelum jualan.</p>
      <button class="primary mt-2" onclick="window.goToShift()">Ke Tab Shift</button>
    </div>
  `;
}

window.goToShift = () => {
  document.querySelector('[data-tab="shift"]').click();
};

async function renderKasir() {
  const container = document.querySelector('[data-panel="kasir"]');
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:calc(100vh - 120px); gap:1rem;">
      <!-- Top: Search + Riwayat -->
      <div style="background:#fff; padding:1rem; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div class="flex gap-1">
          <input type="text" id="input-search" placeholder="Cari produk (nama/barcode)..." style="flex:1; font-size:16px; padding:12px;" autofocus>
          <button class="secondary" onclick="window.showRiwayatPenjualan()" style="padding:12px 24px;">Riwayat</button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 380px; gap:1rem; flex:1; overflow:hidden;">
        <!-- Kiri: Grid Produk + Keranjang -->
        <div style="display:flex; flex-direction:column; gap:1rem; overflow:hidden;">
          <!-- Grid Produk (tap to add) -->
          <div style="background:#fff; padding:1rem; border-radius:8px; flex:1; overflow-y:auto; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin-bottom:0.5rem;">Produk (Tap untuk tambah)</h3>
            <div id="produk-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px;"></div>
          </div>

          <!-- Keranjang -->
          <div style="background:#fff; padding:1rem; border-radius:8px; max-height:280px; overflow-y:auto; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <h3>Keranjang</h3>
            <div id="keranjang-content"></div>
          </div>
        </div>

        <!-- Kanan: Total & Bayar -->
        <div style="background:#fff; padding:1.5rem; border-radius:8px; display:flex; flex-direction:column; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <div style="font-size:12px; color:#6b7280; margin-bottom:1rem;">
            Shift: <strong>${shiftAktif.kasir}</strong>
          </div>

          <div style="border-bottom:2px solid #e5e7eb; padding-bottom:1rem; margin-bottom:1rem;">
            <div class="flex" style="justify-content:space-between; margin-bottom:0.5rem; font-size:14px;">
              <span>Subtotal</span>
              <span id="label-subtotal" style="font-weight:600;">Rp 0</span>
            </div>
            <div class="flex" style="justify-content:space-between; align-items:center;">
              <span style="font-size:14px;">Diskon</span>
              <input type="number" id="input-diskon-nota" value="0" style="width:120px; text-align:right; padding:8px;" min="0">
            </div>
          </div>

          <div class="flex" style="justify-content:space-between; font-size:24px; font-weight:700; margin-bottom:1.5rem; color:#1a1a1a;">
            <span>TOTAL</span>
            <span id="label-total">Rp 0</span>
          </div>

          <!-- Metode Bayar: Inline Input -->
          <div style="margin-bottom:1rem;">
            <strong style="display:block; margin-bottom:0.5rem;">Bayar</strong>
            
            <!-- Input Tunai -->
            <div style="background:#f0fdf4; border:2px solid #10b981; border-radius:8px; padding:12px; margin-bottom:8px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="font-size:18px;">💵</span>
                <strong style="flex:1;">TUNAI</strong>
              </div>
              <div style="display:flex; gap:8px;">
                <input type="number" id="input-tunai" placeholder="0" min="0" style="flex:1; padding:12px; font-size:16px; font-weight:600; border:2px solid #10b981; border-radius:6px;">
                <button onclick="window.bayarTunai()" style="padding:12px 24px; font-size:16px; font-weight:600; background:#10b981; color:#fff; border:none; border-radius:6px; cursor:pointer;">+</button>
              </div>
            </div>

            <!-- Tombol QRIS -->
            <button onclick="window.bayarQRIS()" style="width:100%; padding:16px; font-size:16px; font-weight:600; background:#3b82f6; color:#fff; border:none; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span style="font-size:20px;">📱</span>
              <span>QRIS (Bayar Pas)</span>
            </button>

            <div id="pembayaran-list" style="margin-top:8px;"></div>
            <div id="kembalian-info" style="margin-top:8px; padding:12px; background:#d1fae5; border-radius:6px; font-size:16px; font-weight:700; display:none;">
              Kembalian: <span id="label-kembalian" style="color:#059669;">Rp 0</span>
            </div>
          </div>

          <div class="flex gap-1">
            <button class="primary" style="flex:1; padding:16px; font-size:18px; font-weight:700;" onclick="window.selesaiBayar()">BAYAR</button>
            <button class="secondary" style="padding:16px;" onclick="window.resetKeranjang()">Reset</button>
          </div>
        </div>
      </div>
    </div>
  `;

  renderProdukGrid();
  renderKeranjang();

  // Search real-time
  document.getElementById('input-search').addEventListener('input', (e) => {
    renderProdukGrid(e.target.value.toLowerCase());
  });

  document.getElementById('input-diskon-nota').addEventListener('input', hitungTotal);
}

function renderProdukGrid(searchQuery = '') {
  const grid = document.getElementById('produk-grid');
  if (!grid) return;

  let filtered = produkList;
  if (searchQuery) {
    filtered = produkList.filter(p => 
      p.nama.toLowerCase().includes(searchQuery) || 
      (p.barcode && p.barcode.includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="text-gray">Tidak ada produk</div>';
    return;
  }

  grid.innerHTML = filtered.slice(0, 20).map(p => `
    <button onclick="window.tambahKeKeranjangById('${p.id}')" 
            style="padding:12px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; cursor:pointer; text-align:left; transition:all 0.2s;"
            onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';"
            onmouseout="this.style.background='#f9fafb'; this.style.borderColor='#e5e7eb';">
      <div style="font-weight:600; font-size:13px; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.nama}</div>
      <div style="font-size:14px; font-weight:700; color:#2563eb;">${formatRupiah(p.hargaJual)}</div>
      <div style="font-size:11px; color:#6b7280; margin-top:2px;">Stok: ${p.stok}</div>
    </button>
  `).join('');
}

window.tambahKeKeranjangById = (produkId) => {
  const produk = produkList.find(p => p.id === produkId);
  if (!produk) return;

  const existing = keranjang.find(it => it.produkId === produkId);
  if (existing) {
    existing.qty++;
    existing.subtotal = existing.qty * existing.hargaJualSnapshot - existing.diskonItem;
  } else {
    keranjang.push({
      produkId: produk.id,
      nama: produk.nama,
      qty: 1,
      hargaJualSnapshot: produk.hargaJual,
      hppSnapshot: produk.hpp,
      diskonItem: 0,
      subtotal: produk.hargaJual
    });
  }
  renderKeranjang();
};

window.ubahQty = (index, delta) => {
  keranjang[index].qty += delta;
  if (keranjang[index].qty <= 0) {
    keranjang.splice(index, 1);
  } else {
    keranjang[index].subtotal = keranjang[index].qty * keranjang[index].hargaJualSnapshot - keranjang[index].diskonItem;
  }
  renderKeranjang();
};

window.hapusItem = (index) => {
  keranjang.splice(index, 1);
  renderKeranjang();
};

function renderKeranjang() {
  const container = document.getElementById('keranjang-content');
  if (!container) return;

  if (keranjang.length === 0) {
    container.innerHTML = '<div class="text-gray" style="margin-top:0.5rem;">Keranjang kosong</div>';
  } else {
    container.innerHTML = keranjang.map((it, i) => `
      <div style="border-bottom:1px solid #e5e7eb; padding:8px 0; display:flex; justify-content:space-between; align-items:center;">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:14px;">${it.nama}</div>
          <div style="font-size:13px; color:#6b7280;">${formatRupiah(it.hargaJualSnapshot)} × ${it.qty}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button onclick="window.ubahQty(${i}, -1)" style="padding:4px 12px; background:#e5e7eb; border:none; border-radius:4px; cursor:pointer; font-size:16px;">−</button>
          <span style="font-weight:700; min-width:30px; text-align:center;">${it.qty}</span>
          <button onclick="window.ubahQty(${i}, 1)" style="padding:4px 12px; background:#e5e7eb; border:none; border-radius:4px; cursor:pointer; font-size:16px;">+</button>
          <span style="font-weight:700; color:#2563eb; min-width:80px; text-align:right;">${formatRupiah(it.subtotal)}</span>
          <button onclick="window.hapusItem(${i})" style="padding:4px 8px; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; cursor:pointer;">×</button>
        </div>
      </div>
    `).join('');
  }

  hitungTotal();
}

let pembayaranList = [];

window.bayarTunai = () => {
  const inputTunai = document.getElementById('input-tunai');
  const nominal = parseInt(inputTunai.value);

  if (isNaN(nominal) || nominal <= 0) {
    alert('Isi nominal tunai');
    inputTunai.focus();
    return;
  }

  const totalNetto = keranjang.reduce((sum, it) => sum + it.subtotal, 0) - parseInt(document.getElementById('input-diskon-nota')?.value || 0);
  
  if (totalNetto <= 0) {
    alert('Keranjang kosong atau total 0');
    return;
  }

  pembayaranList.push({ metode: 'tunai', jumlah: nominal });
  inputTunai.value = '';
  inputTunai.focus();
  renderPembayaran();
};

window.bayarQRIS = () => {
  const totalNetto = keranjang.reduce((sum, it) => sum + it.subtotal, 0) - parseInt(document.getElementById('input-diskon-nota')?.value || 0);
  
  if (totalNetto <= 0) {
    alert('Keranjang kosong atau total 0');
    return;
  }

  const sudahBayar = pembayaranList.reduce((sum, p) => sum + p.jumlah, 0);
  const sisa = totalNetto - sudahBayar;

  if (sisa <= 0) {
    alert('Sudah lunas');
    return;
  }

  // QRIS selalu pas (tidak ada kembalian)
  pembayaranList.push({ metode: 'qris', jumlah: sisa });
  renderPembayaran();
};

window.hapusPembayaran = (index) => {
  pembayaranList.splice(index, 1);
  renderPembayaran();
};

function renderPembayaran() {
  const container = document.getElementById('pembayaran-list');
  const kembalianInfo = document.getElementById('kembalian-info');
  if (!container) return;

  const totalNetto = keranjang.reduce((sum, it) => sum + it.subtotal, 0) - parseInt(document.getElementById('input-diskon-nota')?.value || 0);
  const dibayar = pembayaranList.reduce((sum, p) => sum + p.jumlah, 0);
  const kembalian = Math.max(0, dibayar - totalNetto);

  if (pembayaranList.length > 0) {
    container.innerHTML = `
      <div style="background:#f9fafb; padding:8px; border-radius:4px; margin-top:8px;">
        ${pembayaranList.map((p, i) => `
          <div class="flex" style="justify-content:space-between; align-items:center; margin:4px 0;">
            <span style="font-weight:600;">${capitalize(p.metode)}</span>
            <span style="font-weight:700;">${formatRupiah(p.jumlah)}</span>
            <button onclick="window.hapusPembayaran(${i})" style="padding:2px 8px; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; cursor:pointer;">×</button>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    container.innerHTML = '';
  }

  // Tampilkan kembalian jika ada
  if (kembalian > 0) {
    kembalianInfo.style.display = 'block';
    document.getElementById('label-kembalian').textContent = formatRupiah(kembalian);
  } else {
    kembalianInfo.style.display = 'none';
  }

  hitungTotal();
}

function hitungTotal() {
  const subtotal = keranjang.reduce((sum, it) => sum + it.subtotal, 0);
  const diskonNota = parseInt(document.getElementById('input-diskon-nota')?.value || 0);
  const total = subtotal - diskonNota;
  const dibayar = pembayaranList.reduce((sum, p) => sum + p.jumlah, 0);

  document.getElementById('label-subtotal').textContent = formatRupiah(subtotal);
  document.getElementById('label-total').textContent = formatRupiah(total);
}

window.selesaiBayar = async () => {
  if (keranjang.length === 0) {
    alert('Keranjang kosong');
    return;
  }

  if (pembayaranList.length === 0) {
    alert('Pilih metode bayar (Tunai/QRIS)');
    return;
  }

  const diskonNota = parseInt(document.getElementById('input-diskon-nota').value || 0);
  const total = keranjang.reduce((sum, it) => sum + it.subtotal, 0) - diskonNota;
  const dibayar = pembayaranList.reduce((sum, p) => sum + p.jumlah, 0);

  if (dibayar < total) {
    alert(`Kurang bayar: ${formatRupiah(total - dibayar)}`);
    return;
  }

  try {
    const saleData = {
      shiftId: shiftAktif.id,
      items: keranjang,
      diskonNota,
      pembayaran: pembayaranList,
      kasir: shiftAktif.kasir
    };

    await simpanPenjualan(saleData);

    const { listPenjualan } = await import('../services/saleService.js');
    const sales = await listPenjualan({ shiftId: shiftAktif.id });
    const lastSale = sales[0];

    if (lastSale) {
      await cetakStruk(lastSale);
    }

    alert('Transaksi berhasil!');
    resetKeranjang();
  } catch (err) {
    alert('Gagal: ' + err.message);
  }
};

window.resetKeranjang = () => {
  keranjang = [];
  pembayaranList = [];
  document.getElementById('input-diskon-nota').value = '0';
  document.getElementById('input-search').value = '';
  renderProdukGrid();
  renderKeranjang();
  renderPembayaran();
};

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

window.initKasirUI = initKasirUI;
