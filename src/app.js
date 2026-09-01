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
import { initKeyboardShortcuts, bindTabNavigation, focusElement, registerShortcut, getActiveTab } from './ui/keyboardShortcuts.js';

// Mapping tab -> search/aksi utama untuk Ctrl+K
const TAB_FOCUS = {
  'kasir': '#input-search-produk',
  'produk': '#input-cari-produk',
  'barang-masuk': '#input-cari-produk',
};

function focusTabMain(target) {
  const sel = TAB_FOCUS[target];
  if (sel && focusElement(sel)) return;
  // fallback: fokus input pertama yang terlihat di panel aktif
  const panel = document.querySelector(`[data-panel="${target}"]`);
  panel?.querySelector('input:not([type=hidden]):not([readonly]), textarea, select')?.focus();
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
    initKeyboardShortcuts();
    bindTabNavigation();
    registerShortcut('ctrl+k', () => { focusTabMain(getActiveTab()); }, { allowInInput: true });

    // Load default tab (Kasir untuk Tahap 2)
    initKasirUI();
  } catch (err) {
    console.error('Gagal init app:', err);
    alert('Gagal membuka database. Cek console.');
  }
})();
