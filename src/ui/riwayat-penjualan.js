// UI Riwayat Penjualan (di tab Kasir, sub-view)
import { listPenjualan, voidPenjualan } from '../services/saleService.js';
import { getShiftTerbuka } from '../services/shiftService.js';
import { cetakStruk } from '../services/printService.js';

export async function showRiwayatPenjualan() {
  const shiftAktif = await getShiftTerbuka();
  
  if (!shiftAktif) {
    alert('Tidak ada shift terbuka');
    return;
  }

  const sales = await listPenjualan({ shiftId: shiftAktif.id, includeVoid: true });

  const container = document.querySelector('[data-panel="kasir"]');
  container.innerHTML = `
    <div style="height:calc(100vh - 120px); display:flex; flex-direction:column; overflow:hidden;">
      <div class="flex gap-2 mb-2" style="align-items:center;">
        <button class="secondary" data-action-global="back-kasir">← Kembali ke Kasir</button>
        <h2 style="margin:0;">Riwayat Penjualan (Shift Aktif)</h2>
      </div>

      <div style="flex:1; overflow-y:auto;">
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
                  <button class="secondary" data-action-global="reprint" data-value="${s.id}">Cetak</button>
                  ${!s.void ? `<button class="secondary" data-action-global="void-transaksi" data-value="${s.id}" data-value2="${s.noStruk}">Void</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.reprintStruk = async (saleId) => {
  try {
    const { getPenjualan } = await import('../services/saleService.js');
    const sale = await getPenjualan(saleId);
    if (!sale) {
      alert('Transaksi tidak ditemukan');
      return;
    }
    await cetakStruk(sale);
  } catch (err) {
    alert('Gagal cetak: ' + err.message);
  }
};

window.voidTransaksi = async (saleId, noStruk) => {
  const sale = await (await import('../services/saleService.js')).getPenjualan(saleId);
  if (!sale || sale.void) return;
  const alasan = prompt(`Void transaksi ${noStruk}?\n\nAlasan:`, 'Salah input');
  if (!alasan) return;

  const konfirm = confirm(`Yakin void ${noStruk}?\n\nStok akan dikembalikan, transaksi ditandai void (tidak dihapus).`);
  if (!konfirm) return;

  try {
    // Refund harus sudah dilakukan sebelum void dikonfirmasi.
    const refundSelesai = confirm(
      `Pembayaran ${formatRupiah(sale.totalNetto)} sudah dikembalikan ke pelanggan?\n\n` +
      `Tunai dikembalikan dari laci; refund digital diproses di kanal pembayarannya.`
    );
    if (!refundSelesai) return;

    await voidPenjualan(saleId, alasan, 'selesai');
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
