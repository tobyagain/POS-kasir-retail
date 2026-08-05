# Instalasi PWA untuk User Non-Teknis

Panduan install aplikasi offline tanpa ketik command terminal.

---

## Windows: 3 Cara Mudah

### **Cara 1: Double-Click File BAT (Paling Mudah)**

1. **Download/extract** folder `POS-retail` ke komputer
2. **Double-click** file `start-server.bat`
3. Jendela hitam muncul dengan tulisan:
   ```
   Server sedang dijalankan...
   Buka browser dan ketik: http://localhost:8000
   ```
4. **Buka Chrome/Edge** → ketik `http://localhost:8000` di address bar
5. **Klik icon ⊕** di address bar → **Install**
6. **Tutup jendela hitam** (Ctrl+C atau close window)
7. **Buka dari Start Menu** → cari `POS Retail` → app jalan offline

**Selesai!** Tidak perlu buka jendela hitam lagi. App sudah ter-install.

**⚠️ Prasyarat:** Python harus terinstall di Windows.
- Download: https://www.python.org/downloads/
- **Centang "Add Python to PATH"** saat install

---

### **Cara 2: Double-Click HTML (Tanpa Install PWA)**

Kalau tidak mau install PWA:

1. **Double-click** file `index.html`
2. App langsung buka di browser
3. **Semua fitur jalan**, kecuali:
   - ❌ Icon di Start Menu (harus buka dari folder)
   - ❌ Offline cache otomatis (harus selalu buka dari file)

**Cocok untuk:** test cepat atau user yang jarang pakai.

---

### **Cara 3: Installer EXE (User Benar-Benar Awam)**

Untuk distribusi ke banyak user non-teknis → buat installer `.exe` via Electron.

**Kelebihan:**
- ✅ Double-click installer → next-next-finish
- ✅ Icon di Desktop + Start Menu otomatis
- ✅ Tidak perlu Python
- ✅ Familiar untuk user Windows

**Kekurangan:**
- ❌ Ukuran installer ~150-200 MB (bundle Chromium)
- ❌ Butuh build step & maintenance
- ❌ Update app harus download installer baru (atau pakai auto-updater)

**Kapan pakai:**
- Distribusi ke >10 user non-teknis
- User tidak comfortable buka file `.bat`
- Butuh branding profesional (icon installer, publisher name)

---

## Android: Langsung dari URL

**Tidak perlu local server.** Host aplikasi di internet (gratis):

### **1. Deploy ke Netlify (5 Menit)**

**Langkah untuk developer:**
1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Deploy:
   ```bash
   cd D:\POS-retail
   netlify deploy --prod
   ```
3. Dapat URL: `https://pos-retail-umkm.netlify.app` (contoh)

**Langkah untuk user:**
1. Buka URL di Chrome Android
2. **⋮** → **Add to Home screen**
3. **Selesai!** Icon di home screen, jalan offline

---

### **2. Alternatif Hosting Gratis**

| Platform | Setup | URL Format |
|----------|-------|------------|
| **Netlify** | Drag folder ke web dashboard | `*.netlify.app` |
| **Vercel** | Connect GitHub repo | `*.vercel.app` |
| **Cloudflare Pages** | Drag folder atau GitHub | `*.pages.dev` |
| **GitHub Pages** | Push repo + enable Pages | `*.github.io` |

**Semua gratis, HTTPS otomatis, offline cache jalan.**

---

## Rekomendasi per Skenario

| User | Solusi | Alasan |
|------|--------|--------|
| **1 toko, laptop kasir, user paham komputer** | `start-server.bat` → install PWA | Simple, ringan |
| **1 toko, laptop kasir, user awam** | Double-click `index.html` langsung | Paling mudah, no install |
| **Multi-toko, distribusi >10 user Windows** | Electron installer `.exe` | Profesional, familiar |
| **Tablet Android, akses remote** | Deploy Netlify → PWA dari URL | No local server, HTTPS support Bluetooth |
| **Mix Windows + Android** | Deploy Netlify → semua akses dari URL | Satu source, semua platform |

---

## Cara Terbaik: Deploy Online (Recommended)

**Kenapa online lebih baik:**
- ✅ User Android bisa pakai (local server susah di mobile)
- ✅ User Windows cukup buka URL → install (no `.bat`)
- ✅ Update mudah: redeploy → user refresh → cache update otomatis
- ✅ HTTPS = Bluetooth printer jalan di Android
- ✅ Gratis (Netlify/Vercel/Cloudflare)

**Workflow:**
1. Developer deploy ke Netlify → dapat URL
2. Kasir buka URL di Chrome → install PWA
3. **Setelah install, jalan full offline** (IndexedDB + Service Worker)
4. Developer push update → redeploy → kasir refresh → cache update

**Data tetap lokal** (IndexedDB per-browser), hanya file aplikasi yang di-host.

---

## Panduan untuk User Awam (Copy-Paste)

### **Windows - Pakai File BAT**

**Instalasi Pertama:**
1. Extract folder `POS-retail` ke Desktop
2. Double-click file `start-server.bat`
3. Jendela hitam muncul → **jangan ditutup dulu**
4. Buka Chrome → ketik `localhost:8000` → Enter
5. Klik icon **komputer** di address bar → **Install**
6. Sekarang boleh tutup jendela hitam

**Pakai Sehari-hari:**
1. Buka **Start Menu** → ketik `POS` → klik `POS Retail UMKM`
2. Aplikasi buka seperti program biasa
3. **Tidak perlu buka jendela hitam lagi**

---

### **Android - Pakai Link Internet**

**Instalasi:**
1. Buka Chrome
2. Ketik alamat: `https://pos-retail-umkm.netlify.app` (contoh, ganti sesuai URL Anda)
3. Menu **⋮** (3 titik) → **Add to Home screen**
4. Klik **Add**

**Pakai Sehari-hari:**
1. Tap icon `POS Retail` di home screen
2. **Jalan tanpa internet** (setelah pertama kali buka)

---

## Troubleshooting User Awam

### ❌ "Jendela hitam langsung nutup sendiri"

**Penyebab:** Python tidak terinstall.

**Fix:**
1. Download Python: https://www.python.org/downloads/
2. Install → **WAJIB centang "Add Python to PATH"**
3. Restart komputer
4. Coba double-click `start-server.bat` lagi

---

### ❌ "Tidak muncul di Start Menu setelah install"

**Fix:**
1. Buka Chrome → ketik `chrome://apps`
2. Right-click `POS Retail UMKM` → **Create shortcuts**
3. Centang **Desktop** dan **Start Menu**

---

### ❌ "Aplikasi hilang setelah restart komputer"

**Penyebab:** Clear browsing data tanpa sengaja.

**Fix:** Install ulang (5 detik):
1. `start-server.bat` → buka `localhost:8000` → Install lagi

---

## Rekomendasi Final untuk Distribusi

**Untuk 1-5 toko:**
- Deploy ke **Netlify** (gratis, 5 menit setup)
- Share URL ke user
- User install PWA dari URL
- **No local server, no Python, no `.bat` file**

**Untuk >10 toko (distribusi massal):**
- Buat **Electron installer `.exe`**
- User double-click installer → next-next-finish
- Auto-update via electron-updater
- Profesional & familiar

**Mau saya buatkan Electron build script atau cukup panduan `.bat` + Netlify deploy?**
