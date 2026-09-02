# PRD — POS Keyboard Flow

## Tujuan

Membuat seluruh fungsi POS dapat dipakai cepat melalui keyboard, tanpa merusak alur touch Android. Kasir dapat melayani pembeli dari scan produk sampai transaksi baru tanpa mouse.

## Batasan

- Vanilla JS, tanpa dependency runtime.
- IndexedDB dan business rules tetap.
- Shortcut hanya mengatur UI/fokus; tidak mengubah rumus core.
- Master produk tidak berubah saat harga item di keranjang diedit.
- Tombol touch tetap tersedia.
- Tidak memakai shortcut yang bentrok dengan browser: `F5`, `Ctrl+R`, `Ctrl+Z`, `Ctrl+P`.

---

## 1. Prinsip shortcut

1. Satu shortcut = satu aksi jelas.
2. Shortcut global hanya aktif saat tidak sedang mengetik field.
3. `Enter` dipakai untuk lanjut/submit sesuai konteks aktif.
4. `Escape` menutup hasil pencarian, membatalkan edit, atau kembali ke tampilan sebelumnya.
5. Shortcut dengan modifier tetap boleh aktif saat input, misalnya `Ctrl+Enter`.
6. Setelah aksi selesai, fokus pindah ke langkah berikutnya yang paling masuk akal.
7. Fokus aktif harus terlihat.
8. Jangan memakai `alert()` untuk alur rutin.
9. Shortcut hint hanya tampil desktop; UI touch tidak bergantung padanya.
10. Semua nominal input memakai separator `id-ID`; pembacaan menghapus separator.

---

## 2. Shortcut global aplikasi

| Shortcut | Aksi |
|---|---|
| `Alt+1` | Buka Kasir |
| `Alt+2` | Buka Produk |
| `Alt+3` | Buka Barang Masuk |
| `Alt+4` | Buka Stok |
| `Alt+5` | Buka Shift |
| `Alt+6` | Buka Kas |
| `Alt+7` | Buka Laporan |
| `Alt+8` | Buka Pengaturan |
| `Ctrl+K` | Fokus search/aksi utama tab aktif |
| `Escape` | Tutup hasil pencarian atau batal mode aktif |

`Alt+angka` tetap aktif dari input. Shortcut lain diblokir ketika target adalah `input`, `textarea`, atau `select`, kecuali shortcut eksplisit dengan `Ctrl`/`Alt`.

---

## 3. Flow kasir: melayani satu pelanggan

### State flow

```text
SEARCH
  → ITEM_ADDED
  → CART_EDIT
  → PAYMENT
  → PAID
  → RECEIPT
  → NEW_TRANSACTION
```

### Flow normal tanpa mouse

1. Kasir tekan `Alt+1`.
2. Fokus otomatis masuk `input-search-produk`.
3. Barcode scanner mengisi barcode.
4. Tekan `Enter`.
5. Produk masuk keranjang.
6. Fokus tetap kembali ke search agar barcode berikutnya bisa langsung discan.
7. Setelah semua produk masuk, tekan `F6` untuk fokus item terakhir di keranjang.
8. Edit harga/qty bila perlu.
9. Tekan `F7` untuk fokus diskon nota.
10. Tekan `F8` untuk fokus nominal tunai.
11. Isi nominal lalu tekan `Enter` untuk menambah pembayaran tunai.
12. Tekan `Alt+Q` untuk menambahkan sisa pembayaran via QRIS.
13. Tekan `Ctrl+Enter` untuk menyelesaikan pembayaran.
14. Sistem simpan transaksi, kurangi stok, simpan snapshot harga/HPP, lalu cetak atau preview struk.
15. Setelah cetak/preview selesai, fokus kembali ke search untuk pelanggan berikutnya.

### Shortcut flow kasir

| Shortcut | Aksi |
|---|---|
| `Alt+1` | Buka tab Kasir dan fokus search |
| `Ctrl+K` | Fokus search produk |
| `Enter` pada search | Tambah barcode exact match atau produk pertama hasil nama |
| `ArrowDown` / `ArrowUp` pada hasil | Pindah hasil produk |
| `Enter` pada hasil | Tambah produk terpilih ke keranjang |
| `Escape` pada hasil | Tutup hasil pencarian |
| `F6` | Fokus item terakhir di keranjang |
| `Alt+←` | Kurangi qty item aktif |
| `Alt+→` | Tambah qty item aktif |
| `Delete` | Hapus item aktif dari keranjang |
| `F7` | Fokus diskon nota |
| `F8` | Fokus nominal tunai |
| `Enter` pada nominal tunai | Tambah pembayaran tunai |
| `Alt+Q` | Tambah QRIS sebesar sisa tagihan |
| `Alt+Backspace` | Hapus pembayaran terakhir |
| `Ctrl+Enter` | Bayar/simpan transaksi |
| `Ctrl+N` | Transaksi baru/reset keranjang |
| `Ctrl+H` | Buka riwayat penjualan |

