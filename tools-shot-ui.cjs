// Screenshot UI kasir — seed shift + produk, lalu capture
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 800 } });
  await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });

  // Seed: buka shift + produk lewat IndexedDB langsung
  const seedResult = await page.evaluate(async () => {
    return await new Promise((resolve) => {
      const req = indexedDB.open('posretail');
      req.onerror = () => resolve('open error: ' + req.error);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(['shifts', 'products'], 'readwrite');
          tx.objectStore('shifts').put({
            id: 'shf_demo', kasir: 'Demo', modalAwal: 100000, status: 'open',
            buka: Date.now(), tutup: null, selisih: null, ringkasan: null
          });
          const prods = [
            ['8991001', 'Indomie Goreng', 'Makanan', 3500, 45],
            ['8991002', 'Aqua 600ml', 'Minuman', 4000, 8],
            ['8991003', 'Kopi Kapal Api', 'Minuman', 1500, 3],
            ['8991004', 'Roti Tawar', 'Makanan', 12000, 0],
            ['8991005', 'Teh Pucuk', 'Minuman', 3500, 22],
            ['8991006', 'Beng-Beng', 'Snack', 2500, 15],
          ];
          prods.forEach(([barcode, nama, kategori, hargaJual, stok], i) => {
            tx.objectStore('products').put({
              id: 'prd_demo' + i, barcode, nama, kategori, satuan: 'pcs',
              hargaJual, hpp: hargaJual * 0.7, stok, stokMin: 10,
              aktif: true, dibuat: Date.now(), diubah: Date.now()
            });
          });
          tx.oncomplete = () => resolve('seeded');
          tx.onerror = () => resolve('tx error: ' + tx.error);
        } catch (e) {
          resolve('exception: ' + e.message);
        }
      };
    });
  });
  console.log('seed:', seedResult);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => ({
    searchInput: !!document.getElementById('input-search-produk'),
    gridChildren: document.getElementById('produk-grid')?.children.length ?? -1,
    guardText: document.querySelector('[data-panel="kasir"]')?.textContent?.slice(0, 100),
  }));
  console.log('state:', JSON.stringify(state));
  await page.screenshot({ path: 'test/shot-kasir-empty.png' });

  // Tambah 2 item ke keranjang via klik
  const rows = page.locator('[data-action="produk-row"]');
  await rows.nth(0).click();
  await rows.nth(1).click();
  await rows.nth(1).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test/shot-kasir-cart.png' });

  // Isi tunai
  await page.fill('#input-tunai', '50000');
  await page.click('[data-action="bayar-tunai"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test/shot-kasir-payment.png' });

  // Probe computed style
  const probe = await page.evaluate(() => {
    const cs = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    const total = document.getElementById('label-total')?.getBoundingClientRect();
    const bayar = document.getElementById('btn-bayar')?.getBoundingClientRect();
    return {
      bodyBg: cs('body', 'backgroundColor'),
      totalColor: cs('#label-total', 'color'),
      totalSize: cs('#label-total', 'fontSize'),
      bayarBg: cs('#btn-bayar', 'backgroundColor'),
      searchBorder: cs('#input-search-produk', 'borderColor'),
      kembalian: document.getElementById('label-kembalian')?.textContent,
      totalText: document.getElementById('label-total')?.textContent,
      noOverlap: total && bayar ? !(total.right > bayar.left && total.left < bayar.right && total.bottom > bayar.top && total.top < bayar.bottom) : 'n/a',
    };
  });
  console.log(JSON.stringify(probe, null, 2));

  await browser.close();
  console.log('OK: 3 screenshots + probe');
})().catch(e => { console.error(e.message); process.exit(1); });
