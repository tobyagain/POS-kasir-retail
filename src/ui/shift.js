// UI Shift — Redesign: rincian real-time shift aktif
import { bukaShift, tutupShift, getShiftTerbuka, listShifts } from '../services/shiftService.js';
import { listPenjualan } from '../services/saleService.js';
import { listCashflow } from '../services/cashflowService.js';

export async function initShiftUI() {
  const shiftAktif = await getShiftTerbuka();
  
  if (shiftAktif) {
    await renderShiftAktif(shiftAktif);
  } else {
    await renderFormBuka();
  }
}

async function renderFormBuka() {
  const riwayat = await listShifts({ limit: 5 });

  const container = document.querySelector('[data-panel="shift"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="flex:1; overflow-y:auto;">
    <div class="card" style="max-width:500px; margin:0 auto;">
      <h2 style="color:#0284c7; margin-bottom:1.5rem;">Buka Shift Baru</h2>
      <form id="form-buka-shift">
        <div class="mb-1">
          <label>Nama Kasir <span class="text-red">*</span></label>
          <input type="text" name="kasir" required>
        </div>
        <div class="mb-1">
          <label>Modal Awal (Rp) <span class="text-red">*</span></label>
          <input type="number" name="modalAwal" required min="0" value="100000">
        </div>
        <button type="submit" class="primary" style="width:100%; margin-top:1rem;">Buka Shift</button>
      </form>
    </div>

    ${riwayat.length > 0 ? `
      <h3 class="mt-2" style="color:#0284c7;">Riwayat Shift</h3>
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
          ${riwayat.map(s => `
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
    ` : ''}
    </div>
    </div>
  `;

  document.getElementById('form-buka-shift').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await bukaShift({
        kasir: form.kasir.value.trim(),
        modalAwal: form.modalAwal.value
      });
      alert('Shift dibuka');
      initShiftUI();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };
}

async function renderShiftAktif(shift) {
  // Ambil data real-time
  const sales = await listPenjualan({ shiftId: shift.id, includeVoid: true });
  const salesValid = sales.filter(s => !s.void);
  const salesVoid = sales.filter(s => s.void);
  const cashflows = await listCashflow({ shiftId: shift.id });

  // Hitung ringkasan
  const totalTransaksi = salesValid.length;
  const totalVoid = salesVoid.length;
  const totalOmzet = salesValid.reduce((sum, s) => sum + s.totalNetto, 0);
  
  // Tunai terkumpul = tunai dibayar - kembalian (yang masuk laci)
  const totalTunai = salesValid.reduce((sum, s) => {
    const tunaiDibayar = s.pembayaran.filter(p => p.metode === 'tunai').reduce((s, p) => s + p.jumlah, 0);
    const kembalian = s.kembalian || 0;
    return sum + (tunaiDibayar - kembalian);
  }, 0);

  const kasMasuk = cashflows.filter(c => c.jenis === 'masuk' && c.tunai).reduce((sum, c) => sum + c.nominal, 0);
  const kasKeluar = cashflows.filter(c => c.jenis === 'keluar' && c.tunai).reduce((sum, c) => sum + c.nominal, 0);
  const kasSistem = shift.modalAwal + totalTunai + kasMasuk - kasKeluar;

  const container = document.querySelector('[data-panel="shift"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
      <!-- Header Info -->
      <div class="card" style="background:linear-gradient(135deg, #0284c7 0%, #0284c7 100%); color:#fff; border:none;">
        <div style="font-size:14px; opacity:0.9; margin-bottom:4px;">SHIFT AKTIF</div>
        <div style="font-size:24px; font-weight:700; margin-bottom:8px;">${shift.kasir}</div>
        <div style="font-size:13px; opacity:0.9;">Buka: ${formatWaktu(shift.buka)}</div>
        <div style="font-size:13px; opacity:0.9;">Modal: ${formatRupiah(shift.modalAwal)}</div>
      </div>

      <!-- Quick Stats -->
      <div class="card" style="background:#fff; display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
        <div>
          <div style="font-size:12px; color:#64748b; margin-bottom:4px;">Total Transaksi</div>
          <div style="font-size:28px; font-weight:700; color:#0284c7;">${totalTransaksi}</div>
          ${totalVoid > 0 ? `<div style="font-size:11px; color:#dc2626;">${totalVoid} void</div>` : ''}
        </div>
        <div>
          <div style="font-size:12px; color:#64748b; margin-bottom:4px;">Total Omzet</div>
          <div style="font-size:28px; font-weight:700; color:#10b981;">${formatRupiah(totalOmzet)}</div>
        </div>
      </div>
    </div>

    <div style="flex:1; overflow-y:auto;">
    <!-- Rincian Detail -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
      <!-- Penjualan -->
      <div class="card">
        <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">💰 Penjualan</h3>
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;">Transaksi Valid</span>
          <span style="font-weight:600;">${totalTransaksi}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;">Transaksi Void</span>
          <span style="font-weight:600; color:#dc2626;">${totalVoid}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;">Total Omzet</span>
          <span style="font-weight:700; color:#10b981;">${formatRupiah(totalOmzet)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:8px 0;">
          <span style="color:#64748b;">Tunai Terkumpul</span>
          <span style="font-weight:700; color:#0284c7;">${formatRupiah(totalTunai)}</span>
        </div>
      </div>

      <!-- Kas -->
      <div class="card">
        <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">💵 Kas</h3>
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;">Modal Awal</span>
          <span style="font-weight:600;">${formatRupiah(shift.modalAwal)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;">Kas Masuk Manual</span>
          <span style="font-weight:600; color:#10b981;">+${formatRupiah(kasMasuk)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;">Kas Keluar Manual</span>
          <span style="font-weight:600; color:#dc2626;">-${formatRupiah(kasKeluar)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:8px 0; background:#f0f9ff; margin:-8px; padding:12px; border-radius:6px; margin-top:8px;">
          <span style="font-weight:600; color:#0284c7;">Kas Sistem</span>
          <span style="font-weight:700; font-size:18px; color:#0284c7;">${formatRupiah(kasSistem)}</span>
        </div>
      </div>
    </div>

    <!-- Transaksi Terakhir -->
    ${salesValid.length > 0 ? `
      <div class="card">
        <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">📋 5 Transaksi Terakhir</h3>
        <table>
          <thead>
            <tr>
              <th>No. Struk</th>
              <th>Waktu</th>
              <th>Item</th>
              <th>Total</th>
              <th>Metode</th>
            </tr>
          </thead>
          <tbody>
            ${salesValid.slice(0, 5).map(s => `
              <tr>
                <td>${s.noStruk}</td>
                <td>${formatJam(s.tanggal)}</td>
                <td>${s.items.length} item</td>
                <td class="text-right font-bold">${formatRupiah(s.totalNetto)}</td>
                <td>${s.pembayaran.map(p => p.metode).join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- Tutup Shift -->
    <div class="card" style="margin-top:1.5rem; background:#fef3c7; border:2px solid #f59e0b;">
      <h3 style="color:#92400e; margin-bottom:1rem;">⚠️ Tutup Shift</h3>
      <div style="background:#fff; padding:1rem; border-radius:6px; margin-bottom:1rem;">
        <div style="font-size:13px; color:#64748b; margin-bottom:8px;">PREVIEW PENUTUPAN</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Kas Sistem (dihitung otomatis):</span>
          <span style="font-weight:700; color:#0284c7;">${formatRupiah(kasSistem)}</span>
        </div>
        <div style="font-size:12px; color:#64748b;">Hitung uang fisik di laci, lalu input di bawah</div>
      </div>

      <form id="form-tutup-shift" style="display:flex; gap:1rem; align-items:flex-end;">
        <div style="flex:1;">
          <label>Kas Fisik (Hitung Manual) <span class="text-red">*</span></label>
          <input type="number" name="kasFisik" required min="0" placeholder="${kasSistem}" style="font-size:16px; font-weight:700;">
        </div>
        <button type="submit" class="primary" style="padding:14px 32px; background:#dc2626;">Tutup Shift</button>
      </form>
    </div>
    </div>
    </div>
  `;

  document.getElementById('form-tutup-shift').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const kasFisik = parseInt(form.kasFisik.value);
    const selisih = kasFisik - kasSistem;

    const konfirm = confirm(`Tutup shift?\n\nKas Sistem: ${formatRupiah(kasSistem)}\nKas Fisik: ${formatRupiah(kasFisik)}\nSelisih: ${formatRupiah(selisih)} ${selisih > 0 ? '(lebih)' : selisih < 0 ? '(kurang)' : '(pas)'}\n\nLanjutkan?`);
    if (!konfirm) return;

    try {
      await tutupShift(shift.id, kasFisik);
      alert(`Shift ditutup!\n\nSelisih: ${formatRupiah(selisih)} ${selisih > 0 ? '(lebih)' : selisih < 0 ? '(kurang)' : '(pas)'}`);
      initShiftUI();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatWaktu(ts) {
  return new Date(ts).toLocaleString('id-ID', { 
    day: '2-digit', 
    month: 'short',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatJam(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

window.initShiftUI = initShiftUI;