### Edit harga item

- Harga item tampil sebagai input nominal di setiap baris keranjang.
- Saat item aktif, `F6` fokus harga item terakhir.
- `Tab` dari harga berpindah ke kontrol qty item.
- `Enter` pada harga menyimpan perubahan ke state keranjang.
- Harga baru hanya berlaku untuk transaksi berjalan.
- Field menyimpan ke `item.hargaJualSnapshot` sebelum `simpanPenjualan()`.
- `produk.hargaJual` tidak boleh dipanggil untuk menyimpan perubahan ini.
- Subtotal dan total berubah real-time.
- Harga `0` boleh jika aturan service tetap mengizinkan; validasi service menjadi sumber kebenaran.

### Edit qty item

- Tombol plus/minus tetap tersedia.
- Keyboard menggunakan `Alt+←` dan `Alt+→` agar tidak bentrok dengan navigasi input.
- `Delete` menghapus item aktif setelah fokus berada pada baris item.
- Qty tidak boleh menjadi nol dalam state item; qty nol menghapus baris seperti perilaku saat ini.

### Pembayaran

- `F8` fokus nominal tunai.
- `Enter` menambahkan nominal yang diketik ke daftar pembayaran.
- `Alt+Q` mengisi sisa tagihan melalui QRIS.
- Pembayaran campur tetap array `pembayaran`.
- `Ctrl+Enter` hanya berjalan jika:
  - keranjang tidak kosong;
  - ada pembayaran;
  - total pembayaran >= total netto.
- Jika kurang bayar, fokus kembali ke nominal tunai dan tampilkan pesan inline.
- Jika lebih bayar, kembalian dihitung dari uang tunai sesuai aturan existing.

### Setelah bayar

- Disable aksi bayar selama proses simpan/cetak.
- Setelah transaksi sukses:
  - keranjang dikosongkan;
  - daftar pembayaran dikosongkan;
  - search dikosongkan;
  - fokus kembali ke search;
  - tidak ada alert sukses rutin.
- Jika cetak gagal setelah transaksi tersimpan, transaksi tidak boleh disimpan ulang. Tampilkan aksi `Cetak Ulang` atau `Preview Struk`.

---

## 4. Produk

| Shortcut | Aksi |
|---|---|
| `Alt+2` | Buka Produk |
| `N` | Buka form tambah produk jika tidak sedang mengetik |
| `/` atau `Ctrl+K` | Fokus pencarian produk |
| `Enter` | Buka/edit produk terpilih |
| `Escape` | Kembali ke daftar |
| `Ctrl+Enter` | Simpan form |

Harga jual dan stok minimum memakai formatter nominal shared.

## 5. Barang Masuk

| Shortcut | Aksi |
|---|---|
| `Alt+3` | Buka Barang Masuk |
| `N` | Buka form barang masuk |
| `Ctrl+K` | Fokus cari produk |
| `Enter` | Pilih produk exact match |
| `Tab` | Supplier → produk → qty → harga beli → tombol tambah |
| `Ctrl+Enter` | Simpan barang masuk |
| `Escape` | Kembali ke daftar |

Qty dan harga beli memakai separator `id-ID`.

## 6. Stok

| Shortcut | Aksi |
|---|---|
| `Alt+4` | Buka Stok |
| `O` | Buka opname |
| `ArrowUp` / `ArrowDown` | Pindah baris produk |
| `Enter` | Simpan opname baris aktif |
| `Escape` | Kembali ke stok |

Opname tetap menulis `stockMoves`; shortcut tidak boleh mengubah aturan ini.

## 7. Shift

| Shortcut | Aksi |
|---|---|
| `Alt+5` | Buka Shift |
| `B` | Fokus/buka form buka shift |
| `Ctrl+Enter` | Simpan buka shift |
| `C` | Fokus form tutup shift |
| `Ctrl+Enter` | Tutup shift setelah validasi |
| `Escape` | Batal mode form |

