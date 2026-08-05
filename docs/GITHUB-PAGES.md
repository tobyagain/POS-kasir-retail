# Deploy ke GitHub Pages

Hosting gratis + HTTPS otomatis untuk PWA offline.

---

## Setup (Sekali, 5 Menit)

### 1. Push Repo ke GitHub

```bash
cd D:\POS-retail

# Kalau belum ada remote
git remote add origin https://github.com/USERNAME/POS-retail.git

# Push
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub Anda.

---

### 2. Enable GitHub Pages

**Via Web Dashboard:**
1. Buka repo di GitHub: `https://github.com/USERNAME/POS-retail`
2. **Settings** → **Pages** (menu kiri)
3. **Source:** Deploy from a branch
4. **Branch:** `main` → folder `/` (root) → **Save**
5. Tunggu ~1 menit → muncul URL:
   ```
   https://USERNAME.github.io/POS-retail/
   ```

---

### 3. Test PWA

**Buka URL di Chrome/Edge:**
```
https://USERNAME.github.io/POS-retail/
```

**Install PWA:**
1. Klik icon ⊕ di address bar → **Install**
2. App ter-install → **tutup browser**
3. Buka dari Start Menu / Home Screen
4. **Matikan internet** → app tetap jalan ✅

---

## Update Aplikasi

**Setiap kali edit kode:**

```bash
git add .
git commit -m "Update: ..."
git push origin main
```

**GitHub Pages auto-deploy** (~1 menit).

**User refresh browser** → Service Worker detect update → cache refresh otomatis.

---

## Kelebihan GitHub Pages vs Netlify

| Fitur | GitHub Pages | Netlify |
|-------|--------------|---------|
| **HTTPS** | ✅ Otomatis | ✅ Otomatis |
| **Custom domain** | ✅ Gratis | ✅ Gratis |
| **Auto-deploy** | ✅ Git push | ✅ Git push |
| **Build step** | ❌ Static only | ✅ Support build (npm/vite/etc) |
| **Preview deploy** | ❌ | ✅ (PR preview) |
| **Private repo** | ❌ (butuh Pro) | ✅ Gratis |
| **Speed** | ⚡ Cepat | ⚡ Lebih cepat (global CDN) |

**Untuk POS Retail (static files):** **kedua sama baiknya**.

---

## Troubleshooting

### ❌ "404 Page Not Found"

**Penyebab:** GitHub Pages butuh waktu deploy (~1 menit).

**Fix:**
1. Tunggu 1-2 menit
2. Check status: Settings → Pages → lihat "Your site is live at..."
3. Kalau masih 404, check branch benar (`main` bukan `master`)

---

### ❌ "Service Worker register failed (404 sw.js)"

**Penyebab:** Path repo di GitHub Pages = `https://user.github.io/REPO-NAME/`, bukan root `/`.

**Fix:** Update `sw.js` + `index.html` untuk handle base path:

```javascript
// sw.js - ganti baris ini:
const ASSETS = [
  './',           // ← ini jadi masalah
  './index.html',
  ...
];

// Jadi:
const ASSETS = [
  '/POS-retail/',              // ← tambah base path
  '/POS-retail/index.html',
  '/POS-retail/src/app.js',
  ...
];
```

Atau pakai **custom domain** (gratis) → path jadi root `/`.

---

### ❌ "PWA tidak jalan offline"

**Cek:**
```
DevTools → Application → Service Workers → status "activated"?
DevTools → Console → error?
```

**Common issue:** Base path salah (lihat fix di atas).

---

## Custom Domain (Opsional, Gratis)

**Kalau punya domain (mis. `posretail.com`):**

### Setup DNS (di registrar domain):
```
Type: CNAME
Name: @  (atau www)
Value: USERNAME.github.io
```

### Settings GitHub:
1. Settings → Pages → **Custom domain:** `posretail.com`
2. **Enforce HTTPS** ✅
3. Tunggu DNS propagate (~5-10 menit)

**Hasil:** `https://posretail.com` → base path jadi `/` (clean).

---

## Alternatif Hosting Gratis

| Platform | URL Format | HTTPS | Deploy |
|----------|------------|-------|--------|
| **GitHub Pages** | `user.github.io/repo` | ✅ | Git push |
| **Netlify** | `app.netlify.app` | ✅ | Git push / drag folder |
| **Vercel** | `app.vercel.app` | ✅ | Git push |
| **Cloudflare Pages** | `app.pages.dev` | ✅ | Git push / drag folder |

**Semua support PWA offline + Web Bluetooth.**

---

## Rekomendasi

**Untuk 1 toko (test/personal):**
- **GitHub Pages** (gratis, simple)

**Untuk distribusi komersial (>5 toko):**
- **Netlify** atau **Vercel** (custom domain mudah, preview deploy, better DX)

**Untuk branding domain sendiri:**
- **GitHub Pages + custom domain** (paling murah: $10/tahun domain only)

---

## User Akhir: Cara Pakai

**Instalasi (sekali):**
1. Buka `https://USERNAME.github.io/POS-retail/` di Chrome
2. Klik **Install** (icon ⊕)
3. **Selesai**

**Pakai sehari-hari:**
1. Buka dari Start Menu / Home Screen
2. **Jalan tanpa internet** (full offline)
3. Data tersimpan lokal (IndexedDB)

**Update aplikasi:**
- Developer push update → user refresh browser → cache update otomatis
- **Data user tidak hilang** (IndexedDB persist)
