# CLAUDE.md — POS Retail UMKM

Panduan untuk agen (Claude Code) yang membangun & memelihara proyek ini.
Baca file ini **sebelum** menulis kode. Kalau ragu, ikuti invarian di bawah;
kalau invarian bertabrakan dengan permintaan, tanya dulu — jangan diam-diam
melanggar.

---

## 1. Apa ini

POS (point of sale) retail untuk toko UMKM. Satu device kasir, offline-first,
tanpa backend. Data di IndexedDB. Menggantikan pencatatan manual: jualan,
stok, shift kasir, dan laporan keuangan dalam satu aplikasi.

**Bukan** POS percetakan (itu proyek terpisah: repo POS-offset / PrintCalc).
Jangan campur konsep offset (plano, druk, oplah) ke sini.

### Prinsip produk
- **Offline-first.** Harus jalan tanpa internet. Tidak ada network call di jalur kritis.
- **Satu device dulu.** Tidak ada sinkronisasi antar-device di v1. Semua state lokal.
- **Kasir harus cepat.** Layar jual = alur tercepat di aplikasi. Barcode → item masuk → bayar. Minimal klik.
- **Laporan = turunan data, bukan input manual.** Kalau transaksi & shift benar, laporan tinggal agregasi. Jangan pernah minta user mengetik ulang angka yang bisa dihitung.

---

## 2. Stack & aturan main

- **Vanilla JS, HTML, CSS.** Tanpa framework, tanpa build step di v1.
- **Tanpa dependency runtime.** Tidak ada CDN, tidak ada npm package yang di-bundle ke app. (npm hanya untuk test runner & tooling dev.)
- **IndexedDB** untuk semua data bisnis. **localStorage** hanya untuk preferensi UI ringan (tema, tab terakhir) — bukan data transaksi.
- **Modular, bukan single-file.** Beda dengan PrintCalc. Pisahkan per domain di `src/` (lihat struktur). Boleh di-bundle jadi satu file untuk distribusi nanti, tapi sumbernya modular.
- **Test wajib untuk logika berhitung.** HPP, tutup shift, laporan — tiap fungsi murni punya test. Tidak boleh menyentuh rumus HPP/shift tanpa test hijau.

### Estetika
Preferensi Toby: UI bersih modern-minimal (arah yang sama dengan PrintCalc Pro).
Boleh terang untuk layar kasir (kontras tinggi, angka besar & jelas — kasir dipakai
cepat di bawah lampu toko). Font sans yang enak dibaca (Plus Jakarta Sans / Inter).
Tanpa emoji di UI transaksional.

---

## 3. Arsitektur

Tiga lapisan. Jaga arahnya tetap satu arah: **UI → services → data**.
UI tidak menyentuh IndexedDB langsung; selalu lewat service.

```
src/
  data/
    db.js            # buka/migrasi IndexedDB, versi skema, wrapper get/put/query
    schema.js        # definisi store + index (satu sumber kebenaran)
  core/              # LOGIKA MURNI — tanpa DOM, tanpa IndexedDB. Ini yang dites ketat.
    hpp.js           # rata-rata bergerak, snapshot
    shift.js         # hitung kas sistem, selisih
    reports.js       # agregasi omzet/profit/laba bersih dari array transaksi
    receipt.js       # buildReceipt(sale) -> dokumen struk netral (bukan HTML/ESC-POS)
  services/          # orkestrasi: gabung core + data. Punya efek samping.
    productService.js
    purchaseService.js  # barang masuk -> update stok + HPP + log mutasi
    saleService.js      # simpan jual -> snapshot HPP, kurangi stok, catat kas
    shiftService.js
    cashflowService.js
    reportService.js
  print/             # adapter cetak — dipilih sesuai setting device
    renderHTML.js    # dokumen struk -> HTML utk window.print() (Windows)
    renderESCPOS.js  # dokumen struk -> Uint8Array (Android, TAHAP LANJUT)
    drawer.js        # perintah buka laci (hanya jalur ESC/POS; Windows lewat driver)
  ui/
    ...              # layar: Kasir, Produk, Stok, Shift, Kas, Laporan, Pengaturan
  app.js             # bootstrap
index.html
```

**Kenapa `core/` dipisah:** semua rumus yang salah = uang salah. Dengan
memisahnya jadi fungsi murni (input -> output, tanpa I/O), kita bisa tes exhaustif
tanpa mock IndexedDB. Service boleh punya efek samping; core tidak boleh.

---

## 4. INVARIAN (jangan dilanggar)

Ini aturan yang kalau dilanggar bikin laporan bohong. Perlakukan seperti hukum.

