// UI Kasir — Redesign: 2-tone Blue+Green, keyboard shortcuts (PRD-POS-KEYBOARD-FLOW)
import { cariByBarcode, listProduk } from '../services/productService.js';
import { simpanPenjualan, listPenjualan } from '../services/saleService.js';
import { getShiftTerbuka } from '../services/shiftService.js';
import { cetakStruk } from '../services/printService.js';
import { bindNumericInput, readNumericInput } from './numeric-input.js';
import { registerShortcut, focusElement } from './keyboardShortcuts.js';
import { validateCheckout, hitungKembalianTunai } from '../core/checkout.js';

let keranjang = [];
let shiftAktif = null;
let produkList = [];
let selectedResultIndex = -1;
let activeCartIndex = -1;
let lastSaleId = null;
let kasirRendered = false; // tandai DOM kasir sudah pernah dirender untuk shift aktif ini

export async function initKasirUI() {
  const shiftTerbaru = await getShiftTerbuka();

  if (!shiftTerbaru) {
    kasirRendered = false;
    shiftAktif = null;
    renderGuardShift();
    return;
  }

  // Shift berganti (tutup/buka baru) atau keranjang belum pernah dirender untuk shift ini
  const shiftSama = shiftAktif && shiftAktif.id === shiftTerbaru.id;
  if (!shiftSama) {
    keranjang = [];
    shiftAktif = shiftTerbaru;
  }

  produkList = await listProduk({ aktif: true });

  if (kasirRendered && document.getElementById('input-search-produk')) {
    // DOM masih utuh: cukup re-bind listener yang hilang (kalau ada) & re-render tampilan
    // supaya keranjang yang sudah ada kembali terlihat tanpa reset state.
    rebindIfDetached();
    renderProdukGrid();
    renderKeranjang();
    renderPembayaran();
    const search = document.getElementById('input-search-produk');
    if (search) { search.focus(); }
  } else {
    await renderKasir();
    kasirRendered = true;
  }

  initKasirShortcuts();
}

// Deteksi listener click utama kasir masih menempel di panel.
// Listener di-bind di bindKasirEvents() saat render; tidak ikut hilang oleh innerHTML
// kecuali panel-nya dibuang (mis. tampilan Riwayat mengganti innerHTML container).
// Untuk amannya kita re-bind saja (listener click delegation tertimpa di panel yang sama).
let kasirPanelEl = null;
function rebindIfDetached() {
  const panel = document.querySelector('[data-panel="kasir"]');
  if (panel !== kasirPanelEl) {
    kasirPanelEl = panel;
    bindKasirEvents();
    rebindNumeric();
  }
}

function rebindNumeric() {
  bindNumericInput(document.getElementById('input-diskon-nota'));
  bindNumericInput(document.getElementById('input-tunai'));
}

function renderGuardShift() {
  const container = document.querySelector('[data-panel="kasir"]');
  container.innerHTML = `
    <div style="max-width:500px; margin:2rem auto; text-align:center; padding:2rem; background:#fef2f2; border:1px solid #fca5a5; border-radius:8px;">
      <h2 class="text-red">⚠ Tidak Ada Shift Terbuka</h2>
      <p class="mt-1 text-gray">Buka shift dulu di tab <strong>Shift</strong> sebelum jualan.</p>
      <button class="primary mt-2" data-action="goto-shift">Ke Tab Shift</button>
    </div>
  `;
}

