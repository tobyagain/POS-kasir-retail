// UI Riwayat Penjualan (di tab Kasir, sub-view)
import { listPenjualan, voidPenjualan } from '../services/saleService.js';
import { getShiftTerbuka } from '../services/shiftService.js';

export async function showRiwayatPenjualan() {
  const shiftAktif = await getShiftTerbuka();
  
  if (!shiftAktif) {
    alert('Tidak ada shift terbuka');
    return;
  }

  const sales = await listPenjualan({ shiftId: shiftAktif.id, includeVoid: true });

  const container = document.querySelector('[data-panel="kasir"]');
  container.innerHTML = `
    <div class="flex gap-2 mb-2" style="align-items:center;">
      <button class="secondary" onclick="window.initKasirUI()">← Kembali ke Kasir</button>
      <h2 style="margin:0;">Riwayat Penjualan (Shift Aktif)</h2>
    </div>

    <table>
      <thead>
        <tr>
          <th>No. Struk</th>
          <th>Waktu</th>
          <th>Item</th>
          <th>Total</th>
          <th>Metode</th>
          <th>Status</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${sales.length === 0 ? '<tr><td colspan="7" class="text-gray" style="text-align:center;">Belum ada transaksi</td></tr>' : ''}
        ${sales.map(s => `
          <tr ${s.void ? 'style="opacity:0.5; text-decoration:line-through;"' : ''}>
            <td>${s.noStruk}</td>
            <td>${formatWaktu(s.tanggal)}</td>
            <td>${s.items.length} item</td>
            <td class="text-right">${formatRupiah(s.totalNetto)}</td>
            <td>${s.pembayaran.map(p => p.metode).join(', ')}</td>
            <td>${s.void ? '<span class="text-red">VOID</span>' : '<span class="text-green">OK</span>'}</td>
            <td>
              ${!s.void ? `<button class="secondary" onclick="window.voidTransaksi('${s.id}', '${s.noStruk}')">Void</button>` : '-'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.voidTransaksi = async (saleId, noStruk) => {
  const alasan = prompt(`Void transaksi ${noStruk}?\n\nAlasan:`, 'Salah input');
  if (!alasan) return;

  const konfirm = confirm(`Yakin void ${noStruk}?\n\nStok akan dikembalikan, transaksi ditandai void (tidak dihapus).`);
  if (!konfirm) return;

  try {
    await voidPenjualan(saleId, alasan);
    alert(`Transaksi ${noStruk} dibatalkan`);
    showRiwayatPenjualan();
  } catch (err) {
    alert('Gagal void: ' + err.message);
  }
};

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatWaktu(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

window.showRiwayatPenjualan = showRiwayatPenjualan;
