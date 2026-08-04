// Bootstrap — init DB, routing, load UI modules
import { openDB } from './data/db.js';
import { initKasirUI } from './ui/kasir.js';
import { initProdukUI } from './ui/produk.js';
import { initBarangMasukUI } from './ui/barang-masuk.js';
import { initStokUI } from './ui/stok.js';
import { initShiftUI } from './ui/shift.js';
import { initPengaturanUI } from './ui/pengaturan.js';

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

    // Load default tab (Kasir untuk Tahap 2)
    initKasirUI();
  } catch (err) {
    console.error('Gagal init app:', err);
    alert('Gagal membuka database. Cek console.');
  }
})();
