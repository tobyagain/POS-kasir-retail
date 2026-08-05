// Service Worker — cache offline
const CACHE_NAME = 'pos-retail-v1';
const ASSETS = [
  './',
  './index.html',
  './src/app.js',
  './src/ui/styles.css',
  './src/data/db.js',
  './src/data/schema.js',
  './src/core/hpp.js',
  './src/core/shift.js',
  './src/core/reports.js',
  './src/core/receipt.js',
  './src/services/productService.js',
  './src/services/purchaseService.js',
  './src/services/saleService.js',
  './src/services/shiftService.js',
  './src/services/cashflowService.js',
  './src/services/stockService.js',
  './src/services/reportService.js',
  './src/services/printService.js',
  './src/print/renderHTML.js',
  './src/print/renderESCPOS.js',
  './src/print/drawer.js',
  './src/print/bluetooth.js',
  './src/ui/kasir.js',
  './src/ui/produk.js',
  './src/ui/barang-masuk.js',
  './src/ui/stok.js',
  './src/ui/shift.js',
  './src/ui/kas.js',
  './src/ui/laporan.js',
  './src/ui/pengaturan.js',
  './src/ui/riwayat-penjualan.js'
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
