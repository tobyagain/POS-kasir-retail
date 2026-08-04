// UI Kas — Blue theme redesign
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
    <div class="card" style="max-width:500px; margin:2rem auto; text-align:center; padding:2rem; background:#fef2f2; border:2px solid #fca5a5;">
      <div style="font-size:48px; margin-bottom:1rem;">⚠️</div>
      <h2 style="color:#dc2626; margin-bottom:0.5rem;">Tidak Ada Shift Terbuka</h2>
      <p style="color:#991b1b; margin-bottom:1rem;">Buka shift dulu di tab <strong>Shift</strong>.</p>
      <button class="primary" onclick="window.goToShift()">Ke Tab Shift</button>
    </div>
  `;
}

window.goToShift = () => {
  document.querySelector('[data-tab="shift"]').click();
};

async function renderKas(shift) {
  const cashflows = await listCashflow({ shiftId: shift.id });
  const masuk = cashflows.filter(c => c.jenis === 'masuk').reduce((sum, c) => sum + c.nominal, 0);
  const keluar = cashflows.filter(c => c.jenis === 'keluar').reduce((sum, c) => sum + c.nominal, 0);

  const container = document.querySelector('[data-panel="kas"]');
  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
      <div class="card" style="background:linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border:2px solid #3b82f6;">
        <div style="font-size:12px; color:#1e40af; margin-bottom:4px;">SHIFT AKTIF</div>
        <div style="font-size:18px; font-weight:700; color:#1e3a8a;">${shift.kasir}</div>
        <div style="font-size:11px; color:#3b82f6; margin-top:4px;">Modal: ${formatRupiah(shift.modalAwal)}</div>
      </div>
      <div class="card" style="background:#d1fae5; border:2px solid #10b981;">
        <div style="font-size:12px; color:#047857; margin-bottom:4px;">💰 KAS MASUK</div>
        <div style="font-size:24px; font-weight:700; color:#047857;">${formatRupiah(masuk)}</div>
      </div>
      <div class="card" style="background:#fee2e2; border:2px solid #dc2626;">
        <div style="font-size:12px; color:#991b1b; margin-bottom:4px;">💸 KAS KELUAR</div>
        <div style="font-size:24px; font-weight:700; color:#991b1b;">${formatRupiah(keluar)}</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:400px 1fr; gap:1.5rem;">
      <!-- Kiri: Form Catat -->
      <div class="card">
        <h3 style="color:#0369a1; font-size:16px; margin-bottom:1rem;">📝 Catat Kas Masuk/Keluar</h3>
        <form id="form-cashflow">
          <div class="mb-1">
            <label>Jenis <span class="text-red">*</span></label>
            <select name="jenis" required id="select-jenis">
              <option value="">-- Pilih --</option>
              <option value="masuk">💰 Masuk</option>
              <option value="keluar">💸 Keluar</option>
            </select>
          </div>
          <div class="mb-1">
            <label>Kategori <span class="text-red">*</span></label>
            <select name="kategori" required id="select-kategori" disabled>
              <option value="">-- Pilih Jenis Dulu --</option>
            </select>
          </div>
          <div class="mb-1">
            <label>Nominal (Rp) <span class="text-red">*</span></label>
            <input type="number" name="nominal" required min="0" style="font-size:16px; font-weight:600;">
          </div>
          <div class="mb-1">
            <label>Keterangan</label>
            <textarea name="keterangan" rows="2" placeholder="Opsional"></textarea>
          </div>
          <div class="mb-1">
            <label>
              <input type="checkbox" name="tunai" checked>
              Transaksi Tunai (masuk/keluar laci kas)
            </label>
          </div>
          <button type="submit" class="primary" style="width:100%;">Simpan</button>
        </form>
      </div>

      <!-- Kanan: Riwayat -->
      <div class="card">
        <h3 style="color:#0369a1; font-size:16px; margin-bottom:1rem;">📋 Riwayat Cashflow Shift Ini</h3>
        ${cashflows.length === 0 ? `
          <div style="text-align:center; padding:3rem; color:#94a3b8;">
            <div style="font-size:48px; margin-bottom:1rem;">💵</div>
            <p>Belum ada transaksi kas</p>
          </div>
        ` : `
          <div style="max-height:500px; overflow-y:auto;">
            ${cashflows.map(c => `
              <div style="border:2px solid ${c.jenis === 'masuk' ? '#d1fae5' : '#fee2e2'}; border-radius:8px; padding:12px; margin-bottom:10px; background:${c.jenis === 'masuk' ? '#ecfdf5' : '#fef2f2'};">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                  <div style="flex:1;">
                    <div style="font-weight:700; font-size:14px; color:${c.jenis === 'masuk' ? '#047857' : '#991b1b'};">
                      ${c.jenis === 'masuk' ? '💰 Masuk' : '💸 Keluar'} - ${c.kategori}
                    </div>
                    <div style="font-size:12px; color:#64748b; margin-top:2px;">${formatWaktu(c.tanggal)}</div>
                  </div>
                  <div style="font-size:20px; font-weight:700; color:${c.jenis === 'masuk' ? '#10b981' : '#dc2626'};">
                    ${c.jenis === 'masuk' ? '+' : '-'}${formatRupiah(c.nominal)}
                  </div>
                </div>
                ${c.keterangan ? `<div style="font-size:12px; color:#64748b; margin-top:4px;">${c.keterangan}</div>` : ''}
                ${c.tunai ? `<div style="font-size:11px; color:#64748b; margin-top:4px;">💵 Tunai</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Kategori dinamis saat pilih jenis
  const selectJenis = document.getElementById('select-jenis');
  const selectKategori = document.getElementById('select-kategori');

  selectJenis.addEventListener('change', () => {
    const jenis = selectJenis.value;
    selectKategori.disabled = !jenis;
    
    if (jenis) {
      const kategoriList = KATEGORI[jenis] || [];
      selectKategori.innerHTML = `
        <option value="">-- Pilih Kategori --</option>
        ${kategoriList.map(k => `<option value="${k}">${k}</option>`).join('')}
      `;
    } else {
      selectKategori.innerHTML = '<option value="">-- Pilih Jenis Dulu --</option>';
    }
  });

  // Submit form
  document.getElementById('form-cashflow').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    try {
      await catatCashflow({
        shiftId: shift.id,
        jenis: form.jenis.value,
        kategori: form.kategori.value,
        nominal: parseInt(form.nominal.value),
        keterangan: form.keterangan.value.trim() || null,
        tunai: form.tunai.checked
      });

      alert('✅ Cashflow berhasil dicatat');
      initKasUI();
    } catch (err) {
      alert('❌ Gagal: ' + err.message);
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

window.initKasUI = initKasUI;
window.goToShift = goToShift;
