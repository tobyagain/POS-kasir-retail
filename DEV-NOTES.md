# DEV NOTES — POS Retail UMKM

Catatan untuk melanjutkan development / debugging / recheck. Update terakhir: 2026-09-01.

## Status saat ini

- Branch aktif: `keyboard-flow` (10 commit di atas `main`/d25a961).
- Test: **51/51 pass** (`npm test`).
- Semua fitur PRD-POS-KEYBOARD-FLOW selesai + import CSV + redesign UI.
- Belum di-merge ke `main` — menunggu user terima hasil redesign.

## Cara menjalankan

```bash
bash start-server.sh   # python -m http.server 8000
# buka http://localhost:8000
```

**PENTING**: setelah pull/update kode, lakukan **Ctrl+Shift+R** (hard refresh) sekali.
Service worker `sw.js` pakai network-first untuk `.js` (sejak v20260901-1) jadi JS selalu fresh,
tapi `index.html` & CSS masih cache-first — bump `CACHE_NAME` di `sw.js` kalau ubah aset non-JS.

## Test & verifikasi

```bash
npm test                                    # 51 test, node:test runner
for f in $(git ls-files '*.js'); do node --check "$f" || exit 1; done
```

Screenshot manual UI (butuh server jalan + Chrome):
```bash
NODE_PATH="C:\Users\tobyg\node_modules" node tools-shot-ui.cjs
# output: test/shot-kasir-{empty,cart,payment}.png + DOM probe JSON
```

`tools-shot-ui.cjs` BUKAN unit test — jangan taruh di `test/` (node --test akan mengeksekusinya dan gagal).

## Arsitektur keyboard shortcut

- `src/ui/keyboardShortcuts.js` — registry pusat. `registerShortcut(key, handler, {tab, allowInInput})`.
- Shortcut **hanya aktif di tab kasir** (keputusan user 2026-09-01). Tab lain tidak punya shortcut.
- `Alt+1..8` navigasi tab = global (didaftarkan di `bindTabNavigation()` via app.js).
- Filter: shortcut tanpa modifier diblokir saat fokus di input/textarea/select, kecuali `allowInInput: true` atau pakai Ctrl/Alt.
- **Chrome hijack**: Ctrl+T/N/W tidak bisa di-preventDefault. Jangan pakai. Ctrl+B dipakai untuk transaksi baru.
- Shortcut kasir: Ctrl+K (search), Enter (tambah), ↑↓ (pilih), Esc, F6 (harga item), Alt+←/→ (qty), Delete, F7 (diskon), F8 (tunai), Alt+Q (QRIS), Alt+Backspace (hapus pembayaran), Ctrl+Enter (bayar), Ctrl+B (reset), Ctrl+H (riwayat).

## State kasir (src/ui/kasir.js)

- `keranjang`, `pembayaranList` = state modul (hilang saat reload, persist saat pindah tab).
- `kasirRendered` flag: initKasirUI tidak re-render DOM kalau masih utuh → keranjang tetap terlihat setelah pindah tab.
- Shift berganti → keranjang direset.
- Validasi checkout di `src/core/checkout.js` (`validateCheckout`, `hitungKembalianTunai`) — murni, dites.
- Kembalian hanya dari kelebihan uang TUNAI (QRIS dianggap pas).
- `paymentInProgress` flag + disable tombol = anti double-submit.
- Cetak gagal TIDAK membatalkan transaksi; tombol "Cetak Ulang" muncul (lastSaleId).

## Import produk CSV

- Parser: `src/core/importProduk.js` (murni, 16 test di `tests/import-produk.test.js`).
- Delimiter auto-detect `;`/`,` (Excel Indonesia = `;`). Quoted field + escaped quote + CRLF didukung.
- Kolom wajib: `nama`, `hargaJual`. Opsional: `barcode`, `kategori`, `satuan`, `stokMin`.
- Barcode duplikat = skip. HPP & stok TIDAK diimport (INV — lewat Barang Masuk).
- Template: tombol "⬇ Template CSV" di tab Produk, atau `docs/template-import-produk.csv`.

## Tema UI (2026-09-01)

- Soft slate + teal. Token di `:root` `src/ui/styles.css` (`--accent: #0d9488`, `--canvas: #f1f5f9`).
- Kelas `.kasir-zone` (card), `.produk-row` (hover), `.shortcut-hint` (hidden di touch via `@media (hover:none)`).
- Total kasir 32px/800 teal. Tab lain ikut tema global via styles.css.
- Tab lain masih pakai banyak inline style biru lama (#0284c7) — belum dirapikan ke token. Kalau mau konsisten penuh, ganti inline style itu ke var().

## Print (src/services/printService.js)

- `cetakViaBrowser`: popup window → print → auto-close (onafterprint / matchMedia / hard fallback 5s).
- Guard `_done` supaya tidak double-print saat onload race dengan fallback timeout.
- ESC/POS via Web Bluetooth untuk Android (printMethod='escpos').

## Gotcha yang pernah menggigit

1. **Service worker cache-first untuk JS** → perubahan tidak pernah kelihatan. Fix: network-first untuk `.js` (sw.js).
2. **`renderProdukGrid` hilang saat rewrite kasir.js** → list produk kosong. Selalu grep fungsi yang dipanggil sebelum commit besar.
3. **Ctrl+N di-hijack Chrome** (new window) → pakai Ctrl+B.
4. **numeric-input**: format live saat ketik dengan caret preservation. Guard `dataset.numericBound` anti double-bind.
5. **Shift seed untuk test**: wajib `status: 'open'` (getShiftTerbuka filter by index status).
6. **DB name**: `posretail` (bukan `pos-retail`), version 1, di `src/data/schema.js`.
7. **Lint tool Hermes salah path** (`D:\d\POS-retail`) — abaikan, cek manual `node --check`.

## TODO / belum selesai

- [ ] Merge `keyboard-flow` → `main` setelah user terima redesign.
- [ ] Uji manual penuh flow kasir keyboard (PRD §12 acceptance: SEARCH → NEW_TRANSACTION tanpa mouse).
- [ ] Uji touch/Android (shortcut hint harus hilang, tap tetap jalan).
- [ ] Tab non-kasir: ganti inline style biru lama ke var() token (konsistensi).
- [ ] PRD §12 verifikasi uji mobile regresi.
- [ ] Opsional: export laporan ke CSV (Ctrl+E di laporan sekarang export full DB backup).

## Revert darurat

```bash
git checkout main && git branch -D keyboard-flow        # buang semua kerjaan branch
git reset --hard d25a961                                # dari dalam branch keyboard-flow
```
