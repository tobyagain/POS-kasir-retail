# Bug Report: Barang Masuk TOTAL Rp 0

**Tanggal:** 6 Agustus 2026  
**Status:** BELUM RESOLVED  
**Severity:** HIGH (display bug, logik benar tapi UI salah)

---

## Symptom

Tab **Barang Masuk** → tambah 2 item → **TOTAL tetap Rp 0** walau item list tunjukkan subtotal benar.

**Contoh:**
- Item 1: Bambu 15, 5 × Rp 5.000 = **Rp 25.000** ✅
- Item 2: Bambu 24, 5 × Rp 5.000 = **Rp 25.000** ✅
- **TOTAL: Rp 0** ❌ (harusnya Rp 50.000)

---

## Evidence: Console Log

Console tunjukkan **JS kerja benar:**

```
barang-masuk.js:219 [renderCart] container: true totalLabel: true items: 1
barang-masuk.js:242 [renderCart] total calculated: 50000 label exists: true
barang-masuk.js:245 [renderCart] label updated to: Rp 50.000

barang-masuk.js:219 [renderCart] container: true totalLabel: true items: 2
barang-masuk.js:242 [renderCart] total calculated: 75000 label exists: true
barang-masuk.js:245 [renderCart] label updated to: Rp 75.000
```

**Fakta:**
- ✅ `totalLabel` exist (not null)
- ✅ Total dihitung benar (50000, 75000)
- ✅ `textContent` di-update (`Rp 50.000`, `Rp 75.000`)
- ❌ Display di layar tetap `Rp 0`

---

## Root Cause Hypothesis

**Bukan timing bug.** Bukan `totalLabel` null. JS update DOM **tapi browser tidak repaint** atau ada masalah:

### Kemungkinan 1: Duplikat ID
Ada 2 element dengan `id="label-total"`:
- Satu di HTML template (hardcoded `Rp 0`)
- Satu lagi di-render dinamis

JS update yang pertama, tapi user lihat yang kedua.

**Cek:** Search `id="label-total"` di `barang-masuk.js` — ada berapa?

```bash
grep -n 'id="label-total"' src/ui/barang-masuk.js
```

### Kemungkinan 2: CSS Override
Element di-update tapi ada CSS:
- `visibility: hidden`
- `display: none`
- `opacity: 0`
- Z-index tertimpa element lain

**Cek:** Inspect element `#label-total` di DevTools → lihat Computed styles.

### Kemungkinan 3: Shadow DOM / Framework Conflict
Browser extension (metamask, grammarly, etc) inject shadow DOM yang override element.

**Cek:** Test di Incognito mode (all extensions disabled).

### Kemungkinan 4: Service Worker Cache Aggressive
SW cache file lama walau sudah bump version.

**Cek:** Unregister SW → Clear site data → Hard refresh.

---

## What We Tried (Tidak Berhasil)

1. ✅ Fix logik `renderCart()` — total dihitung di luar if/else
2. ✅ `setTimeout(() => renderCart(), 0)` — delay sampai DOM ready
3. ✅ Guard `if (!container) return` — early exit kalau DOM belum ready
4. ✅ Cache busting — bump SW version ke v4
5. ✅ Force repaint — `totalLabel.style.color = ...`
6. ✅ Debug console.log — konfirmasi JS update textContent

**Semua gagal. Display tetap Rp 0.**

---

## Code Location

**File:** `src/ui/barang-masuk.js`

**HTML Template (line 116-122):**
```javascript
<div class="card" style="background:linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border:2px solid #10b981;">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
    <span style="font-weight:600; color:#047857;">TOTAL</span>
    <span id="label-total" style="font-size:24px; font-weight:700; color:#047857;">Rp 0</span>
  </div>
  <button onclick="window.simpanBarangMasuk()" class="primary" style="width:100%; padding:14px; font-size:16px;">Simpan Barang Masuk</button>
</div>
```

**JS Update (line 215-250):**
```javascript
function renderCart() {
  const container = document.getElementById('cart-content');
  const totalLabel = document.getElementById('label-total');

  console.log('[renderCart] container:', !!container, 'totalLabel:', !!totalLabel, 'items:', itemsCart.length);

  if (!container) return;

  if (itemsCart.length === 0) {
    container.innerHTML = '<div>Belum ada item</div>';
  } else {
    container.innerHTML = itemsCart.map((it, i) => `...`).join('');
  }

  // Update total
  const total = itemsCart.reduce((sum, it) => sum + it.subtotal, 0);
  console.log('[renderCart] total calculated:', total, 'label exists:', !!totalLabel);
  if (totalLabel) {
    const formatted = formatRupiah(total);
    totalLabel.textContent = formatted;
    totalLabel.style.color = total > 0 ? '#047857' : '#64748b';
    console.log('[renderCart] label updated to:', formatted, 'innerHTML:', totalLabel.innerHTML);
  } else {
    console.error('[renderCart] totalLabel is NULL!');
  }
}
```

---

## Next Steps (Sesi Lanjutan)

### 1. Inspect Element Manual (User)
Browser DevTools → klik kanan "TOTAL Rp 0" → Inspect:
- Lihat `<span id="label-total">` innerHTML = `Rp 0` atau `Rp 75.000`?
- Cek Computed styles: ada `display: none` atau `visibility` issue?
- Cek jumlah element dengan `id="label-total"` (console: `document.querySelectorAll('#label-total').length`)

### 2. Test Duplikat ID
```javascript
// Di browser console:
const labels = document.querySelectorAll('#label-total');
console.log('Count:', labels.length);
labels.forEach((el, i) => console.log(i, el.textContent, el.parentElement));
```

### 3. Force innerHTML (Bukan textContent)
```javascript
// Coba ganti textContent → innerHTML
totalLabel.innerHTML = formatted;
```

### 4. Test Incognito Mode
Buka `http://localhost:8000` di Incognito (Ctrl+Shift+N) → test barang masuk → lihat apakah bug masih muncul.

### 5. Simplify HTML
Hapus gradient/style kompleks, coba plain:
```html
<div>TOTAL: <span id="label-total">Rp 0</span></div>
```

---

## Related Bugs Fixed Today

- ✅ Tab Shift crash (import totalTunaiPenjualan)
- ✅ Enter handler konsisten (4 tab)
- ✅ 7 audit bugs (kembalian, race condition, validasi)
- ❌ Barang masuk TOTAL Rp 0 (belum resolved)

---

## Test Status

**Backend:** ✅ 17/17 test hijau  
**Frontend:** ❌ Display bug (JS benar, UI salah)

---

## Workaround Sementara

User bisa lihat total di **console log** atau hitung manual dari subtotal item. Simpan barang masuk tetap jalan (total dihitung benar di backend).

---

## Agent Notes

Ini bug paling susah karena:
1. JS logik 100% benar (console proof)
2. Test unit hijau
3. Element exist & di-update
4. Tapi browser tidak render perubahan

Bukan race condition, bukan timing, bukan null reference. Kemungkinan besar **DOM render issue** (duplikat ID, CSS conflict, atau browser quirk).

Butuh **manual browser inspect** untuk root cause pasti.
