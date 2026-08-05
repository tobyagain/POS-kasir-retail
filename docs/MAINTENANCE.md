# Maintenance Data & Performa

Pengelolaan data jangka panjang untuk menjaga kecepatan aplikasi.

---

## Masalah: Database Membengkak Seiring Waktu

**Estimasi pertumbuhan data:**
- Toko kecil: 50 transaksi/hari × 365 hari = **18,250 transaksi/tahun**
- Ukuran storage: **~20 MB/tahun**
- Setelah 3 tahun: **~60 MB** data

**Storage bukan masalah utama**, tapi **query lambat** karena:
- IndexedDB scan linear (bukan pagination server-side)
- Filter via JS, bukan index DB optimal
- Laporan rentang tanggal scan ribuan record

**Gejala setelah 20k+ transaksi:**
- Tab Laporan load >2 detik
- Scroll riwayat penjualan lag
- Backup export/import lambat (file besar)

---

## Solusi: Arsip Otomatis

### Konsep
1. **Arsipkan data >1 tahun** → download JSON terpisah
2. **Hapus dari database aktif** → query jadi cepat lagi
3. **Restore kapan butuh** → untuk audit / laporan lama

**Tidak ada data hilang**, hanya pindah ke file arsip eksternal.

---

## Cara Pakai

### 1. Arsip Data Lama

**Di aplikasi:**
1. Tab **Pengaturan** → section **🗄️ Arsip Data Lama**
2. Klik **📦 Arsip Data >1 Tahun**
3. Konfirmasi → file `arsip-YYYY-MM-DD-to-YYYY-MM-DD.json` ter-download
4. **Simpan file arsip aman** (Google Drive / OneDrive / backup eksternal)

**Apa yang terjadi:**
- Data transaksi, shift, kas >1 tahun dihapus dari IndexedDB
- File arsip berisi data lengkap periode tersebut
- Database aktif jadi ringan → laporan cepat lagi

**Rekomendasi frekuensi:**
- **Toko sibuk** (100+ transaksi/hari): arsip tiap **6 bulan**
- **Toko menengah** (50 transaksi/hari): arsip tiap **12 bulan**
- **Toko kecil** (<20 transaksi/hari): arsip tiap **18-24 bulan**

---

### 2. Restore Arsip (Saat Butuh)

**Kapan butuh:**
- Audit pajak tahun lalu
- Cek riwayat transaksi lama
- Investigasi selisih kas periode tertentu

**Cara:**
1. Tab **Pengaturan** → **📂 Restore Arsip**
2. Pilih file `arsip-*.json` yang mau dibuka
3. Konfirmasi → data masuk kembali ke database (merge safe)
4. Buka laporan/riwayat seperti biasa

**⚠️ Catatan:**
- Restore **tidak timpa** data existing (merge, bukan replace)
- Setelah selesai audit, bisa **arsip ulang** untuk bersihkan lagi

---

## Alternatif: Pagination + Lazy Load (Future)

Kalau tidak mau arsip manual, solusi lanjutan:

### Tahap Lanjut (Belum Diimplementasi)
- **Pagination laporan:** load 100 transaksi/page (bukan semua sekaligus)
- **Lazy scroll:** riwayat penjualan load incremental
- **DB index optimization:** compound index `(tanggal, shiftId)` untuk filter cepat

**Trade-off:**
- ✅ Tidak perlu arsip manual
- ❌ Tetap lambat kalau data 100k+ record
- ❌ Butuh refactor UI (kompleks)

**Rekomendasi:** tetap pakai arsip untuk jangka panjang.

---

## Storage Limits Browser

| Browser | Quota Default |
|---------|---------------|
| Chrome Desktop | ~60% disk free (biasa GB-an) |
| Chrome Android | ~200 MB - 2 GB (tergantung device) |
| Edge Desktop | ~60% disk free |
| Firefox | ~10 GB |

**60 MB data = aman di semua platform.** Tapi arsip tetap penting untuk performa, bukan storage.

---

## Best Practice

### ✅ DO
- **Arsip rutin** (6-12 bulan sekali)
- **Simpan file arsip di cloud** (Google Drive / OneDrive)
- **Test restore** sekali setelah arsip pertama (pastikan file valid)
- **Backup full database** sebelum arsip (safety net)

### ❌ DON'T
- Jangan arsip kalau belum backup full dulu
- Jangan hapus file arsip setelah download (simpan permanen)
- Jangan restore arsip sambil shift terbuka (tutup shift dulu)

---

## Troubleshooting

### "Arsip gagal: transaction aborted"
- **Penyebab:** Shift masih terbuka atau ada proses write lain
- **Fix:** Tutup shift aktif → coba lagi

### "File arsip corrupt saat restore"
- **Penyebab:** Download tidak selesai / file rusak
- **Fix:** Re-download arsip dari backup cloud → restore lagi

### "Laporan masih lambat setelah arsip"
- **Cek:** Berapa banyak data tersisa? Tab **Pengaturan** → **Export Backup** → lihat ukuran file
- **Fix:** Kalau >30 MB, arsip threshold lebih agresif (6 bulan instead of 12)

---

## Estimasi Performa

| Data Size | Laporan Load Time |
|-----------|-------------------|
| <10k transaksi (~10 MB) | <0.5 detik ✅ |
| 10-30k transaksi (10-30 MB) | 0.5-2 detik ⚠️ |
| 30-60k transaksi (30-60 MB) | 2-5 detik ❌ |
| >60k transaksi (>60 MB) | >5 detik 🔥 |

**Target:** jaga di bawah 10k transaksi aktif (arsip sisanya).

---

## FAQ

**Q: Data di arsip aman?**
A: Ya, arsip = full snapshot JSON. Selama file tidak hilang/corrupt, data aman.

**Q: Bisa arsip per 6 bulan instead of 1 tahun?**
A: Ya. Edit threshold di kode: `autoArchiveOldData(6)` instead of `12`.

**Q: Arsip otomatis bisa?**
A: Belum. Harus manual via UI. Auto-purge butuh background job (IndexedDB tidak punya cron).

**Q: Restore arsip bisa di device lain?**
A: Ya. File arsip portable. Download di PC, restore di tablet Android (atau sebaliknya).

**Q: Data master produk ikut diarsip?**
A: Tidak. Hanya data transaksi (sales, purchases, shifts, cashflow, stockMoves). Master produk tetap di database aktif.
