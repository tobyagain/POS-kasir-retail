// UI Shift
import { bukaShift, tutupShift, getShiftTerbuka, listShifts } from '../services/shiftService.js';

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
    <h2>Buka Shift</h2>
    <form id="form-buka-shift" class="mt-2" style="max-width:400px;">
      <div class="mb-1">
        <label>Nama Kasir <span class="text-red">*</span></label>
        <input type="text" name="kasir" required>
      </div>
      <div class="mb-1">
        <label>Modal Awal (Rp) <span class="text-red">*</span></label>
        <input type="number" name="modalAwal" required min="0">
      </div>
      <button type="submit" class="primary">Buka Shift</button>
    </form>

    ${riwayat.length > 0 ? `
      <h3 class="mt-2">Riwayat Shift</h3>
      <table class="mt-1">
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
  const container = document.querySelector('[data-panel="shift"]');
  container.innerHTML = `
    <div style="background:#d1fae5; border:1px solid #6ee7b7; padding:1.5rem; border-radius:4px; margin-bottom:2rem;">
      <h2 class="text-green">✓ Shift Aktif</h2>
      <div class="mt-1">
        <strong>Kasir:</strong> ${shift.kasir}<br>
        <strong>Buka:</strong> ${formatWaktu(shift.buka)}<br>
        <strong>Modal Awal:</strong> ${formatRupiah(shift.modalAwal)}
      </div>
    </div>

    <h2>Tutup Shift</h2>
    <form id="form-tutup-shift" class="mt-2" style="max-width:400px;">
      <div class="mb-1">
        <label>Kas Fisik (Rp) <span class="text-red">*</span></label>
        <input type="number" name="kasFisik" required min="0" placeholder="Hitung uang fisik di laci">
      </div>
      <p class="text-gray" style="font-size:12px;">Sistem akan hitung kas sistem, lalu tampilkan selisih.</p>
      <button type="submit" class="primary">Tutup Shift</button>
    </form>
  `;

  document.getElementById('form-tutup-shift').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const kasFisik = form.kasFisik.value;

    try {
      const closed = await tutupShift(shift.id, kasFisik);
      
      // Tampil ringkasan
      alert(`Shift ditutup!\n\nKas Sistem: ${formatRupiah(closed.kasSistem)}\nKas Fisik: ${formatRupiah(closed.kasFisik)}\nSelisih: ${formatRupiah(closed.selisih)} ${closed.selisih > 0 ? '(lebih)' : closed.selisih < 0 ? '(kurang)' : '(pas)'}`);
      
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

window.initShiftUI = initShiftUI;
