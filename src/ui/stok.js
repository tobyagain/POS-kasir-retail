// UI Stok — Blue theme redesign: opname, riwayat mutasi, produk menipis
import { listProduk } from '../services/productService.js';
import { opnameStok, riwayatMutasi, produkMenurun } from '../services/stockService.js';

export async function initStokUI() {
  await renderMain();
}

async function renderMain() {
  const menipis = await produkMenurun();
  const produkList = await listProduk({ aktif: true });

  const container = document.querySelector('[data-panel="stok"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
      <h2 style="color:#0284c7; margin:0;">📊 Kelola Stok</h2>
      <button class="primary" onclick="window.showOpnameStok()">Opname Stok</button>
    </div>

    ${menipis.length > 0 ? `
      <div class="card" style="background:#fef2f2; border:2px solid #fca5a5; margin-bottom:1.5rem;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:0.5rem;">
          <span style="font-size:24px;">⚠️</span>
          <strong style="color:#dc2626; font-size:16px;">Stok Menipis (${menipis.length} produk)</strong>
        </div>
        <ul style="margin:0; padding-left:1.5rem; color:#dc2626;">
          ${menipis.map(p => `
            <li style="margin:4px 0;">
              <strong>${p.nama}</strong>: ${p.stok} ${p.satuan} (min: ${p.stokMin})
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <div style="flex:1; overflow-y:auto;">
    <div class="card">
      <h3 style="color:#0284c7; font-size:16px; margin-bottom:1rem;">📦 Semua Produk</h3>
      <table>
        <thead>
          <tr>
            <th>Nama Produk</th>
            <th>Satuan</th>
            <th>Stok</th>
            <th>HPP</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${produkList.map(p => `
            <tr>
              <td style="font-weight:600; color:#0f172a;">${p.nama}</td>
              <td style="color:#64748b;">${p.satuan}</td>
              <td class="text-right">
                <span class="badge ${p.stok <= p.stokMin ? 'badge-danger' : 'badge-success'}">
                  ${p.stok} ${p.satuan}
                </span>
              </td>
              <td class="text-right" style="color:#64748b;">${formatRupiah(p.hpp)}</td>
              <td>
                <button class="secondary" style="padding:6px 12px; font-size:12px;" onclick="window.lihatMutasi('${p.id}', '${p.nama}')">Riwayat</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    </div>
    </div>
  `;
}

window.showOpnameStok = async () => {
  const produkList = await listProduk({ aktif: true });
  
  // Get last opname date for each product
  const lastOpname = {};
  for (const p of produkList) {
    const mutasi = await riwayatMutasi(p.id, { limit: 50 });
    const opnameMove = mutasi.find(m => m.tipe === 'opname');
    lastOpname[p.id] = opnameMove ? opnameMove.tanggal : null;
  }

  const container = document.querySelector('[data-panel="stok"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
      <button class="secondary" onclick="window.initStokUI()">← Kembali</button>
      <h2 style="color:#0284c7; margin:0;">Opname Stok</h2>
    </div>

    <div style="flex:1; overflow-y:auto;">
    <div class="card" style="max-width:900px;">
      <div style="background:#fef3c7; border:2px solid #f59e0b; border-radius:6px; padding:1rem; margin-bottom:1.5rem;">
        <div style="font-weight:600; color:#92400e; margin-bottom:4px;">ℹ️ Tentang Opname Stok</div>
        <p style="font-size:13px; color:#92400e; margin:0; line-height:1.5;">
          Opname = koreksi stok manual. Gunakan saat ada selisih fisik vs sistem (misal: barang rusak, hilang, atau salah hitung).
          Setiap perubahan tercatat sebagai mutasi dengan timestamp untuk audit trail.
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Produk</th>
            <th>Stok Sistem</th>
            <th>Stok Fisik (Baru)</th>
            <th>Selisih</th>
            <th>Terakhir Opname</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${produkList.map(p => `
            <tr id="row-${p.id}">
              <td style="font-weight:600; color:#0f172a;">${p.nama}</td>
              <td class="text-right">
                <span class="badge badge-info">${p.stok} ${p.satuan}</span>
              </td>
              <td style="width:120px;">
                <input type="number" id="input-${p.id}" value="${p.stok}" min="0" style="width:100%; padding:8px; text-align:right; font-weight:600;">
              </td>
              <td class="text-right" id="selisih-${p.id}" style="font-weight:700;">-</td>
              <td style="font-size:12px; color:#64748b;">
                ${lastOpname[p.id] ? formatTanggal(lastOpname[p.id]) : '<span style="color:#94a3b8;">Belum pernah</span>'}
              </td>
              <td>
                <button class="primary" style="padding:6px 12px; font-size:12px;" onclick="window.simpanOpname('${p.id}', ${p.stok})">Simpan</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    </div>
    </div>
  `;

  // Attach input listeners untuk hitung selisih real-time
  produkList.forEach(p => {
    const input = document.getElementById(`input-${p.id}`);
    const selisihLabel = document.getElementById(`selisih-${p.id}`);
    
    input.addEventListener('input', () => {
      const stokBaru = parseInt(input.value) || 0;
      const selisih = stokBaru - p.stok;
      selisihLabel.textContent = selisih >= 0 ? `+${selisih}` : `${selisih}`;
      selisihLabel.style.color = selisih > 0 ? '#10b981' : selisih < 0 ? '#dc2626' : '#64748b';
    });
  });
};

window.simpanOpname = async (produkId, stokLama) => {
  const input = document.getElementById(`input-${produkId}`);
  const stokBaru = parseInt(input.value);

  if (isNaN(stokBaru) || stokBaru < 0) {
    alert('Isi stok fisik yang valid');
    return;
  }

  if (stokBaru === stokLama) {
    alert('Stok tidak berubah');
    return;
  }

  const selisih = stokBaru - stokLama;
  const konfirm = confirm(`Opname stok?\n\nStok lama: ${stokLama}\nStok baru: ${stokBaru}\nSelisih: ${selisih >= 0 ? '+' : ''}${selisih}\n\nLanjutkan?`);
  if (!konfirm) return;

  try {
    await opnameStok(produkId, stokBaru);
    alert('✅ Opname berhasil disimpan');
    
    // Hapus row (visual feedback)
    const row = document.getElementById(`row-${produkId}`);
    if (row) row.style.opacity = '0.3';
  } catch (err) {
    alert('❌ Gagal: ' + err.message);
  }
};

window.lihatMutasi = async (produkId, namaProduk) => {
  const mutasi = await riwayatMutasi(produkId);

  const container = document.querySelector('[data-panel="stok"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
      <button class="secondary" onclick="window.initStokUI()">← Kembali</button>
      <h2 style="color:#0284c7; margin:0;">Riwayat Mutasi: ${namaProduk}</h2>
    </div>

    <div style="flex:1; overflow-y:auto;">
    ${mutasi.length === 0 ? `
      <div class="card" style="text-align:center; padding:3rem; color:#64748b;">
        <div style="font-size:48px; margin-bottom:1rem;">📋</div>
        <h3 style="color:#94a3b8; margin-bottom:0.5rem;">Belum Ada Mutasi</h3>
        <p>Mutasi akan muncul setelah ada barang masuk, penjualan, atau opname</p>
      </div>
    ` : `
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Keterangan</th>
              <th>Qty</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${mutasi.map(m => `
              <tr>
                <td style="color:#64748b;">${formatTanggal(m.tanggal)}</td>
                <td>
                  <span class="badge ${m.jenis === 'masuk' ? 'badge-success' : m.jenis === 'keluar' ? 'badge-danger' : 'badge-warning'}">
                    ${m.jenis}
                  </span>
                </td>
                <td style="color:#64748b;">${m.keterangan}</td>
                <td class="text-right" style="font-weight:700; color:${m.jenis === 'masuk' ? '#10b981' : '#dc2626'};">
                  ${m.jenis === 'masuk' ? '+' : '-'}${m.qty}
                </td>
                <td class="text-right" style="font-weight:700; color:#0284c7;">${m.saldo}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
    </div>
    </div>
  `;
};

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatTanggal(ts) {
  return new Date(ts).toLocaleString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit',
    minute: '2-digit'
  });
}

window.initStokUI = initStokUI;
