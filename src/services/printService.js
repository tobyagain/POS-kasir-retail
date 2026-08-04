// printService — orkestrasi cetak struk
import { getByKey } from '../data/db.js';
import { buildReceipt } from '../core/receipt.js';
import { renderHTML } from '../print/renderHTML.js';

export async function cetakStruk(sale) {
  const toko = await getByKey('meta', 'toko');
  const printerEnabled = await getByKey('meta', 'printerEnabled');
  const printerWidth = await getByKey('meta', 'printerWidth');
  const printMethod = await getByKey('meta', 'printMethod');

  // Build dokumen netral
  const doc = buildReceipt(sale, toko.value);

  if (!printerEnabled.value) {
    // Printer mati — tampilkan/download HTML
    previewStruk(doc, printerWidth.value);
    return;
  }

  if (printMethod.value === 'browser') {
    // Mode browser: window.print()
    cetakViaBrowser(doc, printerWidth.value);
  } else {
    // Mode ESC/POS: Tahap 6
    throw new Error('ESC/POS belum diimplementasi (Tahap 6)');
  }
}

function cetakViaBrowser(doc, width) {
  const html = renderHTML(doc, width);
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  
  // Auto print setelah load
  win.onload = () => {
    win.print();
    // Close window setelah print dialog ditutup (opsional)
    // win.onafterprint = () => win.close();
  };
}

function previewStruk(doc, width) {
  const html = renderHTML(doc, width);
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  
  // Tampilkan pesan bahwa ini preview (printer mati)
  win.onload = () => {
    const body = win.document.body;
    const notice = win.document.createElement('div');
    notice.style.cssText = 'position:fixed; top:10px; left:50%; transform:translateX(-50%); background:#fef2f2; border:1px solid #fca5a5; padding:8px 16px; border-radius:4px; font-family:sans-serif; font-size:14px;';
    notice.textContent = 'Preview (printer tidak aktif)';
    body.insertBefore(notice, body.firstChild);
  };
}
