# Log Keputusan — POS Retail UMKM

Catat setiap keputusan desain di sini begitu diambil, dengan alasannya. Format:
tanggal — keputusan — alasan. Ini yang menjaga konsistensi lintas sesi.

---

## Sudah diputuskan

- **Proyek terpisah dari POS-offset/PrintCalc.** Ini POS retail toko umum, bukan percetakan. Tidak berbagi kode/konsep offset.
- **Satu device kasir (v1).** Tidak ada multi-device / multi-cabang / sinkronisasi. Menyederhanakan: cukup IndexedDB, tanpa backend.
- **Offline-first, tanpa backend, vanilla JS modular.** Konsisten dengan preferензi tooling (tanpa dependency runtime), tapi modular per domain — bukan single-file seperti PrintCalc, karena ruang lingkup lebih besar.
- **Manajemen stok penuh + HPP + barang masuk.** Bukan stok sederhana.
- **HPP = rata-rata bergerak** (moving average), bukan FIFO/harga beli terakhir. Cukup akurat untuk UMKM tanpa kompleksitas lot FIFO. Kasus stok<=0 -> HPP = hargaBeli.
- **Snapshot HPP & harga jual ke item transaksi** (INV-1/2). Supaya laporan historis stabil.
- **Stok boleh minus**, ditandai merah, tidak memblok penjualan. Konsisten dgn keputusan POS-offset.
- **Shift adalah tulang punggung** akuntabilitas & laporan. Tiap sale terikat shiftId. QRIS/transfer masuk omzet tapi bukan laci.
- **Printer & laci kas = TOGGLE di Pengaturan**, bukan asumsi. App jalan penuh tanpa keduanya. (Keputusan Toby, 2026-08-04.)
- **Windows dulu, Android nanti.** v1 cetak lewat `window.print()` (driver browser); laci lewat setting driver printer. Android + ESC/POS + laci Bluetooth = Tahap 6. Karena itu lapisan cetak = 1 builder netral + banyak renderer sejak awal.
- **Uang = integer rupiah.** Tanpa float.
- **Handoff via repo + Claude Code** sejak awal (bukan fase single-file dulu), pola sama seperti POS-offset. (Keputusan Toby, 2026-08-04.)

---

## Masih terbuka (putuskan sebelum tahap terkait)

- **Lebar struk 58 vs 80mm** — dibuat setting (`printerWidth`), tapi default belum dipilih. 58mm paling umum UMKM (32 kolom); 80mm lebih lega (48 kolom). *Butuh sebelum Tahap 2.*
- **Reset nomor struk per bulan?** `TRX-YYMM-NNNN` — apakah NNNN reset tiap ganti bulan atau jalan terus. *Butuh sebelum Tahap 2.*
- **Distribusi diskon nota ke profit** — proporsional per item (rencana default) vs baris diskon tersendiri. *Butuh sebelum Tahap 5.*
- **Kategori beli_stok lewat cashflow** — apakah diizinkan (kas kecil tak ternota) atau semua pembelian wajib lewat `purchases`. Mempengaruhi cara menghindari dobel hitung di laba bersih. *Butuh sebelum Tahap 4.*
- **Multi-kasir dalam satu device?** Nama kasir per shift sudah cukup, atau perlu daftar user + PIN? *Bisa ditunda.*
- **Estetika final layar kasir** — terang/gelap, tata letak grid produk vs input barcode murni. *Butuh sebelum Tahap 2 UI.*
