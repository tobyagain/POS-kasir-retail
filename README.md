# POS Kasir Retail — UMKM

POS (point of sale) retail untuk toko UMKM. Offline-first, satu device,
tanpa backend — semua data tersimpan di perangkat (IndexedDB). Vanilla JS
modular, tanpa framework, tanpa build step.

## Pakai

Buka via GitHub Pages (Settings → Pages → branch main), atau lokal:

```bash
bash start-server.sh   # python -m http.server 8000
# buka http://localhost:8000
```

Setelah update kode: **Ctrl+Shift+R** (hard refresh) sekali — service worker
`sw.js` cache-first untuk HTML/CSS, network-first untuk JS.

## Fitur

- Kasir: scan barcode, keranjang, bayar campur (tunai + QRIS/dll), struk 58/80mm
- Keyboard flow penuh di layar kasir (Alt+1..8 nav, F6/F7/F8, Ctrl+Enter bayar)
- Produk + import CSV; Barang masuk dengan HPP rata-rata bergerak
- Stok + opname (selalu lewat mutasi `stockMoves`)
- Shift kasir: modal awal, kas sistem vs fisik, selisih
- Kas masuk/keluar terkategori
- Laporan omzet/profit/laba bersih (dari snapshot transaksi, bukan master)
- PWA installable; cetak via browser (Windows) atau ESC/POS Bluetooth (Android)

## Development

```bash
npm test        # 51 test, node:test (core murni tanpa mock)
```

Instruksi lengkap untuk agen: `CLAUDE.md`.
Keputusan produk: `docs/KEPUTUSAN.md`. Catatan dev & gotcha: `docs/DEV-NOTES.md`.