Tutup shift tetap membutuhkan konfirmasi karena aksi irreversible secara operasional.

## 8. Kas

| Shortcut | Aksi |
|---|---|
| `Alt+6` | Buka Kas |
| `I` | Pilih kas masuk |
| `O` | Pilih kas keluar |
| `Tab` | Jenis → kategori → nominal → keterangan → tunai |
| `Ctrl+Enter` | Simpan cashflow |

Validasi kategori dan shift tetap dilakukan service.

## 9. Laporan

| Shortcut | Aksi |
|---|---|
| `Alt+7` | Buka Laporan |
| `T` | Isi rentang hari ini |
| `R` | Muat ulang laporan |
| `Ctrl+E` | Export laporan jika fitur tersedia |
| `Escape` | Hapus hasil/filter aktif |

## 10. Pengaturan

| Shortcut | Aksi |
|---|---|
| `Alt+8` | Buka Pengaturan |
| `Ctrl+B` | Backup database |
| `Ctrl+Shift+R` | Buka restore database |
| `P` | Fokus pengaturan printer |
| `A` | Fokus arsip data |

Restore dan arsip memerlukan konfirmasi serta tidak boleh berjalan saat shift terbuka bila aturan existing melarangnya.

---

## 11. Arsitektur implementasi

Buat registry shortcut terpusat:

- `src/ui/keyboardShortcuts.js`
  - daftar shortcut global;
  - deteksi target input;
  - helper `registerShortcut()` bila memang dibutuhkan;
  - helper `focusElement()`;
  - tidak menyentuh IndexedDB.
- `src/app.js`
  - routing `Alt+1` sampai `Alt+8`;
  - satu listener global.
- UI masing-masing tab
  - hanya mendaftarkan shortcut lokal saat panel aktif;
  - mengatur fokus dan state lokal.
- `src/ui/numeric-input.js`
  - tetap menjadi satu formatter nominal.

Hindari listener global duplikat setiap kali tab dirender. Listener harus didaftarkan satu kali atau dibersihkan sebelum didaftarkan ulang.

Gunakan event delegation untuk tombol dinamis. Jangan menambah inline `onclick` baru untuk aksi yang dapat ditangani `data-action`.

---

## 12. Acceptance criteria

### Kasir

- Satu transaksi normal selesai tanpa mouse.
- Barcode berikutnya bisa langsung discan setelah item sebelumnya masuk.
- Harga item bisa diedit dengan keyboard.
- Harga master produk tidak berubah.
- Qty, diskon, pembayaran campur, total, dan kembalian benar.
- `Ctrl+Enter` tidak menyimpan transaksi jika validasi gagal.
- Setelah transaksi sukses, fokus kembali ke search.
- Transaksi tersimpan satu kali walau tombol/shortcut ditekan dua kali cepat.
- Shift guard tetap berlaku.
- Void dan riwayat tetap dapat diakses.

### Seluruh aplikasi

- Semua tab dapat dibuka dari keyboard.
- Semua form utama punya jalur `Tab` dan `Ctrl+Enter`.
- Tidak ada shortcut yang memicu reload, undo, atau print browser secara tidak sengaja.
- Shortcut tidak mengganggu pengetikan nama, barcode, keterangan, atau pencarian.
- Touch UI tetap bekerja tanpa keyboard.
- Semua nominal input tampil separator Indonesia.

### Verifikasi

```bash
npm test
for f in $(git ls-files '*.js'); do node --check "$f" || exit 1; done
```

Tambahkan test untuk:

- registry/filter shortcut;
- shortcut yang diblokir saat input teks;
- edit harga item memperbarui subtotal dan total;
- `Ctrl+Enter` mencegah pembayaran kurang;
- shortcut tidak membuat transaksi ganda.

Uji manual browser dengan checklist keyboard kasir dari state `SEARCH` sampai `NEW_TRANSACTION`.

---

## 13. Urutan pengerjaan

1. Rapikan `numeric-input.js` sebagai formatter tunggal.
2. Tambah registry shortcut global dan routing tab.
3. Selesaikan flow keyboard Kasir.
4. Tambah shortcut Produk dan Barang Masuk.
5. Tambah shortcut Stok dan Shift.
6. Tambah shortcut Kas, Laporan, dan Pengaturan.
7. Tambah test keyboard/state.
8. Uji manual desktop.
9. Uji ulang touch/mobile agar tidak regresi.

Jangan mengubah core bisnis, schema IndexedDB, atau format transaksi kecuali test membuktikan kebutuhan.
