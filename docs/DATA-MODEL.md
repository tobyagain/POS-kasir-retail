# Model Data — POS Retail UMKM

IndexedDB, satu database `posretail`. Semua uang **integer rupiah**. Semua waktu
epoch ms (kecuali disebut lain). `id` string dengan prefiks per store.

Naikkan `DB_VERSION` di `src/data/db.js` setiap mengubah bentuk store, dan tulis
migrasinya. Skema di bawah = kondisi v1.

---

## Ringkasan store

| Store | Key | Index | Fungsi |
|---|---|---|---|
| `products` | `id` | `barcode`, `nama`, `kategori` | Master produk + stok + HPP berjalan |
| `purchases` | `id` | `tanggal`, `supplier` | Barang masuk (nota pembelian) |
| `sales` | `id` | `noStruk`, `shiftId`, `tanggal`, `void` | Transaksi penjualan |
| `shifts` | `id` | `status`, `buka` | Shift kasir |
| `cashflow` | `id` | `shiftId`, `tanggal`, `jenis`, `kategori` | Kas masuk/keluar non-penjualan |
| `stockMoves` | `id` | `produkId`, `tanggal`, `tipe` | Log mutasi stok (audit) |
| `meta` | `key` | — | Counter, identitas toko, pengaturan |

---

## products
```js
{
  id: 'prd_...',
  barcode: '8991234567890',   // boleh kosong utk produk tanpa barcode; index tetap
  nama: 'Indomie Goreng',
  kategori: 'Makanan',        // opsional, utk filter/laporan
  satuan: 'pcs',              // pcs/box/kg/dst
  hargaJual: 3500,            // integer rupiah — HARGA MASTER (referensi kasir, bukan laporan)
  hpp: 2800,                  // HPP rata-rata BERJALAN — berubah tiap barang masuk (INV-3)
  stok: 42,                   // = hasil mutasi (INV-6), bukan diketik bebas
  stokMin: 10,                // ambang "menipis" utk laporan
  aktif: true,                // produk nonaktif tidak muncul di kasir, tetap di riwayat
  dibuat: 1730000000000,
  diubah: 1730000000000
}
```
Catatan: `hargaJual` & `hpp` di sini adalah **master saat ini**. Transaksi
**tidak** membacanya saat laporan — transaksi menyimpan snapshot sendiri (INV-1/2).

---

## purchases  (barang masuk)
```js
{
  id: 'pur_...',
  noNota: 'BM-2408-0003',
  tanggal: 1730000000000,
  supplier: 'CV Sumber Rejeki',   // string bebas v1 (belum ada master supplier)
  items: [
    { produkId:'prd_a', nama:'Indomie Goreng', qty: 40, hargaBeli: 2750, subtotal: 110000 }
  ],
  total: 110000,
  catatan: ''
}
```
Menyimpan purchase memicu, per item: update `products.stok` & `products.hpp`
(rumus INV-3), lalu tulis `stockMoves` tipe `masuk`. Semua dalam satu transaksi IDB.

---

## sales  (penjualan)
```js
{
  id: 'sal_...',
  noStruk: 'TRX-2408-0128',       // dari counter meta (INV-8)
  shiftId: 'shf_...',             // WAJIB (INV-5)
  tanggal: 1730000000000,
  items: [
    {
      produkId: 'prd_a',
      nama: 'Indomie Goreng',      // snapshot nama (kalau produk di-rename nanti)
      qty: 2,
      hargaJualSnapshot: 3500,     // INV-2 — dikunci saat jual
      hppSnapshot: 2800,           // INV-1 — dikunci saat jual
      diskonItem: 0,               // integer rupiah, per baris
      subtotal: 7000               // qty*hargaJualSnapshot - diskonItem
    }
  ],
  diskonNota: 0,                   // diskon di level nota
  totalBruto: 7000,                // sum(subtotal item)
  totalNetto: 7000,                // totalBruto - diskonNota
  pembayaran: [                    // array — dukung bayar campur
    { metode:'tunai', jumlah: 10000 },
    // { metode:'qris', jumlah: 0 }
  ],
  dibayar: 10000,
  kembalian: 3000,                 // hanya relevan utk kelebihan tunai
  void: false,
  voidAlasan: null,
  kasir: 'Toby'                    // dari shift.kasir
}
```
Metode bayar valid: `tunai` | `qris` | `transfer` | `kartu`.
Hanya bagian `tunai` yang masuk laci/`kasSistem` (INV-4).