async function renderKasir() {
  const container = document.querySelector('[data-panel="kasir"]');
  container.innerHTML = `
    <style>
      .shortcut-hint {
        display: inline-block;
        background: #e0f2fe;
        color: #0284c7;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 6px;
      }
      @media (hover: none) {
        .shortcut-hint { display: none; }
      }
      .produk-row-active {
        border-color: #0284c7 !important;
        background: #f0f9ff !important;
      }
      .cart-row-active {
        outline: 2px solid #0284c7;
        outline-offset: -2px;
      }
      .inline-error {
        background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626;
        padding: 8px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;
      }
    </style>

    <div style="display:grid; grid-template-columns:1fr 420px; gap:16px; height:calc(100vh - 120px); padding:0;">

      <!-- KIRI: PRODUK -->
      <div style="display:flex; flex-direction:column; gap:12px;">
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
              <span class="shortcut-hint">Ctrl+K</span> fokus
              <span class="shortcut-hint">Enter</span> tambah
              <span class="shortcut-hint">↑↓</span> pilih
            </div>
          </div>
        </div>

        <div id="produk-panel" style="background:#fff; padding:12px; border-radius:8px; flex:1; overflow-y:auto; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size:13px; font-weight:600; color:#64748b; margin-bottom:8px;">PRODUK</div>
          <div id="produk-grid" style="display:grid; grid-template-columns:1fr; gap:6px;"></div>
        </div>

        <div style="background:#0284c7; color:#fff; padding:10px 12px; border-radius:6px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
          <span><strong>Shift:</strong> ${shiftAktif.kasir}</span>
          <button class="secondary" data-action="riwayat" style="padding:6px 12px; background:#fff; color:#0284c7; border:none; border-radius:4px; font-size:11px; cursor:pointer;">
            Riwayat <span class="shortcut-hint">Ctrl+H</span>
          </button>
        </div>
      </div>

      <!-- KANAN: KERANJANG + PEMBAYARAN -->
      <div style="display:flex; flex-direction:column; gap:12px;">

        <!-- KERANJANG -->
        <div style="background:#fff; padding:16px; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1); display:flex; flex-direction:column; flex:1; min-height:0;">
          <h2 style="margin:0 0 12px 0; padding-bottom:12px; border-bottom:2px solid #e2e8f0; color:#0f172a; font-size:16px;">DAFTAR ITEM</h2>

          <div id="keranjang-content" style="flex:1; overflow-y:auto; margin-bottom:12px;"></div>

          <div style="border-top:2px solid #e2e8f0; padding-top:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-size:13px; color:#64748b; font-weight:600;">Diskon <span class="shortcut-hint">F7</span></span>
              <input type="text" id="input-diskon-nota" value="0" style="width:130px; text-align:right; padding:8px; border:2px solid #cbd5e1; border-radius:6px; font-size:14px;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:baseline; padding:10px 0; border-top:1px solid #e2e8f0;">
              <span style="font-size:20px; font-weight:700; color:#64748b;">TOTAL</span>
              <span id="label-total" style="font-size:28px; font-weight:700; color:#0284c7;">Rp 0</span>
            </div>
          </div>
        </div>

        <!-- PEMBAYARAN -->
        <div style="background:#fff; padding:14px; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 10px 0; color:#0f172a; font-size:14px; font-weight:700;">PEMBAYARAN</h3>

          <div id="payment-error" style="display:none;" class="inline-error"></div>

          <div style="background:#f0fdf4; border:2px solid #10b981; border-radius:6px; padding:10px; margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
              <span style="font-size:14px;">💵</span>
              <strong style="flex:1; font-size:12px;">TUNAI</strong>
              <span class="shortcut-hint" style="font-size:10px; padding:2px 4px;">F8</span>
            </div>
            <div style="display:flex; gap:6px;">
              <input type="text" id="input-tunai" placeholder="0" style="flex:1; padding:10px; font-size:14px; font-weight:600; text-align:right; border:2px solid #10b981; border-radius:4px;">
              <button data-action="bayar-tunai" style="padding:10px 14px; background:#10b981; color:#fff; border:none; border-radius:4px; cursor:pointer; white-space:nowrap; font-size:12px; font-weight:700;">OK</button>
            </div>
          </div>

          <button data-action="bayar-qris" style="width:100%; padding:12px; font-size:13px; font-weight:600; background:#0284c7; color:#fff; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:10px;">
            <span style="font-size:16px;">📱</span>
            <span>QRIS sisa</span>
            <span class="shortcut-hint" style="background:#fff; color:#0284c7; font-size:10px; padding:2px 4px;">Alt+Q</span>
          </button>

          <div id="pembayaran-list" style="margin-bottom:10px;"></div>

          <div id="kembalian-info" style="padding:10px; background:#d1fae5; border-radius:4px; font-size:13px; font-weight:700; margin-bottom:10px; display:none;">
            Kembalian: <span id="label-kembalian" style="color:#047857;">Rp 0</span>
          </div>

          <div id="after-sale-actions" style="display:none; margin-bottom:10px;">
            <button data-action="cetak-ulang" style="width:100%; padding:10px; background:#f59e0b; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:700; font-size:13px;">
              ⚠ Cetak Ulang Struk
            </button>
          </div>

          <button data-action="selesai-bayar" id="btn-bayar" style="width:100%; padding:16px; font-size:16px; font-weight:700; background:#10b981; color:#fff; border:none; border-radius:6px; cursor:pointer;">
            BAYAR <span class="shortcut-hint" style="background:#fff; color:#047857; font-size:10px; padding:2px 4px;">Ctrl+Enter</span>
          </button>

          <button data-action="reset-keranjang" style="width:100%; padding:10px; margin-top:8px; font-size:12px; background:#f1f5f9; color:#64748b; border:none; border-radius:4px; cursor:pointer;">
            Transaksi Baru <span class="shortcut-hint" style="font-size:10px;">Ctrl+N</span>
          </button>
        </div>

      </div>

    </div>
  `;

  bindKasirEvents();
  kasirPanelEl = document.querySelector('[data-panel="kasir"]');
  renderProdukGrid();
  renderKeranjang();

  rebindNumeric();
  document.getElementById('input-diskon-nota').addEventListener('input', hitungTotal);
}