### INV-1 — HPP di-snapshot ke item penjualan
Saat menyimpan penjualan, tiap item **wajib** menyimpan `hppSnapshot` = HPP produk
**saat itu**. Laporan profit membaca `hppSnapshot`, **tidak pernah** membaca HPP
master produk. Alasan: HPP master berubah tiap barang masuk; kalau laporan
mereferensi master, laba bulan lalu ikut berubah tiap ada pembelian baru. Ini
bug yang paling sering & paling merusak kepercayaan pada laporan.

### INV-2 — Harga jual juga di-snapshot
Sama seperti HPP: `hargaJualSnapshot` dikunci ke item saat transaksi. Ubah harga
produk besok tidak boleh mengubah struk/omzet kemarin.

### INV-3 — Rumus HPP rata-rata bergerak
Saat barang masuk:
```
stokBaru = stokLama + qtyMasuk
hppBaru  = (stokLama * hppLama + qtyMasuk * hargaBeli) / stokBaru
```
**Kasus tepi (wajib ditangani):** kalau `stokLama <= 0`, jangan pakai rumus di atas
(pembagi/berat jadi salah). Set `hppBaru = hargaBeli`. Stok minus artinya barang
sudah terjual sebelum tercatat masuk; HPP mengikuti harga beli terbaru.

### INV-4 — Persamaan kas shift
```
kasSistem = modalAwal + totalTunaiMasuk + kasMasukManual - kasKeluarManual
selisih   = kasFisik - kasSistem
```
- **totalTunaiMasuk** hanya dari penjualan **tunai**. QRIS/transfer/kartu **tidak** masuk laci -> tidak masuk `kasSistem`, tapi **tetap** masuk omzet.
- `selisih > 0` = lebih (uang fisik lebih banyak dari sistem). `< 0` = kurang.

### INV-5 — Setiap penjualan terikat satu shift
`sale.shiftId` wajib terisi. Tidak boleh jual tanpa shift terbuka. Kalau tidak ada
shift terbuka, UI harus memaksa buka shift dulu. Ini yang bikin kasir accountable.

### INV-6 — Stok berubah lewat mutasi, selalu tercatat
Stok produk tidak pernah diubah "diam-diam". Setiap perubahan (jual, barang masuk,
opname, retur, void transaksi) menulis satu baris `stockMoves` dengan saldo
sesudahnya. Stok produk = hasil dari mutasi, bukan angka yang diketik bebas.
Opname pun ditulis sebagai mutasi koreksi, bukan overwrite senyap.

### INV-7 — Void transaksi mengembalikan efeknya, tidak menghapus record
Membatalkan penjualan: kembalikan stok (mutasi retur), balikkan kas, tandai
`void: true` — **jangan hapus record**. Nomor struk & jejak audit tetap ada.
Laporan mengecualikan yang void.

### INV-8 — Nomor dokumen dari counter di `meta`, berurutan, tidak dipakai ulang
Format struk: `TRX-YYMM-NNNN`. Counter disimpan di store `meta`, dinaikkan atomik
saat commit transaksi (dalam transaksi IndexedDB yang sama dengan penyimpanan sale,
supaya tidak ada nomor kembar / bolong). Reset per bulan opsional — putuskan di
KEPUTUSAN.md.

---

## 5. Aturan bisnis

- **Metode bayar:** tunai, QRIS, transfer, kartu. Tunai menghitung kembalian. Boleh **bayar campur** (mis. sebagian tunai sebagian QRIS) — simpan array pembayaran, bukan satu field.
- **HPP rata-rata bergerak** (bukan FIFO, bukan harga beli terakhir). Sudah diputuskan; lihat INV-3.
- **Stok boleh minus** — konsisten dengan POS-offset. Minus = barang terjual sebelum tercatat masuk; ditandai merah di UI, bukan diblok. Jangan halangi penjualan hanya karena stok sistem 0.
- **Diskon:** dukung diskon per item dan diskon nota (total). Cara distribusi diskon nota ke profit **harus diputuskan & dicatat di KEPUTUSAN.md** sebelum implementasi laporan (default rencana: distribusi proporsional ke item).
- **Laba kotor** = SUM((hargaJualSnapshot - hppSnapshot) * qty) - diskon.
- **Laba bersih** = laba kotor - biaya operasional (dari `cashflow` jenis keluar, kategori operasional). Prive & pembelian stok **bukan** biaya operasional — jangan dobel hitung (pembelian stok sudah masuk HPP).

---

## 6. Konvensi kode

