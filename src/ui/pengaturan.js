// UI Pengaturan — identitas toko, printer, laci, backup
import { getByKey, put } from '../data/db.js';
import { pairBluetoothPrinter } from '../services/printService.js';

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

async function renderPengaturan() {
  const toko = await getByKey('meta', 'toko');
  const printerEnabled = await getByKey('meta', 'printerEnabled');
  const printerWidth = await getByKey('meta', 'printerWidth');
  const drawerEnabled = await getByKey('meta', 'drawerEnabled');
  const printMethod = await getByKey('meta', 'printMethod');
  const resetStrukBulanan = await getByKey('meta', 'resetStrukBulanan');

  const container = document.getElementById('pengaturan-content');
  container.innerHTML = `
    <h2>Identitas Toko</h2>
    <form id="form-toko" class="mt-2" style="max-width: 500px;">
      <div class="mb-1">
        <label>Nama Toko</label>
        <input type="text" name="nama" value="${toko.value.nama}">
      </div>
      <div class="mb-1">
        <label>Alamat</label>
        <textarea name="alamat" rows="2">${toko.value.alamat}</textarea>
      </div>
      <div class="mb-1">
        <label>Telepon</label>
        <input type="text" name="telp" value="${toko.value.telp}">
      </div>
      <button type="submit" class="primary">Simpan</button>
    </form>

    <hr style="margin: 2rem 0; border:none; border-top:1px solid #e5e7eb;">

    <h2>Pengaturan Printer & Laci</h2>
    <form id="form-printer" class="mt-2" style="max-width: 500px;">
      <div class="mb-1">
        <label>
          <input type="checkbox" name="printerEnabled" ${printerEnabled.value ? 'checked' : ''}>
          Aktifkan Printer
        </label>
      </div>
      <div class="mb-1">
        <label>Lebar Struk</label>
        <select name="printerWidth">
          <option value="58" ${printerWidth.value === '58' ? 'selected' : ''}>58mm</option>
          <option value="80" ${printerWidth.value === '80' ? 'selected' : ''}>80mm</option>
        </select>
      </div>
      <div class="mb-1">
        <label>
          <input type="checkbox" name="drawerEnabled" ${drawerEnabled.value ? 'checked' : ''}>
          Aktifkan Laci Kas
        </label>
      </div>
      <div class="mb-1">
        <label>Metode Cetak</label>
        <select name="printMethod">
          <option value="browser" ${printMethod.value === 'browser' ? 'selected' : ''}>Browser (Windows)</option>
          <option value="escpos" ${printMethod.value === 'escpos' ? 'selected' : ''}>ESC/POS (Android Bluetooth)</option>
        </select>
      </div>
      <p class="text-gray" style="font-size:12px;">
        Mode browser: cetak via window.print(). Laci diatur di driver printer.<br>
        Mode ESC/POS: Bluetooth printer (Android/Chrome). Pair printer dulu di bawah.
      </p>
      <button type="submit" class="primary mt-1">Simpan</button>
      <button type="button" class="secondary mt-1" onclick="window.pairPrinterBluetooth()">Pair Bluetooth Printer</button>
    </form>

    <hr style="margin: 2rem 0; border:none; border-top:1px solid #e5e7eb;">

    <h2>Pengaturan Umum</h2>
    <form id="form-umum" class="mt-2" style="max-width: 500px;">
      <div class="mb-1">
        <label>
          <input type="checkbox" name="resetStrukBulanan" ${resetStrukBulanan.value ? 'checked' : ''}>
          Reset nomor struk tiap bulan
        </label>
      </div>
      <button type="submit" class="primary">Simpan</button>
    </form>

    <hr style="margin: 2rem 0; border:none; border-top:1px solid #e5e7eb;">

    <h2>Backup & Restore</h2>
    <p class="text-gray">Export/import database (Tahap 5)</p>
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
    alert('Identitas toko disimpan');
  };

  // Handler form printer
  document.getElementById('form-printer').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    await put('meta', { key: 'printerEnabled', value: form.printerEnabled.checked });
    await put('meta', { key: 'printerWidth', value: form.printerWidth.value });
    await put('meta', { key: 'drawerEnabled', value: form.drawerEnabled.checked });
    await put('meta', { key: 'printMethod', value: form.printMethod.value });
    alert('Pengaturan printer disimpan');
  };

  // Handler form umum
  document.getElementById('form-umum').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    await put('meta', { key: 'resetStrukBulanan', value: form.resetStrukBulanan.checked });
    alert('Pengaturan disimpan');
  };
}

window.initPengaturanUI = initPengaturanUI;