function bindKasirEvents() {
  const panel = document.querySelector('[data-panel="kasir"]');

  // Event delegation semua tombol data-action
  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const index = btn.dataset.index !== undefined ? parseInt(btn.dataset.index) : null;

    if (action === 'goto-shift') document.querySelector('[data-tab="shift"]').click();
    if (action === 'riwayat') window.showRiwayatPenjualan();
    if (action === 'bayar-tunai') bayarTunai();
    if (action === 'bayar-qris') bayarQRIS();
    if (action === 'selesai-bayar') selesaiBayar();
    if (action === 'reset-keranjang') resetKeranjang();
    if (action === 'cetak-ulang') cetakUlang();
    if (action === 'hapus-pembayaran') hapusPembayaran(index);
    if (action === 'hapus-item') hapusItem(index);
    if (action === 'qty-minus') ubahQty(index, -1);
    if (action === 'qty-plus') ubahQty(index, 1);
    if (action === 'produk-row') {
      const produk = produkList.find(p => p.id === btn.dataset.produkId);
      if (produk) tambahKeKeranjangDanRefocus(produk);
    }
  });

  // Search input
  const inputSearch = document.getElementById('input-search-produk');
  inputSearch.addEventListener('input', () => {
    selectedResultIndex = -1;
    renderProdukGrid(inputSearch.value.trim().toLowerCase());
  });

  inputSearch.addEventListener('keydown', async (e) => {
    const query = inputSearch.value.trim();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveResultSelection(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveResultSelection(-1);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      inputSearch.value = '';
      selectedResultIndex = -1;
      renderProdukGrid();
      return;
    }
    if (e.key !== 'Enter' || !query) return;

    e.preventDefault();

    // 1. Pilihan arrow aktif?
    const rows = currentResultRows();
    if (selectedResultIndex >= 0 && rows[selectedResultIndex]) {
      const produk = produkList.find(p => p.id === rows[selectedResultIndex].dataset.produkId);
      if (produk) { tambahKeKeranjangDanRefocus(produk); return; }
    }

    // 2. Barcode exact match
    const byBarcode = await cariByBarcode(query);
    if (byBarcode) { tambahKeKeranjangDanRefocus(byBarcode); return; }

    // 3. Nama fuzzy, produk pertama
    const q = query.toLowerCase();
    const byNama = produkList.find(p =>
      p.nama.toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q)
    );
    if (byNama) { tambahKeKeranjangDanRefocus(byNama); return; }

    showInlineError('Produk tidak ditemukan', 'search');
  });

  // Enter di nominal tunai → tambah pembayaran
  document.getElementById('input-tunai').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      bayarTunai();
    }
  });
}

function currentResultRows() {
  return Array.from(document.querySelectorAll('#produk-grid [data-action="produk-row"]'));
}

function moveResultSelection(delta) {
  const rows = currentResultRows();
  if (rows.length === 0) return;
  selectedResultIndex = (selectedResultIndex + delta + rows.length) % rows.length;
  rows.forEach((r, i) => r.classList.toggle('produk-row-active', i === selectedResultIndex));
  rows[selectedResultIndex].scrollIntoView({ block: 'nearest' });
}

