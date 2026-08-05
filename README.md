# POS Retail UMKM

Point of sale untuk toko retail UMKM. Offline-first, satu device kasir, tanpa backend.
Data disimpan lokal di IndexedDB.

Proyek ini **bukan** POS percetakan (itu repo terpisah: POS-offset / PrintCalc).
Ini untuk retail umum: warung, toko kelontong, minimarket UMKM.

---

## Stack

- **Vanilla JS** (ES modules), tanpa framework
- **IndexedDB** untuk data transaksi, stok, shift
- **Tanpa dependency runtime** (no CDN, no npm bundle di v1)
- **Modular** per domain (bukan single-file)

---

## Fitur

### ✅ Core (Tahap 1-5 — DONE)
- **Produk & stok** — master produk, barcode, kategori
- **Barang masuk** — update stok + HPP rata-rata bergerak
- **Kasir** — scan barcode, keranjang, bayar campur (tunai/QRIS/transfer/kartu), cetak struk
- **Shift** — buka/tutup shift, modal awal, kas sistem vs fisik, selisih
- **Kas** — pencatatan kas masuk/keluar non-penjualan
- **Laporan** — omzet, laba kotor/bersih, produk terlaris, stok menipis, riwayat shift
- **Pengaturan** — identitas toko, printer (toggle & lebar 58/80mm), laci kas, backup/restore DB

### ✅ Android + Bluetooth (Tahap 6 — DONE secara kode)
- **ESC/POS renderer** — cetak struk via printer thermal Bluetooth
- **Laci kas** — buka otomatis via perintah ESC/POS
- **Web Bluetooth** — pairing & kirim byte langsung ke printer
- **Status:** Kode complete, belum ditest di hardware printer nyata. Lihat **[docs/ANDROID.md](docs/ANDROID.md)** untuk panduan setup.

---

## Cara Pakai

### Windows / Desktop
1. Clone repo ini.
2. Buka `index.html` di browser (Chrome/Edge recommended).
3. Tidak perlu build step. Langsung jalan.
4. Cetak struk via `window.print()` (driver browser).

### Android / Tablet
1. Host aplikasi di server HTTPS (atau localhost via tunnel).
2. Buka di Chrome/Edge Android.
3. Tab **Pengaturan** → **Pair Printer Bluetooth** → pilih printer thermal.
4. Set **Metode Cetak** = `Bluetooth ESC/POS`.
5. Lihat **[docs/ANDROID.md](docs/ANDROID.md)** untuk troubleshooting.

**⚠️ Backup berkala via tab Pengaturan.** Data lokal di IndexedDB browser.

---

## Dokumentasi

- **[CLAUDE.md](CLAUDE.md)** — panduan untuk agen AI yang membangun/memelihara proyek ini
- **[docs/DATA-MODEL.md](docs/DATA-MODEL.md)** — struktur IndexedDB
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — tahapan pengembangan
- **[docs/KEPUTUSAN.md](docs/KEPUTUSAN.md)** — log keputusan desain
- **[docs/ANDROID.md](docs/ANDROID.md)** — panduan printer thermal Bluetooth (Tahap 6)

---

## Test

```bash
npm test
```

16 test untuk logika core (HPP, shift, laporan). Semua harus hijau sebelum commit.

---

## Invarian Kritis

Aturan bisnis yang **tidak boleh dilanggar** (lihat `CLAUDE.md` untuk detail):

1. **HPP snapshot ke item penjualan** — laporan profit pakai snapshot, bukan HPP master yang berubah-ubah.
2. **Harga jual juga snapshot** — ubah harga produk besok tidak mengubah struk kemarin.
3. **HPP rata-rata bergerak** — rumus khusus, termasuk kasus stok ≤ 0.
4. **Kas shift = tunai only** — QRIS/transfer masuk omzet tapi bukan laci.
5. **Setiap penjualan terikat shift** — tidak boleh jual tanpa shift terbuka.
6. **Stok via mutasi** — semua perubahan stok tercatat di `stockMoves`, tidak pernah diubah diam-diam.
7. **Void = kembalikan efek, jangan hapus** — record tetap ada untuk audit.
8. **Nomor dokumen counter atomik** — tidak ada nomor kembar/bolong.

---

## Lisensi

MIT (atau sesuaikan)
