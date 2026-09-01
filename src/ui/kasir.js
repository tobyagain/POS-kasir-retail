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
    <div style="max-width:480px; margin:3rem auto; text-align:center; padding:2rem; background:var(--danger-soft); border:1px solid #fca5a5; border-radius:var(--radius);">
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
      .produk-row-active {
        border-color: var(--accent) !important;
        background: var(--accent-soft) !important;
      }
      .cart-row-active {
        outline: 2px solid var(--accent);
        outline-offset: -2px;
      }
      .inline-error {
        background: var(--danger-soft); border: 1px solid #fca5a5; color: var(--danger);
        padding: 8px 10px; border-radius: 8px; font-size: 12px; font-weight: 600;
      }
      .kasir-zone {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
      }
      .produk-row {
        padding: 10px 12px;
        border: 1.5px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        background: var(--surface);
        transition: border-color 0.12s, background 0.12s;
        margin-bottom: 6px;
      }
      .produk-row:hover {
        border-color: var(--accent);
        background: var(--accent-soft);
      }
    </style>

    <div style="display:grid; grid-template-columns:1fr 400px; gap:12px; height:calc(100vh - 110px); padding:0;">

      <!-- KIRI: PRODUK -->
      <div style="display:flex; flex-direction:column; gap:10px; min-height:0;">

        <!-- Search bar -->
        <div class="kasir-zone" style="padding:12px;">
          <input
            type="text"
            id="input-search-produk"
            placeholder="Scan barcode atau ketik nama produk…"
            style="width:100%; padding:14px 16px; font-size:17px; border:2px solid var(--accent); border-radius:8px; font-weight:500;"
            autofocus>
          <div style="font-size:11px; color:var(--text-mute); margin-top:8px; display:flex; gap:12px; flex-wrap:wrap;">
            <span><span class="shortcut-hint">Ctrl+K</span> fokus</span>
            <span><span class="shortcut-hint">Enter</span> tambah</span>
            <span><span class="shortcut-hint">↑↓</span> pilih</span>
            <span><span class="shortcut-hint">Esc</span> bersih</span>
          </div>
        </div>

        <!-- Grid Produk -->
        <div id="produk-panel" class="kasir-zone" style="padding:12px; flex:1; overflow-y:auto; min-height:0;">
          <div id="produk-grid" style="display:grid; grid-template-columns:1fr; gap:0;"></div>
        </div>

        <!-- Info Shift -->
        <div class="kasir-zone" style="padding:10px 14px; font-size:12px; display:flex; justify-content:space-between; align-items:center; color:var(--text-soft);">
          <span>Shift: <strong style="color:var(--text);">${shiftAktif.kasir}</strong></span>
          <button class="secondary" data-action="riwayat" style="padding:6px 12px; font-size:12px;">
            Riwayat <span class="shortcut-hint">Ctrl+H</span>
          </button>
        </div>
      </div>

      <!-- KANAN: KERANJANG + PEMBAYARAN -->
      <div style="display:flex; flex-direction:column; gap:10px; min-height:0;">

        <!-- KERANJANG -->
        <div class="kasir-zone" style="padding:14px; display:flex; flex-direction:column; flex:1; min-height:0;">
          <div style="font-size:12px; font-weight:700; color:var(--text-mute); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">Item</div>

          <div id="keranjang-content" style="flex:1; overflow-y:auto; margin-bottom:10px; min-height:0;"></div>

          <div style="border-top:1.5px solid var(--border); padding-top:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:13px; color:var(--text-soft); font-weight:600;">Diskon <span class="shortcut-hint">F7</span></span>
              <input type="text" id="input-diskon-nota" value="0" style="width:130px; text-align:right; padding:8px 10px; font-size:14px;">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:baseline; padding:8px 0 2px 0;">
              <span style="font-size:14px; font-weight:600; color:var(--text-soft);">TOTAL</span>
              <span id="label-total" style="font-size:32px; font-weight:800; color:var(--accent); letter-spacing:-0.02em;">Rp 0</span>
            </div>
          </div>
        </div>

        <!-- PEMBAYARAN -->
        <div class="kasir-zone" style="padding:14px;">
          <div style="font-size:12px; font-weight:700; color:var(--text-mute); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">Pembayaran</div>

          <div id="payment-error" style="display:none; margin-bottom:10px;" class="inline-error"></div>

          <div style="display:flex; gap:8px; margin-bottom:8px;">
            <div style="flex:1; position:relative;">
              <input type="text" id="input-tunai" placeholder="Tunai (F8)" style="width:100%; padding:12px 14px; font-size:16px; font-weight:700; text-align:right; border:2px solid var(--ok); border-radius:8px;">
            </div>
            <button data-action="bayar-tunai" style="padding:12px 18px; background:var(--ok); color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:700;">+ Tunai</button>
          </div>

          <button data-action="bayar-qris" style="width:100%; padding:12px; font-size:14px; font-weight:600; background:var(--surface); color:var(--accent-text); border:1.5px solid var(--accent); border-radius:8px; cursor:pointer; margin-bottom:10px;">
            QRIS sisa tagihan <span class="shortcut-hint">Alt+Q</span>
          </button>

          <div id="pembayaran-list" style="margin-bottom:8px;"></div>

          <div id="kembalian-info" style="padding:10px 12px; background:var(--ok-soft); border-radius:8px; font-size:14px; font-weight:700; margin-bottom:10px; display:none; color:#047857;">
            Kembalian: <span id="label-kembalian">Rp 0</span>
          </div>

          <div id="after-sale-actions" style="display:none; margin-bottom:10px;">
            <button data-action="cetak-ulang" style="width:100%; padding:10px; background:var(--warn); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:13px;">
              ⚠ Cetak Ulang Struk
            </button>
          </div>

          <button data-action="selesai-bayar" id="btn-bayar" style="width:100%; padding:16px; font-size:17px; font-weight:800; background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; letter-spacing:0.02em;">
            BAYAR <span class="shortcut-hint" style="background:rgba(255,255,255,0.2); color:#fff; border-color:transparent;">Ctrl+Enter</span>
          </button>

          <button data-action="reset-keranjang" style="width:100%; padding:9px; margin-top:8px; font-size:12px; background:transparent; color:var(--text-mute); border:1px solid var(--border); border-radius:8px; cursor:pointer;">
            Transaksi Baru <span class="shortcut-hint">Ctrl+B</span>
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