function tambahKeKeranjangDanRefocus(produk) {
  tambahKeKeranjang(produk);
  const inputSearch = document.getElementById('input-search-produk');
  inputSearch.value = '';
  selectedResultIndex = -1;
  renderProdukGrid();
  inputSearch.focus();
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
  activeCartIndex = keranjang.length - 1;
  clearInlineError();
  renderKeranjang();
}

function ubahQty(index, delta) {
  const it = keranjang[index];
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) {
    keranjang.splice(index, 1);
  } else {
    it.subtotal = it.qty * it.hargaJualSnapshot - it.diskonItem;
  }
  renderKeranjang();
}

function hapusItem(index) {
  if (!keranjang[index]) return;
  keranjang.splice(index, 1);
  if (activeCartIndex >= keranjang.length) activeCartIndex = keranjang.length - 1;
  renderKeranjang();
}

function renderKeranjang() {
  const container = document.getElementById('keranjang-content');
  if (!container) return;

  if (keranjang.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:2rem; color:#94a3b8;">Keranjang kosong</div>';
  } else {
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
            <tr data-cart-row="${i}" class="${i === activeCartIndex ? 'cart-row-active' : ''}" style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:8px 4px;">
                <div style="font-weight:600; color:#0f172a; margin-bottom:2px;">${it.nama}</div>
                <input type="text" inputmode="numeric" data-harga-index="${i}" value="${it.hargaJualSnapshot.toLocaleString('id-ID')}" aria-label="Harga ${it.nama}" style="width:110px; padding:4px 6px; text-align:right; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; color:#64748b;">
              </td>
              <td style="padding:8px 4px; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
                  <button data-action="qty-minus" data-index="${i}" style="width:24px; height:24px; padding:0; background:#e2e8f0; border:none; border-radius:4px; cursor:pointer; font-weight:700; font-size:14px;">−</button>
                  <span style="font-weight:700; min-width:30px; text-align:center;">${it.qty}</span>
                  <button data-action="qty-plus" data-index="${i}" style="width:24px; height:24px; padding:0; background:#e2e8f0; border:none; border-radius:4px; cursor:pointer; font-weight:700; font-size:14px;">+</button>
                </div>
              </td>
              <td data-total-item style="padding:8px 4px; text-align:right; font-weight:700; color:#0284c7;">${formatRupiah(it.subtotal)}</td>
              <td style="padding:8px 4px; text-align:center;">
                <button data-action="hapus-item" data-index="${i}" style="width:28px; height:28px; padding:0; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; cursor:pointer; font-weight:700; font-size:16px;" title="Hapus (Delete)">×</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  container.querySelectorAll('[data-harga-index]').forEach(input => {
    bindNumericInput(input);
    const applyHarga = () => {
      const index = Number(input.dataset.hargaIndex);
      const harga = readNumericInput(input);
      if (!Number.isSafeInteger(harga) || harga < 0) return;
      const item = keranjang[index];
      if (!item) return;
      item.hargaJualSnapshot = harga;
      item.subtotal = item.qty * harga - item.diskonItem;
      const totalCell = input.closest('tr').querySelector('[data-total-item]');
      if (totalCell) totalCell.textContent = formatRupiah(item.subtotal);
      hitungTotal();
    };
    input.addEventListener('input', applyHarga);
    input.addEventListener('focus', () => { setActiveCartRow(Number(input.dataset.hargaIndex)); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyHarga();
        // lanjut ke qty control item yang sama
        const row = input.closest('tr');
        row.querySelector('[data-action="qty-plus"]')?.focus();
      }
    });
  });

  hitungTotal();
}

function setActiveCartRow(i) {
  activeCartIndex = i;
  document.querySelectorAll('[data-cart-row]').forEach(r =>
    r.classList.toggle('cart-row-active', Number(r.dataset.cartRow) === i)
  );
}

// Pembayaran
let pembayaranList = [];
let paymentInProgress = false;

function showInlineError(msg, where = 'payment') {
  clearInlineError();
  if (where === 'payment') {
    const el = document.getElementById('payment-error');
    el.textContent = '⚠ ' + msg;
    el.style.display = 'block';
  } else {
    // search error → pin di atas grid
    const grid = document.getElementById('produk-grid');
    const warn = document.createElement('div');
    warn.id = 'search-error';
    warn.className = 'inline-error';
    warn.style.marginBottom = '8px';
    warn.textContent = '⚠ ' + msg;
    grid.prepend(warn);
  }
}

