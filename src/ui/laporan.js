// UI Laporan — Blue theme redesign (final tab!)
import { laporanOmzetProfit, laporanProdukTerlaris, laporanStokMenurun, laporanShift } from '../services/reportService.js';

export async function initLaporanUI() {
  await renderLaporan();
}

async function renderLaporan() {
  const container = document.querySelector('[data-panel="laporan"]');
  container.innerHTML = `
    <h2 style="color:#0284c7; margin-bottom:1.5rem;">📊 Laporan & Analisis</h2>

    <!-- Laporan Omzet & Profit -->
    <div class="card" style="margin-bottom:1.5rem;">
      <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">💰 Laporan Omzet & Profit</h3>
      <form id="form-rentang" style="display:flex; gap:8px; align-items:flex-end;">
        <div style="flex:1;">
          <label>Dari Tanggal</label>
          <input type="date" name="dari" required>
        </div>
        <div style="flex:1;">
          <label>Sampai Tanggal</label>
          <input type="date" name="sampai" required>
        </div>
        <button type="submit" class="primary">Lihat Laporan</button>
        <button type="button" class="secondary" onclick="window.laporanHariIni()">Hari Ini</button>
      </form>
      <div id="hasil-laporan" class="mt-2"></div>
    </div>

    <!-- 2 Kolom: Stok Menipis + Produk Terlaris -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
      <div class="card">
        <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">⚠️ Stok Menipis</h3>
        <div id="stok-menipis-content"></div>
      </div>

      <div class="card">
        <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">🏆 Produk Terlaris</h3>
        <div id="produk-terlaris-content"></div>
      </div>
    </div>

    <!-- Riwayat Shift -->
    <div class="card">
      <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">📅 Riwayat Shift</h3>
      <div id="riwayat-shift-content"></div>
    </div>
  `;

  // Load data awal
  await loadStokMenurun();
  await loadRiwayatShift();

  // Form submit
  document.getElementById('form-rentang').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const dari = new Date(form.dari.value).setHours(0, 0, 0, 0);
    const sampai = new Date(form.sampai.value).setHours(23, 59, 59, 999);

    await loadLaporanOmzet(dari, sampai);
    await loadProdukTerlaris(dari, sampai);
  };
}

window.laporanHariIni = () => {
  const form = document.getElementById('form-rentang');
  const today = new Date().toISOString().slice(0, 10);
  form.dari.value = today;
  form.sampai.value = today;
  form.requestSubmit();
};

