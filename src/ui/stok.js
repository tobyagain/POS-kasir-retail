// UI Stok — opname, riwayat mutasi, produk menipis
import { listProduk } from '../services/productService.js';
import { opnameStok, riwayatMutasi, produkMenurun } from '../services/stockService.js';

export async function initStokUI() {
  await renderMain();
}

async function renderMain() {
  const menipis = await produkMenurun();
  const produkList = await listProduk({ aktif: true });

  const container = document.getElementById('stok-content');
  container.innerHTML = `
    <div class="flex gap-2 mb-2">
      <button class="primary" onclick="window.showOpnameStok()">Opname Stok</button>
    </div>

    ${menipis.length > 0 ? `
      <div style="background:#fef2f2; border:1px solid #fca5a5; padding:1rem; border-radius:4px; margin-bottom:1rem;">
        <strong class="text-red">⚠ Stok Menipis (${menipis.length} produk)</strong>
        <ul style="margin-top:0.5rem; padding-left:1.5rem;">
          ${menipis.map(p => `<li>${p.nama}: <strong>${p.stok}</strong> ${p.satuan} (min: ${p.stokMin})</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <h3>Semua Produk</h3>
    <table class="mt-1">
      <thead>
        <tr>
          <th>Nama</th>
          <th>Satuan</th>
          <th>Stok</th>
          <th>HPP</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${produkList.map(p => `
          <tr>
            <td>${p.nama}</td>
            <td>${p.satuan}</td>
            <td class="text-right ${p.stok <= p.stokMin ? 'text-red' : ''}">${p.stok}</td>
            <td class="text-right">${formatRupiah(p.hpp)}</td>
            <td>
              <button class="secondary" onclick="window.lihatMutasi('${p.id}', '${p.nama}')">Riwayat</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.showOpnameStok = async () => {
  const produkList = await listProduk({ aktif: true });

  const container = document.getElementById('stok-content');
  container.innerHTML = `
    <h2>Opname Stok</h2>
    <form id="form-opname" class="mt-2" style="max-width: 500px;">
      <div class="mb-1">
        <label>Produk <span class="text-red">*</span></label>
        <select name="produkId" required>
          <option value="">-- Pilih Produk --</option>
          ${produkList.map(p => `<option value="${p.id}">${p.nama} (sistem: ${p.stok} ${p.satuan})</option>`).join('')}
        </select>
      </div>
      <div class="mb-1">
        <label>Stok Fisik <span class="text-red">*</span></label>
        <input type="number" name="stokFisik" required>
      </div>
      <div class="mb-1">
        <label>Catatan</label>
        <textarea name="catatan" rows="2" placeholder="Alasan koreksi"></textarea>
      </div>
      <div class="flex gap-1 mt-2">
        <button type="submit" class="primary">Simpan Opname</button>
        <button type="button" class="secondary" onclick="window.initStokUI()">Batal</button>
      </div>
    </form>
  `;

  document.getElementById('form-opname').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const produkId = form.produkId.value;
    const stokFisik = parseInt(form.stokFisik.value);
    const catatan = form.catatan.value.trim();

    try {
      await opnameStok(produkId, stokFisik, catatan);
      alert('Opname disimpan');
      initStokUI();
    } catch (err) {
      alert('Gagal: ' + err.message);
    }
  };
};

window.lihatMutasi = async (produkId, namaProduk) => {
  const mutasi = await riwayatMutasi(produkId);

  const container = document.getElementById('stok-content');
  container.innerHTML = `
    <h2>Riwayat Mutasi: ${namaProduk}</h2>
    <button class="secondary mb-2" onclick="window.initStokUI()">← Kembali</button>

    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Tipe</th>
          <th>Qty</th>
          <th>Saldo Sesudah</th>
          <th>Ref</th>
          <th>Catatan</th>
        </tr>
      </thead>
      <tbody>
        ${mutasi.map(m => `
          <tr>
            <td>${formatTanggal(m.tanggal)}</td>
            <td>${tipeBadge(m.tipe)}</td>
            <td class="text-right ${m.qty < 0 ? 'text-red' : 'text-green'}">${m.qty > 0 ? '+' : ''}${m.qty}</td>
            <td class="text-right">${m.saldoSesudah}</td>
            <td>${m.refNo || '-'}</td>
            <td class="text-gray">${m.catatan}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

function tipeBadge(tipe) {
  const badges = {
    masuk: '<span style="background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:3px;font-size:12px;">Masuk</span>',
    jual: '<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:3px;font-size:12px;">Jual</span>',
    opname: '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:3px;font-size:12px;">Opname</span>',
    retur: '<span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:3px;font-size:12px;">Retur</span>',
    void: '<span style="background:#e5e7eb;color:#374151;padding:2px 6px;border-radius:3px;font-size:12px;">Void</span>'
  };
  return badges[tipe] || tipe;
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatTanggal(ts) {
  return new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

window.initStokUI = initStokUI;
