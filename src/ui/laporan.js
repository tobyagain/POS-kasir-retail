// UI Laporan
import { laporanOmzetProfit, laporanProdukTerlaris, laporanStokMenurun, laporanShift, exportDatabase, importDatabase } from '../services/reportService.js';

export async function initLaporanUI() {
  await renderLaporan();
}

async function renderLaporan() {
  const container = document.querySelector('[data-panel="laporan"]');
  container.innerHTML = `
    <h2>Laporan</h2>

    <div style="background:#fff; padding:1.5rem; border-radius:4px; margin-bottom:1rem;">
      <h3>Laporan Omzet & Profit</h3>
      <form id="form-rentang" class="mt-2 flex gap-1" style="align-items:flex-end;">
        <div>
          <label>Dari Tanggal</label>
          <input type="date" name="dari" required>
        </div>
        <div>
          <label>Sampai Tanggal</label>
          <input type="date" name="sampai" required>
        </div>
        <button type="submit" class="primary">Lihat Laporan</button>
        <button type="button" class="secondary" onclick="window.laporanHariIni()">Hari Ini</button>
      </form>
      <div id="hasil-laporan" class="mt-2"></div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1rem;">
      <div style="background:#fff; padding:1.5rem; border-radius:4px;">
        <h3>Stok Menipis</h3>
        <div id="stok-menipis-content" class="mt-1"></div>
      </div>

      <div style="background:#fff; padding:1.5rem; border-radius:4px;">
        <h3>Produk Terlaris</h3>
        <div id="produk-terlaris-content" class="mt-1"></div>
      </div>
    </div>

    <div style="background:#fff; padding:1.5rem; border-radius:4px; margin-bottom:1rem;">
      <h3>Riwayat Shift</h3>
      <div id="riwayat-shift-content" class="mt-1"></div>
    </div>

    <div style="background:#fff; padding:1.5rem; border-radius:4px;">
      <h3>Backup & Restore</h3>
      <div class="flex gap-1 mt-2">
        <button class="primary" onclick="window.exportBackup()">Export Backup (JSON)</button>
        <button class="secondary" onclick="window.importBackup()">Import Backup</button>
      </div>
      <p class="text-gray mt-1" style="font-size:12px;">Export: download semua data sebagai JSON. Import: restore dari file JSON (overwrite semua data).</p>
    </div>
  `;

  // Load stok menipis & shift
  await loadStokMenurun();
  await loadRiwayatShift();

  // Handler form rentang
  document.getElementById('form-rentang').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const dari = new Date(form.dari.value).getTime();
    const sampai = new Date(form.sampai.value).setHours(23, 59, 59, 999);
    await loadLaporan(dari, sampai);
  };
}

window.laporanHariIni = async () => {
  const today = new Date();
  const dari = today.setHours(0, 0, 0, 0);
  const sampai = today.setHours(23, 59, 59, 999);
  
  const form = document.getElementById('form-rentang');
  form.dari.valueAsDate = new Date(dari);
  form.sampai.valueAsDate = new Date(sampai);

  await loadLaporan(dari, sampai);
};

async function loadLaporan(dari, sampai) {
  const hasil = document.getElementById('hasil-laporan');
  hasil.innerHTML = '<p class="text-gray">Loading...</p>';

  try {
    const laporan = await laporanOmzetProfit(dari, sampai);
    const terlaris = await laporanProdukTerlaris(dari, sampai, 5);

    hasil.innerHTML = `
      <div style="border:1px solid #e5e7eb; padding:1rem; border-radius:4px; margin-top:1rem;">
        <div class="flex" style="justify-content:space-between; margin-bottom:1rem;">
          <div>
            <div class="text-gray" style="font-size:12px;">Total Transaksi</div>
            <div style="font-size:20px; font-weight:600;">${laporan.totalTransaksi}</div>
          </div>
          <div>
            <div class="text-gray" style="font-size:12px;">Total Omzet</div>
            <div style="font-size:20px; font-weight:600;">${formatRupiah(laporan.totalOmzet)}</div>
          </div>
          <div>
            <div class="text-gray" style="font-size:12px;">Laba Kotor</div>
            <div style="font-size:20px; font-weight:600;" class="text-green">${formatRupiah(laporan.labaKotor)}</div>
          </div>
          <div>
            <div class="text-gray" style="font-size:12px;">Laba Bersih</div>
            <div style="font-size:20px; font-weight:600;" class="${laporan.labaBersih >= 0 ? 'text-green' : 'text-red'}">${formatRupiah(laporan.labaBersih)}</div>
          </div>
        </div>

        <div style="border-top:1px solid #e5e7eb; padding-top:1rem;">
          <strong>Per Metode Pembayaran:</strong>
          ${Object.entries(laporan.perMetode).map(([metode, jumlah]) => `
            <div class="flex" style="justify-content:space-between; margin-top:0.5rem;">
              <span>${capitalize(metode)}</span>
              <span>${formatRupiah(jumlah)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Update produk terlaris
    const terlarisContent = document.getElementById('produk-terlaris-content');
    if (terlaris.length === 0) {
      terlarisContent.innerHTML = '<p class="text-gray">Tidak ada data</p>';
    } else {
      terlarisContent.innerHTML = `
        <ol style="padding-left:1.5rem;">
          ${terlaris.map(p => `<li>${p.nama}: <strong>${p.terjual}</strong> ${p.satuan}</li>`).join('')}
        </ol>
      `;
    }
  } catch (err) {
    hasil.innerHTML = `<p class="text-red">Gagal: ${err.message}</p>`;
  }
}

async function loadStokMenurun() {
  const content = document.getElementById('stok-menipis-content');
  const produk = await laporanStokMenurun();

  if (produk.length === 0) {
    content.innerHTML = '<p class="text-gray">Semua stok aman</p>';
  } else {
    content.innerHTML = `
      <ul style="padding-left:1.5rem;">
        ${produk.map(p => `<li class="text-red">${p.nama}: <strong>${p.stok}</strong> ${p.satuan} (min: ${p.stokMin})</li>`).join('')}
      </ul>
    `;
  }
}

async function loadRiwayatShift() {
  const content = document.getElementById('riwayat-shift-content');
  const shifts = await laporanShift(10);

  content.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Kasir</th>
          <th>Buka</th>
          <th>Tutup</th>
          <th>Omzet</th>
          <th>Selisih</th>
        </tr>
      </thead>
      <tbody>
        ${shifts.map(s => `
          <tr>
            <td>${s.kasir}</td>
            <td>${formatWaktu(s.buka)}</td>
            <td>${s.tutup ? formatWaktu(s.tutup) : '-'}</td>
            <td class="text-right">${s.ringkasan ? formatRupiah(s.ringkasan.omzet) : '-'}</td>
            <td class="text-right ${s.selisih && s.selisih !== 0 ? (s.selisih > 0 ? 'text-green' : 'text-red') : ''}">${s.selisih !== null ? formatRupiah(s.selisih) : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

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
    alert('Backup berhasil diexport');
  } catch (err) {
    alert('Gagal export: ' + err.message);
  }
};

window.importBackup = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const konfirm = confirm('Import backup akan MENIMPA semua data saat ini. Yakin?');
    if (!konfirm) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await importDatabase(backup);
      alert('Backup berhasil diimport. Refresh halaman.');
      location.reload();
    } catch (err) {
      alert('Gagal import: ' + err.message);
    }
  };
  input.click();
};

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatWaktu(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

window.initLaporanUI = initLaporanUI;
