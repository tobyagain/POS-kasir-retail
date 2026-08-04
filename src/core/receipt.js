// receipt.js — build dokumen struk netral (platform-agnostic)
// Output: array baris dengan { type, content, align?, size?, separator? }
// Renderer (HTML/ESC-POS) mengubah dokumen ini jadi output final

export function buildReceipt(sale, toko) {
  const lines = [];

  // Header toko
  lines.push({ type: 'text', content: toko.nama, align: 'center', size: 'large' });
  if (toko.alamat) lines.push({ type: 'text', content: toko.alamat, align: 'center' });
  if (toko.telp) lines.push({ type: 'text', content: toko.telp, align: 'center' });
  lines.push({ type: 'separator' });

  // Info transaksi
  lines.push({ type: 'text', content: `No: ${sale.noStruk}` });
  lines.push({ type: 'text', content: `Tanggal: ${formatTanggal(sale.tanggal)}` });
  lines.push({ type: 'text', content: `Kasir: ${sale.kasir}` });
  lines.push({ type: 'separator' });

  // Items
  sale.items.forEach(item => {
    lines.push({
      type: 'item',
      nama: item.nama,
      qty: item.qty,
      harga: item.hargaJualSnapshot,
      subtotal: item.subtotal
    });
    if (item.diskonItem > 0) {
      lines.push({
        type: 'text',
        content: `  Diskon: -${formatRupiah(item.diskonItem)}`,
        align: 'left'
      });
    }
  });

  lines.push({ type: 'separator' });

  // Total
  lines.push({
    type: 'row',
    left: 'Subtotal',
    right: formatRupiah(sale.totalBruto),
    bold: false
  });

  if (sale.diskonNota > 0) {
    lines.push({
      type: 'row',
      left: 'Diskon Nota',
      right: `-${formatRupiah(sale.diskonNota)}`,
      bold: false
    });
  }

  lines.push({
    type: 'row',
    left: 'TOTAL',
    right: formatRupiah(sale.totalNetto),
    bold: true
  });

  lines.push({ type: 'separator' });

  // Pembayaran
  sale.pembayaran.forEach(p => {
    lines.push({
      type: 'row',
      left: capitalize(p.metode),
      right: formatRupiah(p.jumlah),
      bold: false
    });
  });

  const tunaiTotal = sale.pembayaran
    .filter(p => p.metode === 'tunai')
    .reduce((sum, p) => sum + p.jumlah, 0);

  if (tunaiTotal > 0 && sale.kembalian > 0) {
    lines.push({
      type: 'row',
      left: 'Kembalian',
      right: formatRupiah(sale.kembalian),
      bold: false
    });
  }

  lines.push({ type: 'separator' });

  // Footer
  lines.push({ type: 'text', content: 'Terima kasih!', align: 'center' });

  return lines;
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatTanggal(ts) {
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