// Render grid produk — filter by query (lowercase), max 50 item
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
    <div data-action="produk-row" data-produk-id="${p.id}" class="produk-row">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
        <div style="flex:1; font-weight:600; font-size:14px; color:var(--text); line-height:1.3;">${p.nama}</div>
        <div style="font-weight:700; font-size:15px; color:var(--accent); margin-left:12px; white-space:nowrap;">${formatRupiah(p.hargaJual)}</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:11px; color:var(--text-mute);">Stok: <span style="font-weight:700; color:${p.stok > 10 ? 'var(--ok)' : p.stok > 0 ? 'var(--warn)' : 'var(--danger)'}">${p.stok}</span></div>
        ${p.barcode ? `<div style="font-size:10px; color:var(--text-mute); font-family:monospace; background:var(--surface-2); padding:2px 6px; border-radius:4px;">${p.barcode}</div>` : ''}
      </div>
    </div>
  `).join('');
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
    container.innerHTML = '<div style="text-align:center; padding:2.5rem 1rem; color:var(--text-mute); font-size:13px;">Keranjang kosong — scan produk untuk mulai</div>';
  } else {
    container.innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:0; background:transparent;">
        <thead>
          <tr style="border-bottom:1.5px solid var(--border); text-align:left;">
            <th style="padding:6px 4px; background:transparent;">Item</th>
            <th style="padding:6px 4px; text-align:center; width:84px; background:transparent;">Qty</th>
            <th style="padding:6px 4px; text-align:right; width:100px; background:transparent;">Jumlah</th>
            <th style="padding:6px 4px; width:34px; background:transparent;"></th>
          </tr>
        </thead>
        <tbody>
          ${keranjang.map((it, i) => `
            <tr data-cart-row="${i}" class="${i === activeCartIndex ? 'cart-row-active' : ''}" style="border-bottom:1px solid var(--border);">
              <td style="padding:8px 4px;">
                <div style="font-weight:600; color:var(--text); margin-bottom:3px; font-size:13px;">${it.nama}</div>
                <input type="text" inputmode="numeric" data-harga-index="${i}" value="${it.hargaJualSnapshot.toLocaleString('id-ID')}" aria-label="Harga ${it.nama}" style="width:110px; padding:4px 8px; text-align:right; font-size:12px; color:var(--text-soft);">
              </td>
              <td style="padding:8px 4px; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
                  <button data-action="qty-minus" data-index="${i}" style="width:26px; height:26px; padding:0; background:var(--surface-2); border:1px solid var(--border); border-radius:6px; cursor:pointer; font-weight:700; font-size:15px; color:var(--text-soft);">−</button>
                  <span style="font-weight:700; min-width:28px; text-align:center; font-size:14px;">${it.qty}</span>
                  <button data-action="qty-plus" data-index="${i}" style="width:26px; height:26px; padding:0; background:var(--surface-2); border:1px solid var(--border); border-radius:6px; cursor:pointer; font-weight:700; font-size:15px; color:var(--text-soft);">+</button>
                </div>
              </td>
              <td data-total-item style="padding:8px 4px; text-align:right; font-weight:700; color:var(--accent); font-size:14px;">${formatRupiah(it.subtotal)}</td>
              <td style="padding:8px 4px; text-align:center;">
                <button data-action="hapus-item" data-index="${i}" style="width:26px; height:26px; padding:0; background:var(--danger-soft); color:var(--danger); border:none; border-radius:6px; cursor:pointer; font-weight:700; font-size:15px;" title="Hapus (Delete)">×</button>
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
      <div style="background:var(--surface-2); padding:8px 12px; border-radius:8px; border:1px solid var(--border);">
        ${pembayaranList.map((p, i) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
            <span style="font-weight:600; color:var(--text-soft); font-size:13px;">${capitalize(p.metode)}</span>
            <span style="font-weight:700; color:var(--text); font-size:13px;">${formatRupiah(p.jumlah)}</span>
            <button data-action="hapus-pembayaran" data-index="${i}" style="padding:2px 8px; background:var(--danger-soft); color:var(--danger); border:none; border-radius:5px; cursor:pointer; font-weight:700; font-size:13px;">×</button>
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

  registerShortcut('ctrl+b', () => resetKeranjang(), { tab: T, allowInInput: true });

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
