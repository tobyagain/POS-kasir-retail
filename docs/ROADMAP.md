# Roadmap — POS Retail UMKM

Bangun berurutan. Tiap tahap punya kriteria "selesai" yang jelas dan test.
Jangan lompat tahap; tiap tahap berdiri di atas invarian tahap sebelumnya.

---

## Tahap 1 — Fondasi data + Produk + Barang masuk + HPP
**Tujuan:** stok & HPP hidup dan benar. Belum bisa jualan.

Bangun:
- `data/db.js` + `data/schema.js` — buka DB, semua store & index, migrasi v1.
- `core/hpp.js` — `hitungHppBaru({stokLama, hppLama, qtyMasuk, hargaBeli})`. Murni.
- `services/productService.js` — CRUD produk.
- `services/purchaseService.js` — simpan barang masuk -> update stok+HPP -> stockMoves. Satu transaksi IDB.
- UI: layar **Produk** (list, cari, tambah/edit, cari by barcode) & **Barang Masuk**.
- UI: layar **Stok** (opname, lihat mutasi).

Selesai bila:
- Tambah produk, input barang masuk, HPP terupdate sesuai INV-3 (cek manual + test).
- Kasus stok<=0 lalu barang masuk -> HPP = hargaBeli (test lulus).
- Opname menulis stockMoves, stok = agregat mutasi (INV-6).
- `npm test` hijau: hpp.js exhaustif.

---

## Tahap 2 — Kasir
**Tujuan:** bisa jualan & cetak struk (mode browser).

Bangun:
- `core/receipt.js` — `buildReceipt(sale, toko)` -> dokumen netral.
- `print/renderHTML.js` — dokumen -> HTML, CSS `@page` 58/80 sesuai setting.
- `services/saleService.js` — simpan sale: snapshot HPP+harga (INV-1/2), kurangi stok, stockMoves, counter struk (INV-8), catat kas tunai — satu transaksi.
- UI: layar **Kasir** — scan/cari barcode, keranjang, qty, diskon item & nota, pilih metode bayar (campur), kembalian, simpan + cetak.
- UI: **void** transaksi (INV-7).

Selesai bila:
- Scan barcode -> item masuk keranjang; qty & diskon jalan.
- Bayar campur (tunai+QRIS) tersimpan sebagai array; kembalian benar.
- Struk tampil/print rapi di 58 & 80 (test struktur receipt lulus keduanya).
- Void mengembalikan stok & kas, record tidak terhapus.
- **Blokir jualan kalau tidak ada shift terbuka** (INV-5) — walau Shift baru dibangun Tahap 3, tanam guard-nya sekarang (shift dummy boleh sementara, tapi hook-nya ada).

> Catatan urutan: kalau lebih nyaman, boleh gabung Tahap 2+3 karena INV-5 mengikat
> keduanya. Yang penting guard shift ada sebelum kasir dianggap "selesai".

---

## Tahap 3 — Shift
**Tujuan:** kasir accountable, laci terhitung.

Bangun:
- `core/shift.js` — `hitungKasSistem(shift, sales, cashflow)` & `hitungSelisih`. Murni (INV-4).
- `services/shiftService.js` — buka/tutup shift.
- UI: **buka shift** (kasir + modal awal), banner "shift aktif", **tutup shift** (input kas fisik -> tampil kasSistem, selisih, ringkasan per metode).

Selesai bila:
- Tak bisa jual tanpa shift open.
- Tutup shift: kasSistem hanya dari tunai; QRIS/transfer masuk omzet tapi bukan laci.
- Selisih +/- benar (test lulus).
- Shift closed = terkunci; sale baru menuntut shift baru.

---

## Tahap 4 — Kas & pengeluaran
**Tujuan:** laba bersih, bukan cuma omzet.

Bangun:
- `services/cashflowService.js` — kas masuk/keluar, kategori.
- UI: **Kas** — catat pengeluaran/pemasukan dalam shift berjalan.

Selesai bila:
- Pengeluaran operasional mengurangi laba bersih; prive & beli_stok tidak (cegah dobel hitung).
- Kas keluar tunai memengaruhi kasSistem shift (INV-4).

---

## Tahap 5 — Laporan
**Tujuan:** angka bisa dipercaya, bisa diarsipkan.

Bangun:
- `core/reports.js` — agregasi murni dari array sales/cashflow: omzet (per metode), laba kotor (pakai hppSnapshot!), laba bersih, produk terlaris, stok menipis (stok<=stokMin), rekap per shift. Kecualikan void.
- `services/reportService.js` — ambil data per rentang & serahkan ke core.
- UI: **Laporan** — harian/rentang, ringkasan + rincian; export JSON & CSV.
- Export/import **seluruh** database (backup) + pengingat backup > N hari (pola PrintCalc).

Selesai bila:
- Laba kotor pakai hppSnapshot (ubah HPP master tidak mengubah laporan lama) — test lulus.
- Laba bersih = kotor - operasional (prive/beli_stok dikecualikan) — test lulus.
- Void tidak ikut dihitung.
- Backup export/import round-trip utuh.

---

## Tahap 6 (Lanjut) — Android + ESC/POS + laci Bluetooth
**Tujuan:** routing ke HP/tablet tanpa membongkar apa pun.

Bangun:
- `print/renderESCPOS.js` — dokumen netral -> Uint8Array (58/80).
- `print/drawer.js` — `ESC p 0 25 250`.
- Web Bluetooth / RawBT untuk kirim byte; toggle `printMethod='escpos'`.

Selesai bila:
- `buildReceipt` **tidak berubah** dari Tahap 2 (bukti netralitas builder).
- Struk sama isinya di browser & ESC/POS.
- Laci buka via perintah hanya di mode escpos; mode browser tetap lewat driver.

---

## Prinsip lintas tahap
- Tiap tahap: test hijau sebelum lanjut.
- Tiap perubahan skema: naik versi DB + migrasi + test migrasi.
- Commit kecil, pesan jelas. Tag per tahap (`v0.1-produk`, `v0.2-kasir`, ...).
- Log keputusan desain ke `docs/KEPUTUSAN.md` begitu diambil.
