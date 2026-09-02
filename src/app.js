// Bootstrap — init DB, routing, load UI modules
import { openDB } from './data/db.js';
import { initKasirUI } from './ui/kasir.js';
import './ui/riwayat-penjualan.js'; // expose window.showRiwayatPenjualan
import { initProdukUI } from './ui/produk.js';
import { initBarangMasukUI } from './ui/barang-masuk.js';
import { initStokUI } from './ui/stok.js';
import { initShiftUI } from './ui/shift.js';
import { initKasUI } from './ui/kas.js';
import { initLaporanUI } from './ui/laporan.js';
import { initPengaturanUI } from './ui/pengaturan.js';
import { initKeyboardShortcuts, bindTabNavigation, registerShortcut, focusElement } from './ui/keyboardShortcuts.js';

// Event delegation untuk tombol dinamis. Hindari inline onclick + interpolasi data user.
function initDynamicActions() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action-global]');
    if (!el) return;
    const action = el.dataset.actionGlobal;
    const value = el.dataset.value;
    const value2 = el.dataset.value2;
    if (action === 'back-kasir') window.initKasirUI();
    if (action === 'show-opname') window.showOpnameStok();
    if (action === 'show-form-barang-masuk') window.showFormBarangMasuk();
    if (action === 'tambah-item-bm') window.tambahItem();
    if (action === 'simpan-barang-masuk') window.simpanBarangMasuk();
    if (action === 'back-barang-masuk') window.initBarangMasukUI();
    if (action === 'back-stok') window.initStokUI();
    if (action === 'edit-produk') window.editProduk(value);
    if (action === 'hapus-produk') window.hapusProduk(value);
    if (action === 'lihat-mutasi') window.lihatMutasi(value, decodeURIComponent(value2));
    if (action === 'simpan-opname') window.simpanOpname(value, Number(value2));
    if (action === 'reprint') window.reprintStruk(value);
    if (action === 'void-transaksi') window.voidTransaksi(value, value2);
    if (action === 'hapus-item-bm') window.hapusItemBarangMasuk(Number(value));
  });
}

// Tab routing
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // Toggle active tab
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      // Toggle panel
      panels.forEach(p => {
        if (p.dataset.panel === target) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });

      // Load UI per tab (lazy)
      if (target === 'kasir') initKasirUI();
      if (target === 'produk') initProdukUI();
      if (target === 'barang-masuk') initBarangMasukUI();
      if (target === 'stok') initStokUI();
      if (target === 'shift') initShiftUI();
      if (target === 'kas') initKasUI();
      if (target === 'laporan') initLaporanUI();
      if (target === 'pengaturan') initPengaturanUI();
    });
  });
}

// Init app
(async function() {
  try {
    await openDB();
    console.log('✓ IndexedDB siap');

    initTabs();
    initDynamicActions();
    initKeyboardShortcuts();
    bindTabNavigation();
    // Ctrl+K hanya bermakna di kasir (fokus search produk)
    registerShortcut('ctrl+k', () => { focusElement('#input-search-produk'); }, { tab: 'kasir', allowInInput: true });

    // Load default tab (Kasir untuk Tahap 2)
    initKasirUI();
  } catch (err) {
    console.error('Gagal init app:', err);
    alert('Gagal membuka database. Cek console.');
  }
})();
