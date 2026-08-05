// UI Kasir — Redesign: 2-tone Blue+Green, keyboard shortcuts
import { cariByBarcode, cariByNama, listProduk } from '../services/productService.js';
import { simpanPenjualan } from '../services/saleService.js';
import { getShiftTerbuka } from '../services/shiftService.js';
import { cetakStruk } from '../services/printService.js';

let keranjang = [];
let shiftAktif = null;
let produkList = [];
let inputMode = 'barcode'; // 'barcode' | 'produk'

export async function initKasirUI() {
  shiftAktif = await getShiftTerbuka();
  
  if (!shiftAktif) {
    renderGuardShift();
    return;
  }

  produkList = await listProduk({ aktif: true });
  await renderKasir();
  initShortcuts();
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
    <style>
      .shortcut-hint { 
        display: inline-block; 
        background: #e0f2fe; 
        color: #0369a1; 
        padding: 2px 6px; 
        border-radius: 3px; 
        font-size: 11px; 
        font-weight: 600; 
        margin-left: 6px;
      }
      /* Hide shortcuts hints on mobile/tablet (touch devices) */
      @media (hover: none) {
        .shortcut-hint { display: none; }
      }
      .tab-btn-mode { 
        padding: 10px 20px; 
        border: none; 
        background: #e0f2fe; 
        color: #0369a1; 
        font-weight: 600; 
        cursor: pointer; 
        border-radius: 6px 6px 0 0;
      }
      .tab-btn-mode.active { 
        background: #0284c7; 
        color: #fff; 
      }
    </style>

    <div style="display:grid; grid-template-columns:1fr 420px; gap:16px; height:calc(100vh - 120px); padding:0;">
      
      <!-- KIRI: PRODUK (LEBAR 60-70%) -->
      <div style="display:flex; flex-direction:column; gap:12px;">
        <!-- Search Produk -->
        <div style="background:#fff; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); overflow:hidden;">
          <div style="padding:12px; background:#0284c7;">
            <div style="font-size:14px; font-weight:600; color:#fff; margin-bottom:4px;">🔍 CARI PRODUK</div>
            <div style="font-size:11px; color:#bfdbfe;">Scan barcode atau ketik nama</div>
          </div>

          <div style="padding:12px;">
            <input 
              type="text" 
              id="input-search-produk" 
              placeholder="Scan / Ketik nama produk..." 
              style="width:100%; padding:12px; font-size:16px; border:2px solid #0284c7; border-radius:6px;" 
              autofocus>
            <div style="font-size:11px; color:#64748b; margin-top:6px;">
              <span class="shortcut-hint">F5</span> fokus input
            </div>
          </div>
        </div>

        <!-- Grid Produk (FULL HEIGHT) -->
        <div id="produk-panel" style="background:#fff; padding:12px; border-radius:8px; flex:1; overflow-y:auto; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size:13px; font-weight:600; color:#64748b; margin-bottom:8px;">PRODUK</div>
          <div id="produk-grid" style="display:grid; grid-template-columns:1fr; gap:6px;"></div>
        </div>

        <!-- Info Shift (bottom) -->
        <div style="background:#0284c7; color:#fff; padding:10px 12px; border-radius:6px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
          <span><strong>Shift:</strong> ${shiftAktif.kasir}</span>
          <button class="secondary" onclick="window.showRiwayatPenjualan()" style="padding:6px 12px; background:#fff; color:#0284c7; border:none; border-radius:4px; font-size:11px; cursor:pointer;">
            Riwayat <span style="font-size:10px; background:#0284c7; color:#fff; padding:2px 4px; border-radius:3px; margin-left:4px;">Ctrl+P</span>
          </button>
        </div>
      </div>

      <!-- KANAN: KERANJANG + PAYMENT STACK (420px) -->
      <div style="display:flex; flex-direction:column; gap:12px;">
        
        <!-- KERANJANG (flex:1 ambil space tersisa) -->
        <div style="background:#fff; padding:16px; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1); display:flex; flex-direction:column; flex:1; min-height:0;">
          <h2 style="margin:0 0 12px 0; padding-bottom:12px; border-bottom:2px solid #e2e8f0; color:#0f172a; font-size:16px;">DAFTAR ITEM</h2>

          <div id="keranjang-content" style="flex:1; overflow-y:auto; margin-bottom:12px;"></div>

          <div style="border-top:2px solid #e2e8f0; padding-top:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-size:13px; color:#64748b; font-weight:600;">Diskon</span>
              <input type="text" id="input-diskon-nota" value="0" style="width:130px; text-align:right; padding:8px; border:2px solid #cbd5e1; border-radius:6px; font-size:14px;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:baseline; padding:10px 0; border-top:1px solid #e2e8f0;">
              <span style="font-size:20px; font-weight:700; color:#64748b;">TOTAL</span>
              <span id="label-total" style="font-size:28px; font-weight:700; color:#0284c7;">Rp 0</span>
            </div>
          </div>
        </div>

        <!-- PAYMENT (fixed height, compact) -->
        <div style="background:#fff; padding:14px; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 10px 0; color:#0f172a; font-size:14px; font-weight:700;">PEMBAYARAN</h3>

          <!-- Input Tunai -->
          <div style="background:#f0fdf4; border:2px solid #10b981; border-radius:6px; padding:10px; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
              <span style="font-size:14px;">💵</span>
              <strong style="flex:1; font-size:12px;">TUNAI</strong>
              <span class="shortcut-hint" style="font-size:10px; padding:2px 4px;">Alt+T</span>
            </div>
            <div style="display:flex; gap:6px;">
              <input type="text" id="input-tunai" placeholder="0" style="flex:1; padding:10px; font-size:14px; font-weight:600; text-align:right; border:2px solid #10b981; border-radius:4px;" onkeypress="if(event.key==='Enter'){event.preventDefault();window.bayarTunai();}">
              <button onclick="window.bayarTunai()" style="padding:10px 14px; background:#10b981; color:#fff; border:none; border-radius:4px; cursor:pointer; white-space:nowrap; font-size:12px; font-weight:700;">OK</button>
            </div>
          </div>

          <!-- Tombol QRIS -->
          <button onclick="window.bayarQRIS()" style="width:100%; padding:12px; font-size:13px; font-weight:600; background:#0284c7; color:#fff; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:10px;">
            <span style="font-size:16px;">📱</span>
            <span>QRIS</span>
            <span class="shortcut-hint" style="background:#fff; color:#0284c7; font-size:10px; padding:2px 4px;">Alt+Q</span>
          </button>

          <!-- List Pembayaran -->
          <div id="pembayaran-list" style="margin-bottom:10px;"></div>

          <!-- Kembalian -->
          <div id="kembalian-info" style="padding:10px; background:#d1fae5; border-radius:4px; font-size:13px; font-weight:700; margin-bottom:10px; display:none;">
            Kembalian: <span id="label-kembalian" style="color:#047857;">Rp 0</span>
          </div>

          <!-- Tombol Bayar -->
          <button onclick="window.selesaiBayar()" style="width:100%; padding:16px; font-size:16px; font-weight:700; background:#10b981; color:#fff; border:none; border-radius:6px; cursor:pointer;">
            BAYAR <span class="shortcut-hint" style="background:#fff; color:#047857; font-size:10px; padding:2px 4px;">Ctrl+Z</span>
          </button>

          <button onclick="window.resetKeranjang()" style="width:100%; padding:10px; margin-top:8px; font-size:12px; background:#f1f5f9; color:#64748b; border:none; border-radius:4px; cursor:pointer;">
            Reset
          </button>
        </div>

      </div>
      
    </div>
  `;

  renderModeContent();
  renderKeranjang();

  // Format thousand separator untuk input angka
  const formatInputNumber = (input) => {
    input.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, ''); // hapus non-digit
      if (val === '') val = '0';
      e.target.value = parseInt(val).toLocaleString('id-ID');
    });
    input.addEventListener('focus', (e) => {
      // Hapus separator saat focus untuk kemudahan edit
      let val = e.target.value.replace(/\D/g, '');
      e.target.value = val === '0' ? '' : val;
    });
    input.addEventListener('blur', (e) => {
      // Tambah separator lagi saat blur
      let val = e.target.value.replace(/\D/g, '');
      if (val === '') val = '0';
      e.target.value = parseInt(val).toLocaleString('id-ID');
    });
  };

  formatInputNumber(document.getElementById('input-diskon-nota'));
  formatInputNumber(document.getElementById('input-tunai'));

  document.getElementById('input-diskon-nota').addEventListener('input', hitungTotal);
}

window.switchMode = (mode) => {
  // Legacy function - tidak dipakai lagi setelah merge
};

function renderModeContent() {
  // Search unified: barcode atau nama
  const inputSearch = document.getElementById('input-search-produk');
  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      renderProdukGrid(query);
    });

    inputSearch.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const query = inputSearch.value.trim();
        if (!query) return;

        // Coba cari by barcode dulu (exact match)
        const byBarcode = await cariByBarcode(query);
        if (byBarcode) {
          tambahKeKeranjang(byBarcode);
          inputSearch.value = '';
          renderProdukGrid();
          return;
        }

        // Kalau tidak ketemu barcode, cari by nama (fuzzy)
        const byNama = produkList.find(p => p.nama.toLowerCase().includes(query));
        if (byNama) {
          tambahKeKeranjang(byNama);
          inputSearch.value = '';
          renderProdukGrid();
        } else {
          alert('Produk tidak ditemukan');
        }
      }
    });
  }

  renderProdukGrid();
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

  grid.innerHTML = filtered.slice(0, 50).map(p => `
    <div onclick="window.tambahKeKeranjangById('${p.id}')" 
         style="padding:16px; border:2px solid #e2e8f0; border-radius:8px; cursor:pointer; background:#fff; transition:all 0.2s; margin-bottom:10px;"
         onmouseover="this.style.borderColor='#0284c7'; this.style.background='#f0f9ff'; this.style.transform='translateX(4px)';"
         onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='#fff'; this.style.transform='translateX(0)';">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <div style="flex:1; font-weight:700; font-size:16px; color:#0f172a; line-height:1.3;">${p.nama}</div>
        <div style="font-weight:700; font-size:18px; color:#0284c7; margin-left:16px; white-space:nowrap;">${formatRupiah(p.hargaJual)}</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:12px; color:#64748b; font-weight:500;">Stok: <span style="font-weight:700; color:${p.stok > 10 ? '#059669' : p.stok > 0 ? '#f59e0b' : '#dc2626'}">${p.stok}</span></div>
        ${p.barcode ? `<div style="font-size:11px; color:#94a3b8; font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:3px;">${p.barcode}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function tambahKeKeranjang(produk) {
  const existing = keranjang.find(it => it.produkId === produk.id);
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
}

window.tambahKeKeranjangById = (produkId) => {
  const produk = produkList.find(p => p.id === produkId);
  if (!produk) return;
  tambahKeKeranjang(produk);
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
    container.innerHTML = '<div style="text-align:center; padding:2rem; color:#94a3b8;">Keranjang kosong</div>';
  } else {
    // Table header + rows
    container.innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid #e2e8f0; text-align:left;">
            <th style="padding:8px 4px; color:#64748b; font-weight:600;">Item</th>
            <th style="padding:8px 4px; color:#64748b; font-weight:600; text-align:center; width:80px;">Qty</th>
            <th style="padding:8px 4px; color:#64748b; font-weight:600; text-align:right; width:100px;">Jumlah</th>
            <th style="padding:8px 4px; width:60px;"></th>
          </tr>
        </thead>
        <tbody>
          ${keranjang.map((it, i) => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:8px 4px;">
                <div style="font-weight:600; color:#0f172a; margin-bottom:2px;">${it.nama}</div>
                <div style="color:#64748b; font-size:11px;">${formatRupiah(it.hargaJualSnapshot)}</div>
              </td>
              <td style="padding:8px 4px; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
                  <button data-action="qty-minus" data-index="${i}" style="width:24px; height:24px; padding:0; background:#e2e8f0; border:none; border-radius:4px; cursor:pointer; font-weight:700; font-size:14px;">−</button>
                  <span style="font-weight:700; min-width:30px; text-align:center;">${it.qty}</span>
                  <button data-action="qty-plus" data-index="${i}" style="width:24px; height:24px; padding:0; background:#e2e8f0; border:none; border-radius:4px; cursor:pointer; font-weight:700; font-size:14px;">+</button>
                </div>
              </td>
              <td style="padding:8px 4px; text-align:right; font-weight:700; color:#0284c7;">${formatRupiah(it.subtotal)}</td>
              <td style="padding:8px 4px; text-align:center;">
                <button data-action="hapus" data-index="${i}" style="width:28px; height:28px; padding:0; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; cursor:pointer; font-weight:700; font-size:16px;" title="Hapus">×</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  hitungTotal();
}

// Event delegation untuk keranjang (fix onclick tidak jalan di innerHTML dynamic)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  
  const action = btn.dataset.action;
  const index = parseInt(btn.dataset.index);
  
  if (action === 'hapus') {
    window.hapusItem(index);
  } else if (action === 'qty-minus') {
    window.ubahQty(index, -1);
  } else if (action === 'qty-plus') {
    window.ubahQty(index, 1);
  }
});

let pembayaranList = [];

window.bayarTunai = () => {
  const inputTunai = document.getElementById('input-tunai');
  const nominal = parseInt(inputTunai.value.replace(/\D/g, '')); // parse dari formatted string

  if (isNaN(nominal) || nominal <= 0) {
    alert('Isi nominal tunai');
    inputTunai.focus();
    return;
  }

  const totalNetto = keranjang.reduce((sum, it) => sum + it.subtotal, 0) - parseInt(document.getElementById('input-diskon-nota')?.value.replace(/\D/g, '') || 0);
  
  if (totalNetto <= 0) {
    alert('Keranjang kosong atau total 0');
    return;
  }

  pembayaranList.push({ metode: 'tunai', jumlah: nominal });
  inputTunai.value = '0';
  inputTunai.focus();
  renderPembayaran();
};

window.bayarQRIS = () => {
  const totalNetto = keranjang.reduce((sum, it) => sum + it.subtotal, 0) - parseInt(document.getElementById('input-diskon-nota')?.value.replace(/\D/g, '') || 0);
  
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

  const totalNetto = keranjang.reduce((sum, it) => sum + it.subtotal, 0) - parseInt(document.getElementById('input-diskon-nota')?.value.replace(/\D/g, '') || 0);
  const dibayar = pembayaranList.reduce((sum, p) => sum + p.jumlah, 0);
  const kembalian = Math.max(0, dibayar - totalNetto);

  if (pembayaranList.length > 0) {
    container.innerHTML = `
      <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
        ${pembayaranList.map((p, i) => `
          <div class="flex" style="justify-content:space-between; align-items:center; margin:4px 0;">
            <span style="font-weight:600; color:#475569;">${capitalize(p.metode)}</span>
            <span style="font-weight:700; color:#0f172a;">${formatRupiah(p.jumlah)}</span>
            <button onclick="window.hapusPembayaran(${i})" style="padding:3px 8px; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; cursor:pointer; font-weight:700;">×</button>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    container.innerHTML = '';
  }

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
  const diskonNota = parseInt(document.getElementById('input-diskon-nota')?.value.replace(/\D/g, '') || 0);
  const total = subtotal - diskonNota;

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

  const diskonNota = parseInt(document.getElementById('input-diskon-nota').value.replace(/\D/g, '') || 0);
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

    // Hapus alert "Transaksi berhasil" — struk sudah bukti
    resetKeranjang();
  } catch (err) {
    alert('Gagal: ' + err.message);
  }
};

window.resetKeranjang = () => {
  keranjang = [];
  pembayaranList = [];
  const diskonInput = document.getElementById('input-diskon-nota');
  if (diskonInput) diskonInput.value = '0';
  if (inputMode === 'barcode') {
    const barcodeInput = document.getElementById('input-barcode');
    if (barcodeInput) {
      barcodeInput.value = '';
      barcodeInput.focus();
    }
  } else {
    const searchInput = document.getElementById('input-search');
    if (searchInput) searchInput.value = '';
    renderProdukGrid();
  }
  renderKeranjang();
  renderPembayaran();
};

// Keyboard Shortcuts
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    // F5 - Fokus input search produk
    if (e.key === 'F5') {
      e.preventDefault();
      document.getElementById('input-search-produk')?.focus();
    }
    
    // Ctrl+F - Cari produk
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      document.getElementById('input-search-produk')?.focus();
    }
    
    // Ctrl+P - Riwayat (reprint)
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      window.showRiwayatPenjualan();
    }
    
    // Ctrl+Z - Bayar
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      window.selesaiBayar();
    }
    
    // Alt+T - Fokus input tunai (tidak ganggu ketik produk)
    if (e.altKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      document.getElementById('input-tunai')?.focus();
    }
    
    // Alt+Q - Bayar QRIS pas (tidak ganggu ketik produk)
    if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      window.bayarQRIS();
    }
  });
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

window.initKasirUI = initKasirUI;