async function loadLaporanOmzet(dari, sampai) {
  const hasil = document.getElementById('hasil-laporan');
  hasil.innerHTML = '<div style="text-align:center; padding:1rem; color:#64748b;">Loading...</div>';

  try {
    const laporan = await laporanOmzetProfit(dari, sampai);

    hasil.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:1rem; margin-top:1rem;">
        <div style="background:#dbeafe; border:2px solid #0284c7; border-radius:8px; padding:1rem;">
          <div style="font-size:12px; color:#1e40af; margin-bottom:4px;">OMZET</div>
          <div style="font-size:24px; font-weight:700; color:#1e3a8a;">${formatRupiah(laporan.omzet)}</div>
          <div style="font-size:11px; color:#0284c7; margin-top:4px;">${laporan.totalTransaksi} transaksi</div>
        </div>

        <div style="background:#d1fae5; border:2px solid #10b981; border-radius:8px; padding:1rem;">
          <div style="font-size:12px; color:#047857; margin-bottom:4px;">LABA KOTOR</div>
          <div style="font-size:24px; font-weight:700; color:#047857;">${formatRupiah(laporan.labaKotor)}</div>
          <div style="font-size:11px; color:#059669; margin-top:4px;">Omzet - HPP</div>
        </div>

        <div style="background:#fef3c7; border:2px solid #f59e0b; border-radius:8px; padding:1rem;">
          <div style="font-size:12px; color:#92400e; margin-bottom:4px;">BIAYA OPERASIONAL</div>
          <div style="font-size:24px; font-weight:700; color:#92400e;">${formatRupiah(laporan.biayaOperasional)}</div>
        </div>

        <div style="background:#ecfdf5; border:2px solid #10b981; border-radius:8px; padding:1rem;">
          <div style="font-size:12px; color:#065f46; margin-bottom:4px;">LABA BERSIH</div>
          <div style="font-size:28px; font-weight:700; color:#065f46;">${formatRupiah(laporan.labaBersih)}</div>
          <div style="font-size:11px; color:#059669; margin-top:4px;">Kotor - Operasional</div>
        </div>
      </div>

      ${laporan.totalTransaksi === 0 ? `
        <div style="text-align:center; padding:2rem; color:#94a3b8; margin-top:1rem;">
          <div style="font-size:32px; margin-bottom:0.5rem;">📭</div>
          <p>Tidak ada transaksi di periode ini</p>
        </div>
      ` : ''}
    `;
  } catch (err) {
    hasil.innerHTML = `<div style="color:#dc2626; padding:1rem;">❌ Error: ${err.message}</div>`;
  }
}

async function loadProdukTerlaris(dari, sampai) {
  const container = document.getElementById('produk-terlaris-content');
  container.innerHTML = '<div style="text-align:center; padding:1rem; color:#64748b;">Loading...</div>';

  try {
    const produk = await laporanProdukTerlaris(dari, sampai);

    if (produk.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:2rem; color:#94a3b8;">Tidak ada data</div>';
    } else {
      container.innerHTML = `
        <table style="font-size:13px;">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Qty Terjual</th>
              <th>Omzet</th>
            </tr>
          </thead>
          <tbody>
            ${produk.slice(0, 10).map(p => `
              <tr>
                <td style="font-weight:600; color:#0f172a;">${p.nama}</td>
                <td class="text-right"><span class="badge badge-success">${p.totalQty}</span></td>
                <td class="text-right font-bold" style="color:#10b981;">${formatRupiah(p.totalOmzet)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    container.innerHTML = `<div style="color:#dc2626;">❌ Error: ${err.message}</div>`;
  }
}

async function loadStokMenurun() {
  const container = document.getElementById('stok-menipis-content');

  try {
    const stok = await laporanStokMenurun();

    if (stok.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:2rem; color:#10b981;">✅ Semua stok aman</div>';
    } else {
      container.innerHTML = `
        <table style="font-size:13px;">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Stok</th>
              <th>Min</th>
            </tr>
          </thead>
          <tbody>
            ${stok.slice(0, 10).map(p => `
              <tr>
                <td style="font-weight:600; color:#0f172a;">${p.nama}</td>
                <td class="text-right"><span class="badge badge-danger">${p.stok} ${p.satuan}</span></td>
                <td class="text-right" style="color:#64748b;">${p.stokMin}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    container.innerHTML = `<div style="color:#dc2626;">❌ Error: ${err.message}</div>`;
  }
}

async function loadRiwayatShift() {
  const container = document.getElementById('riwayat-shift-content');

  try {
    const shifts = await laporanShift({ limit: 10 });

    if (shifts.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:2rem; color:#94a3b8;">Belum ada shift</div>';
    } else {
      container.innerHTML = `
        <table style="font-size:13px;">
          <thead>
            <tr>
              <th>Kasir</th>
              <th>Buka</th>
              <th>Tutup</th>
              <th>Omzet</th>
              <th>Transaksi</th>
              <th>Selisih</th>
            </tr>
          </thead>
          <tbody>
            ${shifts.map(s => `
              <tr>
                <td style="font-weight:600; color:#0f172a;">${s.kasir}</td>
                <td style="color:#64748b;">${formatWaktu(s.buka)}</td>
                <td style="color:#64748b;">${s.tutup ? formatWaktu(s.tutup) : '-'}</td>
                <td class="text-right font-bold" style="color:#10b981;">${s.ringkasan ? formatRupiah(s.ringkasan.omzet) : '-'}</td>
                <td class="text-right" style="color:#64748b;">${s.ringkasan ? s.ringkasan.totalTransaksi : '-'}</td>
                <td class="text-right">
                  ${s.selisih !== null ? `
                    <span class="badge ${s.selisih > 0 ? 'badge-success' : s.selisih < 0 ? 'badge-danger' : 'badge-info'}">
                      ${s.selisih >= 0 ? '+' : ''}${formatRupiah(s.selisih)}
                    </span>
                  ` : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    container.innerHTML = `<div style="color:#dc2626;">❌ Error: ${err.message}</div>`;
  }
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatWaktu(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit',
    minute: '2-digit'
  });
}

window.initLaporanUI = initLaporanUI;
window.laporanHariIni = laporanHariIni;