function clearInlineError() {
  const p = document.getElementById('payment-error');
  if (p) { p.style.display = 'none'; p.textContent = ''; }
  document.getElementById('search-error')?.remove();
}

function bayarTunai() {
  const inputTunai = document.getElementById('input-tunai');
  const nominal = readNumericInput(inputTunai);

  if (!Number.isSafeInteger(nominal) || nominal <= 0) {
    showInlineError('Isi nominal tunai');
    focusElement('#input-tunai');
    return;
  }

  const totalNetto = hitungTotalNetto();
  if (totalNetto <= 0) {
    showInlineError('Keranjang kosong atau total 0');
    focusElement('#input-search-produk');
    return;
  }

  pembayaranList.push({ metode: 'tunai', jumlah: nominal });
  inputTunai.value = '0';
  clearInlineError();
  inputTunai.focus();
  renderPembayaran();
}

function bayarQRIS() {
  const totalNetto = hitungTotalNetto();
  if (totalNetto <= 0) {
    showInlineError('Keranjang kosong atau total 0');
    return;
  }
  const sisa = totalNetto - pembayaranList.reduce((s, p) => s + p.jumlah, 0);
  if (sisa <= 0) {
    showInlineError('Sudah lunas');
    return;
  }
  pembayaranList.push({ metode: 'qris', jumlah: sisa });
  clearInlineError();
  renderPembayaran();
}

function hapusPembayaran(index) {
  pembayaranList.splice(index, 1);
  renderPembayaran();
}

