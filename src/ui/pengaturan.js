// UI Pengaturan — identitas toko, printer, laci, backup, arsip
import { getByKey, put } from '../data/db.js';
import { pairBluetoothPrinter } from '../services/printService.js';
import { exportDatabase, importDatabase } from '../services/reportService.js';
import { autoArchiveOldData, restoreArchive } from '../services/archiveService.js';
import { registerShortcut } from './keyboardShortcuts.js';

let pengaturanShortcutReady = false;

export async function initPengaturanUI() {
  await renderPengaturan();
  initPengaturanShortcuts();
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

window.toggleAccordion = (id) => {
  const content = document.getElementById(`content-${id}`);
  const arrow = document.getElementById(`arrow-${id}`);
  
  content.classList.toggle('open');
  arrow.classList.toggle('open');
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

// Arsip data lama (>1 tahun)
window.archiveOldData = async () => {
  const konfirm = confirm(
    '📦 Arsipkan data transaksi >1 tahun?\n\n' +
    '✅ Database aktif jadi lebih cepat\n' +
    '✅ File arsip ter-download (simpan aman)\n' +
    '⚠️ Data lama terhapus dari database aktif (bisa restore kapan saja)\n\n' +
    'Lanjut?'
  );
  if (!konfirm) return;

  try {
    const counts = await autoArchiveOldData(12); // 12 bulan
    alert(
      `✅ Arsip berhasil!\n\n` +
      `Dihapus dari database:\n` +
      `- ${counts.sales} penjualan\n` +
      `- ${counts.purchases} barang masuk\n` +
      `- ${counts.shifts} shift\n` +
      `- ${counts.cashflow} kas masuk/keluar\n` +
      `- ${counts.stockMoves} mutasi stok\n\n` +
      `File arsip sudah didownload. Simpan aman untuk audit nanti.`
    );
    // Refresh UI
    setTimeout(() => location.reload(), 500);
  } catch (err) {
    alert('❌ Gagal arsip: ' + err.message);
  }
};

// Restore arsip dari file
window.restoreArchiveFile = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const konfirm = confirm(
      '📂 Restore arsip ini?\n\n' +
      '✅ Data dari arsip akan masuk kembali ke database\n' +
      'ℹ️ Data existing tidak tertimpa (merge safe)\n\n' +
      'Lanjut?'
    );
    if (!konfirm) return;

    try {
      const text = await file.text();
      const archive = JSON.parse(text);
      const result = await restoreArchive(archive);
      alert(
        `✅ Restore berhasil!\n\n` +
        `Dikembalikan:\n` +
        `- ${result.restored.sales} penjualan\n` +
        `- ${result.restored.purchases} barang masuk\n` +
        `- ${result.restored.shifts} shift\n` +
        `- ${result.restored.cashflow} kas masuk/keluar\n` +
        `- ${result.restored.stockMoves} mutasi stok\n\n` +
        `Halaman akan refresh.`
      );
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      alert('❌ Gagal restore arsip: ' + err.message);
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
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="flex:1; overflow-y:auto;">
    <style>
      .accordion-section { margin-bottom: 1rem; }
      .accordion-header {
        background: #fff;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transition: all 0.2s;
      }
      .accordion-header:hover { background: #f8fafc; }
      .accordion-header h2 { margin: 0; font-size: 18px; color: #0284c7; }
      .accordion-arrow { 
        font-size: 20px; 
        transition: transform 0.2s;
        color: #64748b;
      }
      .accordion-arrow.open { transform: rotate(180deg); }
      .accordion-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
      }
      .accordion-content.open { 
        max-height: 1000px;
        transition: max-height 0.5s ease-in;
      }
      .accordion-body {
        background: #fff;
        padding: 1.5rem;
        margin-top: 4px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      }
    </style>

    <div class="accordion-section">
      <div class="accordion-header" onclick="window.toggleAccordion('toko')">
        <h2>🏪 Identitas Toko</h2>
        <span class="accordion-arrow" id="arrow-toko">▼</span>
      </div>
      <div class="accordion-content" id="content-toko">
        <div class="accordion-body">
          <form id="form-toko" style="max-width:600px;">
            <div class="mb-1">
              <label>Nama Toko <span class="text-red">*</span></label>
              <input type="text" name="nama" value="${toko.value?.nama || ''}" required style="width:100%;">
            </div>
            <div class="mb-1">
              <label>Alamat</label>
              <textarea name="alamat" rows="3" style="width:100%;">${toko.value?.alamat || ''}</textarea>
            </div>
            <div class="mb-1">
              <label>Telp / WhatsApp</label>
              <input type="text" name="telp" value="${toko.value?.telp || ''}" style="width:100%;">
            </div>
            <button type="submit" class="primary" style="width:100%;">Simpan</button>
          </form>
        </div>
      </div>
    </div>

    <!-- Printer & Laci -->
    <div class="accordion-section">
      <div class="accordion-header" onclick="window.toggleAccordion('printer')">
        <h2>🖨️ Printer & Laci Kas<span class="shortcut-hint">P</span></h2>
        <span class="accordion-arrow" id="arrow-printer">▼</span>
      </div>
      <div class="accordion-content" id="content-printer">
        <div class="accordion-body">
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
    </div>

    <!-- Backup & Restore -->
    <div class="accordion-section">
      <div class="accordion-header" onclick="window.toggleAccordion('backup')">
        <h2>💾 Backup & Restore<span class="shortcut-hint">Ctrl+Shift+B</span><span class="shortcut-hint">Ctrl+Shift+R</span></h2>
        <span class="accordion-arrow" id="arrow-backup">▼</span>
      </div>
      <div class="accordion-content" id="content-backup">
        <div class="accordion-body" style="background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border:2px solid #f59e0b;">
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
      </div>
    </div>

    <!-- Arsip Data Lama (NEW) -->
    <div class="accordion-section">
      <div class="accordion-header" onclick="window.toggleAccordion('arsip')">
        <h2>📦 Arsip Data<span class="shortcut-hint">A</span></h2>
        <span class="accordion-arrow" id="arrow-arsip">▼</span>
      </div>
      <div class="accordion-content" id="content-arsip">
        <div class="accordion-body" style="background:linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border:2px solid #0284c7;">
          <p style="color:#1e40af; font-size:13px; margin-bottom:1rem; line-height:1.5;">
            <strong>Masalah:</strong> Data transaksi bertahun-tahun bikin query laporan lambat.<br>
            <strong>Solusi:</strong> Arsipkan data >1 tahun (download JSON terpisah), hapus dari database aktif. Restore kapan butuh audit.
          </p>
          <div style="display:flex; gap:8px; margin-bottom:1rem;">
            <button onclick="window.archiveOldData()" class="primary" style="flex:1; background:#f59e0b;">
              📦 Arsip Data >1 Tahun
            </button>
            <button onclick="window.restoreArchiveFile()" class="secondary" style="flex:1;">
              📂 Restore Arsip
            </button>
          </div>
          <div style="padding:12px; background:#fff; border-radius:6px; font-size:12px; color:#64748b;">
            ⚡ <strong>Performa:</strong> Arsip rutin (misal tiap 6-12 bulan) jaga database tetap cepat.<br>
            💾 File arsip tersimpan terpisah, tidak hilang kalau clear browser data.
          </div>
        </div>
      </div>
    </div>

    <!-- Pengaturan Umum -->
    <div class="accordion-section">
      <div class="accordion-header" onclick="window.toggleAccordion('umum')">
        <h2>⚙️ Pengaturan Umum</h2>
        <span class="accordion-arrow" id="arrow-umum">▼</span>
      </div>
      <div class="accordion-content" id="content-umum">
        <div class="accordion-body">
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

// Shortcut pengaturan
function initPengaturanShortcuts() {
  if (pengaturanShortcutReady) return;
  pengaturanShortcutReady = true;
  const T = 'pengaturan';

  registerShortcut('ctrl+shift+b', () => { window.exportBackup(); }, { tab: T, allowInInput: true });
  registerShortcut('ctrl+shift+r', () => { window.importBackup(); }, { tab: T, allowInInput: true });

  const openSection = (id) => {
    const content = document.getElementById(`content-${id}`);
    if (!content) return false;
    if (!content.classList.contains('open')) window.toggleAccordion(id);
    content.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return true;
  };

  registerShortcut('p', () => openSection('printer') || false, { tab: T });
  registerShortcut('a', () => openSection('arsip') || false, { tab: T });
}

window.initPengaturanUI = initPengaturanUI;
