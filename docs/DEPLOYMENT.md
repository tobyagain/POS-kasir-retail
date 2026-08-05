# Deployment Offline — POS Retail UMKM

Cara menjalankan aplikasi tanpa koneksi internet.

---

## Pilihan 1: Langsung Buka HTML (Simplest)

### Windows
```bash
# Double-click file
D:\POS-retail\index.html
```
Atau drag `index.html` ke Chrome/Edge.

### Karakteristik
- ✅ Instant, no install
- ✅ Offline penuh (IndexedDB persist)
- ✅ RAM: **~100-150 MB** (Chrome tab normal)
- ❌ Tidak auto-launch saat startup
- ❌ User bisa tutup tab tidak sengaja

**RAM breakdown:**
- Chrome base: ~50-70 MB
- POS app: ~30-50 MB (vanilla JS, ringan)
- IndexedDB cache: ~10-30 MB

Jauh lebih ringan dari Electron (~500 MB+).

---

## Pilihan 2: PWA (Progressive Web App) — Recommended

Aplikasi ter-install di sistem seperti native app, tapi tetap web.

### Setup (sekali saja)

1. **Jalankan local server** (butuh sekali untuk install PWA):
   ```bash
   cd D:\POS-retail
   python -m http.server 8000
   # atau
   npx serve .
   ```

2. **Buka di Chrome/Edge:**
   ```
   http://localhost:8000
   ```

3. **Install PWA:**
   - Chrome: klik ikon ⊕ di address bar (Install POS Retail UMKM)
   - Edge: klik … → Apps → Install this site as an app
   - Android: Chrome → ⋮ → Add to Home screen

4. **Tutup server.** Aplikasi sudah ter-cache offline.

### Setelah Install
- ✅ Icon di Start Menu / Desktop / Home Screen
- ✅ Buka jendela standalone (bukan tab browser)
- ✅ **Offline penuh** (Service Worker cache semua file)
- ✅ Auto-update saat online (cache refresh otomatis)
- ✅ RAM sama (~100-150 MB), tapi user experience lebih native

### Uninstall
- Windows: Settings → Apps → POS Retail UMKM → Uninstall
- Android: long-press icon → Uninstall

---

## Pilihan 3: Electron (Windows .exe)

Untuk distribusi ke user non-teknis yang mau installer .exe.

**Trade-off:**
- ✅ .exe installer familiar
- ✅ Auto-update via electron-updater
- ❌ **~150-200 MB installer** (bundle Chromium)
- ❌ **~500 MB RAM** saat jalan
- ❌ Butuh build step + maintenance

**Kapan pakai:**
- Multi-cabang dengan update terpusat
- User tidak comfortable buka HTML
- Butuh native integration (printer driver advanced, peripheral USB)

**Implementasi:**
```bash
npm install electron electron-builder --save-dev
```
Buat `electron/main.js` wrapper BrowserWindow → `index.html`.

---

## Pilihan 4: Android APK (WebView wrapper)

Wrap PWA jadi APK via **Trusted Web Activity** atau **Capacitor**.

**Kapan pakai:**
- Distribusi via Play Store / internal
- User tidak mau "install dari browser"

**Trade-off:**
- ✅ APK familiar
- ❌ 20-40 MB APK size
- ❌ Maintenance overhead (update cycle terpisah)

PWA langsung via Chrome lebih simple untuk UMKM.

---

## Rekomendasi per Skenario

| Skenario | Pilihan |
|----------|---------|
| **Laptop kasir tunggal, user teknis** | HTML langsung (simplest) |
| **Laptop/tablet, user umum** | PWA (native feel, offline solid) |
| **Multi-cabang, distribusi .exe** | Electron |
| **Android tablet/HP** | PWA via Chrome (no APK needed) |
| **RAM/storage terbatas** | HTML / PWA (paling ringan) |

---

## Auto-Launch saat Startup (Windows)

Untuk kasir yang mau langsung buka saat boot:

### 1. Buat shortcut
```
Target: "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=file:///D:/POS-retail/index.html --start-fullscreen
Start in: D:\POS-retail
```

### 2. Taruh di Startup folder
```
Win+R → shell:startup → paste shortcut
```

PWA juga bisa auto-launch (Settings → Apps → POS Retail → Open at login).

---

## Storage & Backup

**IndexedDB location:**
- Windows: `C:\Users\<user>\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\file__0.indexeddb.leveldb\`
- Android: `/data/data/com.android.chrome/app_chrome/Default/IndexedDB/`

**⚠️ Backup wajib via UI aplikasi (tab Pengaturan → Backup Database).**
Jangan copy manual folder IndexedDB — struktur internal bisa corrupt.

---

## Limitasi Offline

| Fitur | Status |
|-------|--------|
| Kasir, stok, shift, laporan | ✅ Full offline |
| Cetak struk (Windows print) | ✅ Offline |
| Cetak struk (Bluetooth Android) | ⚠️ Pair printer butuh online pertama kali |
| Backup/restore DB | ✅ Offline (download JSON) |
| Update aplikasi | ❌ Perlu online (atau copy file manual) |

---

## FAQ

**Q: Kalau laptop mati, data hilang?**
A: Tidak. IndexedDB persist di disk. Selama tidak uninstall Chrome / clear browsing data, data aman.

**Q: Bisa 2 kasir pakai bersama?**
A: Tidak di v1. Satu device = satu database lokal. Multi-device butuh backend (belum diimplementasi).

**Q: RAM Chrome boros, bisa pakai browser lain?**
A: Edge (Chromium) RAM usage mirip. Firefox tidak support Web Bluetooth (butuh untuk printer Android). Safari iOS tidak support IndexedDB penuh. Chrome/Edge tetap pilihan terbaik.

**Q: Bisa di-hosting online terus akses via internet?**
A: Bisa, tapi data tetap lokal per-device (IndexedDB per-browser). Hosting online hanya untuk distribusi file, bukan sinkronisasi data.
