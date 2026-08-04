// UI Kas
import { catatCashflow, listCashflow, KATEGORI } from '../services/cashflowService.js';
import { getShiftTerbuka } from '../services/shiftService.js';

export async function initKasUI() {
  const shiftAktif = await getShiftTerbuka();

  if (!shiftAktif) {
    renderGuardShift();
    return;
  }

  await renderKas(shiftAktif);
}

function renderGuardShift() {
  const container = document.querySelector('[data-panel="kas"]');
  container.innerHTML = `
    <div style="max-width:500px; margin:2rem auto; text-align:center; padding:2rem; background:#fef2f2; border:1px solid #fca5a5; border-radius:8px;">
      <h2 class="text-red">⚠ Tidak Ada Shift Terbuka</h2>
      <p class="mt-1 text-gray">Buka shift dulu di tab <strong>Shift</strong>.</p>
      <button class="primary mt-2" onclick="window.goToShift()">Ke Tab Shift</button>
    </div>
  `;
}

async function renderKas(shift) {
  const cashflows = await listCashflow({ shiftId: shift.id });

  const container = document.querySelector('[data-panel="kas"]');
  container.innerHTML = `
    <div style="background:#d1fae5; border:1px solid #6ee7b7; padding:1rem; border-radius:4px; margin-bottom:2rem;">
      <strong>Shift Aktif:</strong> ${shift.kasir} | Modal Awal: ${formatRupiah(shift.modalAwal)}
    </div>

    <h2>Catat Kas Masuk/Keluar</h2>
    <form id="form-cashflow" class="mt-2" style="max-width:500px;">
      <div class="mb-1">
        <label>Jenis <span class="text-red">*</span></label>
        <select name="jenis" required>
          <option value="">-- Pilih --</option>
          <option value="keluar">Keluar</option>
          <option value="masuk">Masuk</option>
        </select>
      </div>
      <div class="mb-1">
        <label>Kategori <span class="text-red">*</span></label>
        <select name="kategori" required id="select-kategori">
          <option value="">-- Pilih Jenis Dulu --</option>
        </select>
      </div>
      <div class="mb-1">
        <label>Nominal (Rp) <span class="text-red">*</span></label>
        <input type="number" name="nominal" required min="0">
      </div>
      <div class="mb-1">
        <label>Keterangan</label>
        <textarea name="keterangan" rows="2" placeholder="Opsional"></textarea>
      </div>
      <div class="mb-1">
        <label>
          <input type="checkbox" name="tunai" checked>
          Tunai (mengurangi/menambah laci kas)
        </label>
      </div>
      <button type="submit" class="primary">Simpan</button>
    </form>

    <h3 class="mt-2">Riwayat Kas (Shift Ini)</h3>
    <table class="mt-1">
      <thead>
        <tr>
          <th>Waktu</th>
          <th>Jenis</th>
          <th>Kategori</th>
          <th>Nominal</th>
          <th>Keterangan</th>
        </tr>
      </thead>
      <tbody>
        ${cashflows.length === 0 ? '<tr><td colspan="5" class="text-gray" style="text-align:center;">Belum ada transaksi kas</td></tr>' : ''}
        ${cashflows.map(cf => `
          <tr>
            <td>${formatWaktu(cf.tanggal)}</td>
            <td>${cf.jenis === 'masuk' ? '<span class="text-green">Masuk</span>' : '<span class="text-red">Keluar</span>'}</td>
            <td>${cf.kategori || '-'}</td>
            <td class="text-right ${cf.jenis === 'masuk' ? 'text-green' : 'text-red'}">${cf.jenis === 'masuk' ? '+' : '-'}${formatRupiah(cf.nominal)}</td>
            <td class="text-gray">${cf.keterangan || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Handler form
  const form = document.getElementById('form-cashflow');
  const selectJenis = form.jenis;
  const selectKategori = form.kategori;

  selectJenis.addEventListener('change', () => {
    const jenis = selectJenis.value;
    if (!jenis) {
      selectKategori.innerHTML = '<option value="">-- Pilih Jenis Dulu --</option>';
      return;
    }

    const options = KATEGORI[jenis] || [];
    selectKategori.innerHTML = options.map(k => `<option value="${k}">${capitalize(k)}</option>`).join('');
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      shiftId: shift.id,
      jenis: form.jenis.value,
      kategori: form.kategori.value,
      nominal: form.nominal.value,
      keterangan: form.keterangan.value.trim(),
      tunai: form.tunai.checked
    };

    try {
      await catatCashflow(data);
      alert('Kas dicatat');
      initKasUI();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatWaktu(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function capitalize(str) {
  return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

window.initKasUI = initKasUI;