---

## shifts
```js
{
  id: 'shf_...',
  kasir: 'Toby',
  status: 'open',                  // 'open' | 'closed'
  buka: 1730000000000,
  tutup: null,
  modalAwal: 200000,               // kas laci saat buka
  // diisi saat tutup:
  kasFisik: null,                  // hasil hitung uang fisik oleh kasir
  kasSistem: null,                 // dihitung (INV-4) — jangan diinput manual
  selisih: null,                   // kasFisik - kasSistem
  ringkasan: null                  // snapshot angka penjualan per metode saat tutup (utk arsip cepat)
}
```
`kasSistem`, `selisih`, `ringkasan` dihitung oleh `core/shift.js` dari daftar
`sales` & `cashflow` milik shift ini — bukan diketik.

---

## cashflow  (kas non-penjualan)
```js
{
  id: 'cf_...',
  shiftId: 'shf_...',              // kas masuk/keluar selalu dalam konteks shift
  tanggal: 1730000000000,
  jenis: 'keluar',                 // 'masuk' | 'keluar'
  kategori: 'operasional',         // lihat daftar kategori di bawah
  nominal: 50000,
  keterangan: 'Beli galon + tisu',
  tunai: true                      // apakah menyentuh laci fisik (default true)
}
```
Kategori (v1, boleh ditambah di settings nanti):
- keluar: `operasional` (listrik, air, gaji, sewa, ATK) — **masuk laba bersih**
- keluar: `beli_stok` — **JANGAN** hitung ke laba bersih (sudah lewat HPP); idealnya lewat `purchases`, kategori ini hanya utk kas kecil tak ternota
- keluar: `prive` (ambil uang pribadi) — **bukan** biaya, hanya keluar kas
- masuk: `modal_tambahan`, `lain`

`core/reports.js` yang memutuskan kategori mana masuk laba bersih — bukan UI.

---

## stockMoves  (audit mutasi)
```js
{
  id: 'stk_...',
  produkId: 'prd_a',
  tanggal: 1730000000000,
  tipe: 'jual',                    // 'masuk' | 'jual' | 'opname' | 'retur' | 'void'
  qty: -2,                         // bertanda: masuk +, jual -, dst
  saldoSesudah: 40,               // stok produk setelah mutasi ini
  refId: 'sal_...',                // id sale/purchase pemicu
  refNo: 'TRX-2408-0128',
  catatan: ''
}
```
Opname: `tipe:'opname'`, `qty` = selisih koreksi (fisik - sistem), catat alasan.

---

## meta  (key-value)
Store sederhana `{ key, value }`. Isi:

**Counter**
- `counterStruk` -> `{ periode:'2408', next: 129 }`  (INV-8)
- `counterNota`  -> untuk pembelian, dst

**Identitas toko** (untuk struk)
- `toko` -> `{ nama, alamat, telp, logoDataURL? }`

**Pengaturan cetak & laci** (Bagian 7 CLAUDE.md)
- `printerEnabled` -> bool
- `printerWidth`   -> `'58'` | `'80'`
- `drawerEnabled`  -> bool
- `printMethod`    -> `'browser'` | `'escpos'`

**Pengaturan umum**
- `resetStrukBulanan` -> bool
- `kategoriProduk`    -> array string
- `metodeBayarAktif`  -> array (mis. sembunyikan 'kartu' kalau tak dipakai)

**Backup**
- `backupTerakhir` -> epoch ms (untuk pengingat backup > N hari)

---

## Aturan integritas (ditegakkan di service, bukan UI)

1. Simpan sale, kurang stok, tulis stockMoves, naikkan counter struk, catat kas tunai
   -> **satu transaksi IndexedDB** (`readwrite` atas semua store terkait). Kalau satu
   gagal, semua batal. Tidak boleh ada sale tanpa mutasi stok, atau nomor bolong.
2. Void sale -> transaksi tunggal juga: tandai void, tulis stockMoves retur, balikkan kas.
3. Barang masuk -> update produk (stok+HPP) + stockMoves, satu transaksi.
4. Tutup shift bersifat read-mostly: hitung dari data, tulis hasil ke shift. Setelah
   closed, sale baru tidak boleh menempel ke shift itu.
