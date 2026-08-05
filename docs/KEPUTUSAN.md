# Log Keputusan — POS Retail UMKM

Catat setiap keputusan desain di sini begitu diambil, dengan alasannya. Format:
tanggal — keputusan — alasan. Ini yang menjaga konsistensi lintas sesi.

---

## Sudah diputuskan

- **Proyek terpisah dari POS-offset/PrintCalc.** Ini POS retail toko umum, bukan percetakan. Tidak berbagi kode/konsep offset.
- **Satu device kasir (v1).** Tidak ada multi-device / multi-cabang / sinkronisasi. Menyederhanakan: cukup IndexedDB, tanpa backend.
- **Offline-first, tanpa backend, vanilla JS modular.** Konsisten dengan preferензи tooling (tanpa dependency runtime), tapi modular per domain — bukan single-file seperti PrintCalc, karena ruang lingkup lebih besar.
- **Manajemen stok penuh + HPP + barang masuk.** Bukan stok sederhana.
- **HPP = rata-rata bergerak** (moving average), bukan FIFO/harga beli terakhir. Cukup akurat untuk UMKM tanpa kompleksitas lot FIFO. Kasus stok<=0 -> HPP = hargaBeli.
- **Snapshot HPP & harga jual ke item transaksi** (INV-1/2). Supaya laporan historis stabil.
- **Stok boleh minus**, ditandai merah, tidak memblok penjualan. Konsisten dgn keputusan POS-offset.
- **Shift adalah tulang punggung** akuntabilitas & laporan. Tiap sale terikat shiftId. QRIS/transfer masuk omzet tapi bukan laci.
- **Printer & laci kas = TOGGLE di Pengaturan**, bukan asumsi. App jalan penuh tanpa keduanya. (Keputusan Toby, 2026-08-04.)
- **Windows dulu, Android nanti.** v1 cetak lewat `window.print()` (driver browser); laci lewat setting driver printer. Android + ESC/POS + laci Bluetooth = Tahap 6. Karena itu lapisan cetak = 1 builder netral + banyak renderer sejak awal.
- **Uang = integer rupiah.** Tanpa float.
- **Handoff via repo + Claude Code** sejak awal (bukan fase single-file dulu), pola sama seperti POS-offset. (Keputusan Toby, 2026-08-04.)
- **Reset nomor struk per bulan.** Format `TRX-YYMM-NNNN` dengan NNNN reset tiap ganti periode YYMM. Default enabled (`resetStrukBulanan: true`). User bisa toggle di Pengaturan. (2026-08-05)
- **Lebar struk default 58mm** (32 kolom karakter). Paling umum di UMKM. User bisa toggle ke 80mm di Pengaturan. (2026-08-05)
- **Diskon nota didistribusi proporsional** ke item berdasarkan subtotal. Alokasi per item = `diskonNota * (item.subtotal / totalBruto)`. Memungkinkan laporan laba per produk yang akurat. (2026-08-05)
- **Kategori cashflow `beli_stok` tidak dipakai.** Semua pembelian stok lewat `purchases` (barang masuk) yang update HPP. Cashflow keluar hanya untuk operasional/prive. Mencegah dobel hitung di laba bersih. (2026-08-05)

---

## Masih terbuka (putuskan sebelum tahap terkait)

- **Multi-kasir dalam satu device?** Nama kasir per shift sudah cukup, atau perlu daftar user + PIN? *Bisa ditunda.*