function renderPembayaran() {
  const container = document.getElementById('pembayaran-list');
  const kembalianInfo = document.getElementById('kembalian-info');
  if (!container) return;

  const totalNetto = hitungTotalNetto();
  const dibayar = pembayaranList.reduce((sum, p) => sum + p.jumlah, 0);
  const kembalian = hitungKembalian(dibayar, totalNetto, pembayaranList);

  if (pembayaranList.length > 0) {
    container.innerHTML = `
      <div style="background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
        ${pembayaranList.map((p, i) => `
          <div style="display:flex; justify-content:space-between; align-items:center; margin:4px 0;">
            <span style="font-weight:600; color:#475569;">${capitalize(p.metode)}</span>
            <span style="font-weight:700; color:#0f172a;">${formatRupiah(p.jumlah)}</span>
            <button data-action="hapus-pembayaran" data-index="${i}" style="padding:3px 8px; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; cursor:pointer; font-weight:700;">×</button>
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

// Kembalian hanya dari kelebihan uang tunai (QRIS pas, tidak dihitung)
function hitungKembalian(dibayar, totalNetto, list) {
  return hitungKembalianTunai(list, totalNetto);
}

function hitungTotalNetto() {
  const subtotal = keranjang.reduce((sum, it) => sum + it.subtotal, 0);
  const diskonEl = document.getElementById('input-diskon-nota');
  const diskon = diskonEl ? readNumericInput(diskonEl) || 0 : 0;
  return Math.max(0, subtotal - diskon);
}

function hitungTotal() {
  const el = document.getElementById('label-total');
  if (el) el.textContent = formatRupiah(hitungTotalNetto());
}

// Validasi sebelum simpan — dari core agar bisa dites tanpa DOM
async function selesaiBayar() {
  if (paymentInProgress) return;

  const diskonEl = document.getElementById('input-diskon-nota');
  const diskonNota = diskonEl ? readNumericInput(diskonEl) || 0 : 0;
  const total = hitungTotalNetto();

  const v = validateCheckout(keranjang, pembayaranList, total);
  if (!v.ok) {
    if (v.reason === 'keranjang-kosong') { showInlineError('Keranjang kosong'); focusElement('#input-search-produk'); }
    else if (v.reason === 'belum-bayar') { showInlineError('Belum ada pembayaran — isi tunai atau QRIS'); focusElement('#input-tunai'); }
    else if (v.reason === 'kurang-bayar') { showInlineError(`Kurang bayar ${formatRupiah(v.kurang)}`); focusElement('#input-tunai'); }
    return;
  }

  paymentInProgress = true;
  setBtnBayarDisabled(true);
  try {
    await simpanPenjualan({
      shiftId: shiftAktif.id,
      items: keranjang,
      diskonNota,
      pembayaran: pembayaranList,
      kasir: shiftAktif.kasir
    });

    const sales = await listPenjualan({ shiftId: shiftAktif.id });
    lastSaleId = sales[0]?.id || null;

    // Cetak. Gagal cetak TIDAK membatalkan transaksi; tawarkan cetak ulang.
    let cetakGagal = false;
    if (lastSaleId) {
      try {
        await cetakStruk(sales[0]);
      } catch (err) {
        console.error('Cetak gagal:', err);
        cetakGagal = true;
      }
    }

    resetKeranjang();
    if (cetakGagal) {
      document.getElementById('after-sale-actions').style.display = 'block';
      showInlineError('Transaksi tersimpan, tapi cetak gagal. Gunakan Cetak Ulang.');
    }
  } catch (err) {
    showInlineError('Gagal simpan: ' + err.message);
  } finally {
    paymentInProgress = false;
    setBtnBayarDisabled(false);
  }
}

function setBtnBayarDisabled(v) {
  const btn = document.getElementById('btn-bayar');
  if (btn) { btn.disabled = v; btn.style.opacity = v ? '0.5' : '1'; }
}

async function cetakUlang() {
  if (!lastSaleId) return;
  try {
    const { getPenjualan } = await import('../services/saleService.js');
    const sale = await getPenjualan(lastSaleId);
    if (sale) {
      await cetakStruk(sale);
      document.getElementById('after-sale-actions').style.display = 'none';
      clearInlineError();
    }
  } catch (err) {
    showInlineError('Cetak ulang gagal: ' + err.message);
  }
}

function resetKeranjang() {
  keranjang = [];
  pembayaranList = [];
  activeCartIndex = -1;
  const diskonInput = document.getElementById('input-diskon-nota');
  if (diskonInput) diskonInput.value = '0';
  const searchInput = document.getElementById('input-search-produk');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  clearInlineError();
  renderProdukGrid();
  renderKeranjang();
  renderPembayaran();
}

// Shortcut lokal kasir — didaftarkan sekali, difilter per tab
let kasirShortcutReady = false;
function initKasirShortcuts() {
  if (kasirShortcutReady) return;
  kasirShortcutReady = true;
  const T = 'kasir';

  registerShortcut('f6', () => {
    if (keranjang.length === 0) { showInlineError('Keranjang kosong'); return false; }
    const i = Math.max(0, keranjang.length - 1);
    setActiveCartRow(i);
    focusElement(`[data-harga-index="${i}"]`);
  }, { tab: T, allowInInput: true });

  registerShortcut('alt+arrowleft', () => {
    if (activeCartIndex >= 0) ubahQty(activeCartIndex, -1);
  }, { tab: T, allowInInput: true });

  registerShortcut('alt+arrowright', () => {
    if (activeCartIndex >= 0) ubahQty(activeCartIndex, 1);
  }, { tab: T, allowInInput: true });

  registerShortcut('delete', () => {
    if (activeCartIndex >= 0 && keranjang[activeCartIndex]) hapusItem(activeCartIndex);
  }, { tab: T });

  registerShortcut('f7', () => focusElement('#input-diskon-nota'), { tab: T, allowInInput: true });
  registerShortcut('f8', () => focusElement('#input-tunai'), { tab: T, allowInInput: true });

  registerShortcut('alt+q', () => bayarQRIS(), { tab: T, allowInInput: true });

  registerShortcut('alt+backspace', () => {
    if (pembayaranList.length > 0) hapusPembayaran(pembayaranList.length - 1);
  }, { tab: T, allowInInput: true });

  registerShortcut('ctrl+enter', () => selesaiBayar(), { tab: T, allowInInput: true });

  registerShortcut('ctrl+n', () => resetKeranjang(), { tab: T, allowInInput: true });

  registerShortcut('ctrl+h', () => window.showRiwayatPenjualan(), { tab: T, allowInInput: true });

  registerShortcut('escape', (e) => {
    // Kalau fokus di luar search: kembalikan ke search. Di search: bersihkan.
    const search = document.getElementById('input-search-produk');
    if (document.activeElement === search) return false; // biar handler input yang urus
    clearInlineError();
    focusElement('#input-search-produk');
  }, { tab: T });
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Stub lama yang masih direferensikan riwayat-penjualan.js dkk — aman dihapus setelah cek.
window.initKasirUI = initKasirUI;
