// Service Worker — cache offline
const CACHE_NAME = 'pos-retail-v1';

// Detect base path (GitHub Pages = /repo-name/, localhost = /)
const BASE = self.location.pathname.replace(/\/sw\.js$/, '/');

const ASSETS = [
  BASE,
  `${BASE}index.html`,
  `${BASE}src/app.js`,
  `${BASE}src/ui/styles.css`,
  `${BASE}src/data/db.js`,
  `${BASE}src/data/schema.js`,
  `${BASE}src/core/hpp.js`,
  `${BASE}src/core/shift.js`,
  `${BASE}src/core/reports.js`,
  `${BASE}src/core/receipt.js`,
  `${BASE}src/services/productService.js`,
  `${BASE}src/services/purchaseService.js`,
  `${BASE}src/services/saleService.js`,
  `${BASE}src/services/shiftService.js`,
  `${BASE}src/services/cashflowService.js`,
  `${BASE}src/services/stockService.js`,
  `${BASE}src/services/reportService.js`,
  `${BASE}src/services/printService.js`,
  `${BASE}src/services/archiveService.js`,
  `${BASE}src/print/renderHTML.js`,
  `${BASE}src/print/renderESCPOS.js`,
  `${BASE}src/print/drawer.js`,
  `${BASE}src/print/bluetooth.js`,
  `${BASE}src/ui/kasir.js`,
  `${BASE}src/ui/produk.js`,
  `${BASE}src/ui/barang-masuk.js`,
  `${BASE}src/ui/stok.js`,
  `${BASE}src/ui/shift.js`,
  `${BASE}src/ui/kas.js`,
  `${BASE}src/ui/laporan.js`,
  `${BASE}src/ui/pengaturan.js`,
  `${BASE}src/ui/riwayat-penjualan.js`
];

// Install — cache semua file
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — hapus cache lama
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first strategy
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request);
    })
  );
});
