# Android + ESC/POS + Bluetooth — Tahap 6

Panduan menggunakan POS Retail di Android dengan printer thermal Bluetooth.

---

## Prasyarat

1. **Browser:** Chrome atau Edge Android (Web Bluetooth support).
2. **Printer thermal Bluetooth** dengan protokol ESC/POS (58mm atau 80mm).
3. **Laci kas (opsional):** terhubung ke printer via RJ11/RJ12.
4. **HTTPS atau localhost:** Web Bluetooth hanya jalan di koneksi aman.

---

## Setup Awal

### 1. Akses aplikasi
- Host file di server HTTPS (mis. via Netlify, Vercel, atau server sendiri dengan SSL).
- Atau jalankan lokal via `python -m http.server 8000` + tunnel ngrok/Cloudflare.

### 2. Buka di Chrome Android
- Navigasi ke URL aplikasi.
- Tab **Pengaturan**.

### 3. Pair Printer Bluetooth
- Scroll ke bagian **Printer & Laci Kas**.
- Pastikan printer sudah ON & mode pairing.
- Klik **"Pair Printer Bluetooth"**.
- Browser akan tampilkan dialog — pilih printer Anda.
- Kalau berhasil: alert "Printer terpair: [nama printer]".

> **Catatan:** Pairing berlaku per-session. Kalau tutup tab, harus pair ulang.

### 4. Atur pengaturan printer
- **Cetak Struk:** ON
- **Lebar Kertas:** 58mm atau 80mm (sesuai printer fisik)
- **Buka Laci Kas:** ON (jika punya laci terhubung ke printer)
- **Metode Cetak:** `Bluetooth ESC/POS` (BUKAN "Browser Print")

Klik **Simpan Pengaturan Printer**.

---

## Cara Pakai

### Cetak Struk
1. Tab **Kasir** → scan/pilih produk → **Bayar**.
2. Struk otomatis dicetak via Bluetooth ke printer.
3. Jika **Buka Laci Kas** ON, laci terbuka otomatis setelah cetak.

### Preview Tanpa Printer
- Set **Cetak Struk** = OFF di Pengaturan.
- Struk akan tampil sebagai preview HTML (bisa download/screenshot).

---

## Troubleshooting

### "Browser tidak support Web Bluetooth"
- Pakai Chrome/Edge Android versi terbaru.
- Pastikan HTTPS (bukan HTTP biasa).

### "Printer belum dipair"
- Klik **Pair Printer Bluetooth** di Pengaturan dulu sebelum cetak.

### Struk tidak keluar / printer tidak respon
- **Cek koneksi Bluetooth:** pastikan printer tidak disconnect.
- **Re-pair:** tutup aplikasi → nyalakan ulang printer → pair lagi.
- **Cek baterai printer:** beberapa printer mati otomatis kalau low battery.

### Laci tidak buka
- **Cek kabel laci:** pastikan RJ11/RJ12 tersambung ke port drawer printer.
- **Cek printer support:** tidak semua printer thermal punya port laci.
- **Cek setting:** "Buka Laci Kas" harus ON & "Metode Cetak" = `Bluetooth ESC/POS`.

### Teks struk rusak / karakter aneh
- **Encoding issue:** ESC/POS pakai CP437/ASCII. Karakter Indonesia (é/ñ/dsb) bisa jadi kotak.
- **Solusi sementara:** hindari karakter non-ASCII di nama produk/toko.
- **Fix permanen:** implementasi CP437 charset mapping (TODO Tahap lanjut).

### Struk terpotong / layout berantakan
- **Cek lebar kertas:** setting `58mm` vs `80mm` harus match printer fisik.
- **58mm = 32 karakter/baris**, **80mm = 48 karakter/baris**.

---

## Perbedaan Android vs Windows

| Fitur | Windows (Browser Print) | Android (Bluetooth ESC/POS) |
|-------|-------------------------|------------------------------|
| Cetak | `window.print()` via driver | Kirim byte via Web Bluetooth |
| Laci kas | Diatur di driver printer | Perintah `ESC p 0 25 250` langsung |
| Preview | Browser print dialog | Langsung ke printer (no preview) |
| Pair | Tidak perlu | Wajib pair setiap session |
| Offline | ✅ Full offline | ✅ Full offline (setelah pair) |

---

## Arsitektur Cetak

**1 builder netral, 2 renderer:**

```
buildReceipt(sale, toko) → dokumen netral (array JSON)
   ├─ renderHTML(doc, width)   → HTML + CSS @page  [Windows]
   └─ renderESCPOS(doc, width) → Uint8Array ESC/POS [Android]
```

**Netralitas dijaga:** `buildReceipt()` tidak berubah antara Tahap 2 (Windows) dan Tahap 6 (Android). Renderer hanya mengubah format output, **bukan isi/layout struk**.

---

## Limitasi & TODO Tahap Lanjut

- ❌ **Logo/gambar di struk:** ESC/POS bitmap support belum diimplementasi.
- ❌ **Font Indonesia full:** charset CP437 terbatas, perlu mapping manual.
- ❌ **Reconnect otomatis:** disconnect harus pair manual ulang.
- ❌ **Multi-printer:** satu session hanya bisa pair 1 printer.
- ❌ **USB/Serial printer:** Web Bluetooth hanya untuk Bluetooth LE.

---

## Rekomendasi Printer

Printer thermal ESC/POS yang ditest/kompatibel (akan diupdate):

- *Belum ada testing di hardware nyata — Tahap 6 baru selesai secara kode.*

Kalau Anda test di printer tertentu & berhasil/gagal, laporkan via issue/PR supaya bisa dicatat di sini.

---

## Source Code Terkait

- `src/core/receipt.js` — builder dokumen netral
- `src/print/renderESCPOS.js` — renderer ESC/POS
- `src/print/drawer.js` — perintah buka laci
- `src/print/bluetooth.js` — Web Bluetooth API wrapper
- `src/services/printService.js` — orkestrasi routing browser vs ESC/POS
