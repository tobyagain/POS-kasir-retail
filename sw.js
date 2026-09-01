// Service Worker — cache offline
const CACHE_NAME = 'pos-retail-v20260901-2';

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
  `${BASE}src/ui/riwayat-penjualan.js`,
  `${BASE}src/ui/keyboardShortcuts.js`,
  `${BASE}src/ui/numeric-input.js`,
  `${BASE}src/core/checkout.js`,
  `${BASE}src/core/importProduk.js`
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

// Fetch — network-first untuk JS module (hindari stale saat dev), cache-first lainnya
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isJS = url.pathname.endsWith('.js');

  if (isJS) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request);
    })
  );
});
