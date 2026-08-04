// UI Pengaturan — identitas toko, printer, laci, backup
import { getByKey, put } from '../data/db.js';
import { pairBluetoothPrinter } from '../services/printService.js';
import { exportDatabase, importDatabase } from '../services/reportService.js';

export async function initPengaturanUI() {
  await renderPengaturan();
}

window.pairPrinterBluetooth = async () => {
  try {
    const result = await pairBluetoothPrinter();
    if (result.success) {
      alert(`Printer terpair: ${result.name}`);
    } else {
      alert(`Gagal pair: ${result.error}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

window.exportBackup = async () => {
  try {
    const backup = await exportDatabase();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ Backup berhasil diexport');
  } catch (err) {
    alert('❌ Gagal export: ' + err.message);
  }
};

window.importBackup = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const konfirm = confirm('⚠️ Import backup akan MENIMPA semua data saat ini.\n\nData lama akan hilang permanen. Yakin?');
    if (!konfirm) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await importDatabase(backup);
      alert('✅ Backup berhasil diimport.\n\nHalaman akan refresh.');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      alert('❌ Gagal import: ' + err.message);
    }
  };
  input.click();
};

async function renderPengaturan() {
  const toko = await getByKey('meta', 'toko');
  const printerEnabled = await getByKey('meta', 'printerEnabled');
  const printerWidth = await getByKey('meta', 'printerWidth');
  const drawerEnabled = await getByKey('meta', 'drawerEnabled');
  const printMethod = await getByKey('meta', 'printMethod');
  const resetStrukBulanan = await getByKey('meta', 'resetStrukBulanan');

  const container = document.querySelector('[data-panel="pengaturan"]');
  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
      <!-- Kiri: Identitas Toko + Printer -->
      <div>
        <!-- Identitas Toko -->
        <div class="card" style="margin-bottom:1.5rem;">
          <div class="card-header">
            <h2 style="color:#0284c7; font-size:18px;">🏪 Identitas Toko</h2>
          </div>
          <form id="form-toko">
            <div class="mb-1">
              <label>Nama Toko <span class="text-red">*</span></label>
              <input type="text" name="nama" value="${toko.value?.nama || ''}" required>
            </div>
            <div class="mb-1">
              <label>Alamat</label>
              <textarea name="alamat" rows="2">${toko.value?.alamat || ''}</textarea>
            </div>
            <div class="mb-1">
              <label>Telp / WhatsApp</label>
              <input type="text" name="telp" value="${toko.value?.telp || ''}">
            </div>
            <button type="submit" class="primary" style="width:100%;">Simpan</button>
          </form>
        </div>

        <!-- Printer & Laci -->
        <div class="card">
          <div class="card-header">
            <h2 style="color:#0284c7; font-size:18px;">🖨️ Printer & Laci Kas</h2>
          </div>
          <form id="form-printer">
            <div class="mb-1">
              <label>
                <input type="checkbox" name="printerEnabled" ${printerEnabled.value ? 'checked' : ''}>
                Aktifkan Printer
              </label>
            </div>
            <div class="mb-1">
              <label>Lebar Kertas</label>
              <select name="printerWidth">
                <option value="58" ${printerWidth.value === '58' ? 'selected' : ''}>58mm</option>
                <option value="80" ${printerWidth.value === '80' ? 'selected' : ''}>80mm</option>
              </select>
            </div>
            <div class="mb-1">
              <label>
                <input type="checkbox" name="drawerEnabled" ${drawerEnabled.value ? 'checked' : ''}>
                Buka Laci Kas Otomatis
              </label>
            </div>
            <div class="mb-1">
              <label>Metode Cetak</label>
              <select name="printMethod">
                <option value="browser" ${printMethod.value === 'browser' ? 'selected' : ''}>Browser (Windows)</option>
                <option value="escpos" ${printMethod.value === 'escpos' ? 'selected' : ''}>ESC/POS (Android Bluetooth)</option>
              </select>
            </div>
            <p style="font-size:12px; color:#64748b; margin-top:8px; padding:8px; background:#f0f9ff; border-radius:4px;">
              Mode browser: cetak via window.print(). Laci diatur di driver printer.<br>
              Mode ESC/POS: Bluetooth printer (Android/Chrome). Pair printer dulu di bawah.
            </p>
            <div style="display:flex; gap:8px; margin-top:1rem;">
              <button type="submit" class="primary" style="flex:1;">Simpan</button>
              <button type="button" class="secondary" onclick="window.pairPrinterBluetooth()">Pair Bluetooth</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Kanan: Backup & Pengaturan Umum -->
      <div>
        <!-- Backup & Restore -->
        <div class="card" style="margin-bottom:1.5rem; background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border:2px solid #f59e0b;">
          <div style="border-bottom:2px solid #f59e0b; padding-bottom:1rem; margin-bottom:1rem;">
            <h2 style="color:#92400e; font-size:18px;">💾 Backup & Restore</h2>
          </div>
          <p style="color:#92400e; font-size:13px; margin-bottom:1rem; line-height:1.5;">
            <strong>Export:</strong> Download semua data (produk, penjualan, shift, kas) sebagai file JSON.<br>
            <strong>Import:</strong> Restore dari file JSON backup. ⚠️ Data lama akan tertimpa!
          </p>
          <div style="display:flex; gap:8px;">
            <button onclick="window.exportBackup()" class="primary" style="flex:1; background:#10b981;">
              📥 Export Backup
            </button>
            <button onclick="window.importBackup()" class="secondary" style="flex:1; background:#fee2e2; color:#dc2626; border-color:#dc2626;">
              📤 Import Backup
            </button>
          </div>
          <div style="margin-top:1rem; padding:12px; background:#fff; border-radius:6px; font-size:12px; color:#64748b;">
            💡 <strong>Tips:</strong> Export backup secara berkala (misal: setiap akhir bulan) untuk keamanan data.
          </div>
        </div>

        <!-- Pengaturan Umum -->
        <div class="card">
          <div class="card-header">
            <h2 style="color:#0284c7; font-size:18px;">⚙️ Pengaturan Umum</h2>
          </div>
          <form id="form-umum">
            <div class="mb-1">
              <label>
                <input type="checkbox" name="resetStrukBulanan" ${resetStrukBulanan.value ? 'checked' : ''}>
                Reset nomor struk tiap bulan
              </label>
              <p style="font-size:12px; color:#64748b; margin-top:4px; margin-left:24px;">
                Format: TRX-YYMM-NNNN (misal: TRX-2608-0001). Nomor urut reset otomatis setiap bulan baru.
              </p>
            </div>
            <button type="submit" class="primary" style="width:100%; margin-top:1rem;">Simpan</button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Handler form toko
  document.getElementById('form-toko').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    await put('meta', {
      key: 'toko',
      value: {
        nama: form.nama.value.trim(),
        alamat: form.alamat.value.trim(),
        telp: form.telp.value.trim()
      }
    });
    alert('✅ Identitas toko disimpan');
  };

  // Handler form printer
  document.getElementById('form-printer').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    await put('meta', { key: 'printerEnabled', value: form.printerEnabled.checked });
    await put('meta', { key: 'printerWidth', value: form.printerWidth.value });
    await put('meta', { key: 'drawerEnabled', value: form.drawerEnabled.checked });
    await put('meta', { key: 'printMethod', value: form.printMethod.value });
    alert('✅ Pengaturan printer disimpan');
  };

  // Handler form umum
  document.getElementById('form-umum').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    await put('meta', { key: 'resetStrukBulanan', value: form.resetStrukBulanan.checked });
    alert('✅ Pengaturan disimpan');
  };
}

window.initPengaturanUI = initPengaturanUI;