- Bahasa UI: **Indonesia**. Nama variabel/fungsi boleh Inggris (camelCase) agar konsisten teknis.
- Uang: simpan sebagai **integer rupiah** (tanpa desimal). Jangan pakai float untuk uang.
- Waktu: simpan ISO 8601 string / epoch ms. Semua "hari ini" dihitung di zona waktu lokal device.
- ID: string, prefiks per store (`prd_`, `sal_`, `pur_`, `shf_`...). Boleh `crypto.randomUUID()`.
- Fungsi `core/` **murni**: tidak `await db`, tidak sentuh `Date.now()` di dalam (terima waktu sebagai argumen agar dites deterministik).
- Tiap perubahan skema IndexedDB **naikkan versi DB** & tulis migrasi di `db.js`. Jangan ubah bentuk store tanpa naik versi + migrasi.

---

## 7. Cetak & laci kas (SETTING, bukan asumsi)

Printer dan laci kas adalah **fitur opsional yang di-toggle di Pengaturan**.
Aplikasi harus jalan penuh walau keduanya mati (mis. saat dites di laptop tanpa
printer). Struk selalu bisa ditampilkan/di-download sebagai fallback.

Pengaturan terkait (di store `meta`, lihat DATA-MODEL):
- `printerEnabled` (bool)
- `printerWidth` (`'58'` | `'80'` mm) — mempengaruhi lebar karakter & CSS
- `drawerEnabled` (bool)
- `printMethod` (`'browser'` = window.print via driver | `'escpos'` = TAHAP LANJUT)

**Alur cetak = satu builder, banyak renderer:**
```
buildReceipt(sale, toko) -> dokumen struk netral (array baris: teks/qty/harga/align/ukuran)
   |- renderHTML(doc, width)   -> HTML utk window.print()   [Windows, v1]
   |- renderESCPOS(doc, width) -> Uint8Array                [Android, tahap lanjut]
```
Isi & layout struk didefinisikan **sekali** di `buildReceipt`. Menambah platform =
menambah renderer, **tidak** menyentuh builder. Jangan pernah menulis logika isi
struk di dalam renderer.

**Windows (v1):** `printMethod='browser'`. Cetak lewat `window.print()` + CSS
`@page` sesuai `printerWidth`. Buka laci **tidak** lewat aplikasi — diatur di driver
printer ("open cash drawer before printing"). Kalau `drawerEnabled` tapi
`printMethod='browser'`, UI cukup mengingatkan sekali bahwa laci diatur di driver.

**Android (tahap lanjut):** `printMethod='escpos'`. `renderESCPOS` menghasilkan byte,
dikirim via Web Bluetooth / RawBT. Laci dibuka via `drawer.js` (`ESC p 0 25 250`)
**hanya** di jalur ini.

Jangan bangun `renderESCPOS`/Web Bluetooth di v1. Cukup sediakan tempatnya & pastikan
`buildReceipt` netral sehingga penambahannya nanti tidak membongkar apa pun.

---

## 8. Testing

- Runner: Node built-in `node:test` + `node:assert` (tanpa dependency). `npm test`.
- **Wajib** ada test untuk: `hpp.js` (termasuk kasus stok <= 0), `shift.js` (selisih +/-, campur tunai/non-tunai), `reports.js` (laba kotor & bersih, exclude void), `receipt.js` (struktur dokumen konsisten untuk 58 & 80).
- Service boleh dites dengan IndexedDB in-memory (fake-indexeddb sebagai devDependency) — tapi core dites tanpa mock.
- Aturan: **jangan commit dengan test merah.** Jangan ubah rumus di `core/` tanpa test yang menangkap perubahannya.

---

## 9. Roadmap (bangun berurutan)

Lihat `docs/ROADMAP.md` untuk detail. Ringkas:

1. **Fondasi data + Produk + Barang masuk + HPP.** Belum bisa jualan, tapi stok & HPP hidup + tertes.
2. **Kasir.** Layar jual, barcode, keranjang, bayar (campur), struk (HTML/browser), void.
3. **Shift.** Buka/tutup, modal awal, hitung selisih, kunci penjualan ke shift.
4. **Kas & pengeluaran.** cashflow masuk/keluar, kategori.
5. **Laporan.** Omzet, profit, laba bersih, stok menipis, riwayat shift. Export.
6. **(Lanjut) Android + ESC/POS + laci via Bluetooth.** Renderer kedua.

Tahap 1–2 sudah cukup untuk mulai jualan nyata. Sisanya menyusul tanpa migrasi data
yang menyakitkan **jika** invarian di atas dipatuhi sejak Tahap 1.

---

## 10. Yang JANGAN dilakukan

- Jangan tambah backend/sync di v1.
- Jangan referensikan HPP/harga master di laporan (INV-1, INV-2).
- Jangan ubah stok tanpa mutasi (INV-6).
- Jangan hapus transaksi secara fisik (INV-7 — pakai void).
- Jangan pakai float untuk uang.
- Jangan tulis isi struk di renderer.
- Jangan asumsikan printer/laci selalu ada — semua di balik toggle setting.
- Jangan bawa konsep percetakan (offset/plano/oplah) ke sini.
