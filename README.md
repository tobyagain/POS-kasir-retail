# POS Retail UMKM

Aplikasi kasir (point of sale) untuk toko UMKM. Offline-first, satu device,
tanpa backend. Data di IndexedDB. Fitur inti: penjualan, stok + HPP, shift kasir,
kas & pengeluaran, laporan omzet/profit/laba bersih.

> Proyek terpisah dari POS-offset (percetakan). Konsep tidak dibagi.

## Baca dulu
- **[CLAUDE.md](./CLAUDE.md)** — arsitektur, invarian (jangan dilanggar), aturan bisnis, konvensi. **Wajib** sebelum menyentuh kode.
- **[docs/DATA-MODEL.md](./docs/DATA-MODEL.md)** — skema IndexedDB (7 store).
- **[docs/ROADMAP.md](./docs/ROADMAP.md)** — urutan bangun per tahap + kriteria selesai.
- **[docs/KEPUTUSAN.md](./docs/KEPUTUSAN.md)** — log keputusan desain & pertanyaan terbuka.

## Status
Tahap 0 — scaffold + spek. Inti berhitung (`src/core/hpp.js`, `src/core/shift.js`)
sudah diimplementasi & tertes. UI dan service belum dibangun (lihat ROADMAP Tahap 1).

## Jalankan test
```
npm test
```
Runner: Node built-in `node:test` (butuh Node 18+). Tanpa dependency.

## Prinsip singkat
- Uang = integer rupiah, jangan float.
- Laporan baca **snapshot** HPP/harga di transaksi, bukan master produk.
- Stok berubah hanya lewat mutasi (`stockMoves`).
- Printer & laci kas = toggle di Pengaturan, bukan asumsi.
- 1 builder struk, banyak renderer (HTML sekarang, ESC/POS nanti).
