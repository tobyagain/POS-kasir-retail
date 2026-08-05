// printService — orkestrasi cetak struk
import { getByKey } from '../data/db.js';
import { buildReceipt } from '../core/receipt.js';
import { renderHTML } from '../print/renderHTML.js';
import { renderESCPOS } from '../print/renderESCPOS.js';
import { openDrawer } from '../print/drawer.js';
import { printBytes, isBluetoothSupported } from '../print/bluetooth.js';

export async function cetakStruk(sale) {
  const toko = await getByKey('meta', 'toko');
  const printerEnabled = await getByKey('meta', 'printerEnabled');
  const printerWidth = await getByKey('meta', 'printerWidth');
  const printMethod = await getByKey('meta', 'printMethod');
  const drawerEnabled = await getByKey('meta', 'drawerEnabled');

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
  } else if (printMethod.value === 'escpos') {
    // Mode ESC/POS: Bluetooth
    await cetakViaESCPOS(doc, printerWidth.value, drawerEnabled.value);
  } else {
    throw new Error('printMethod tidak valid');
  }
}

function cetakViaBrowser(doc, width) {
  const html = renderHTML(doc, width);
  
  // Buka popup window (bukan new tab)
  const win = window.open('', 'PrintWindow', 'width=800,height=600,scrollbars=yes');
  if (!win) {
    alert('⚠️ Popup diblok. Izinkan popup untuk cetak.');
    return;
  }
  
  win.document.write(html);
  win.document.close();
  
  // Auto print setelah load
  win.onload = () => {
    win.print();
    // Auto close setelah print dialog ditutup
    win.onafterprint = () => {
      setTimeout(() => win.close(), 500);
    };
  };
}

async function cetakViaESCPOS(doc, width, drawerEnabled) {
  if (!isBluetoothSupported()) {
    throw new Error('Browser tidak support Web Bluetooth. Gunakan Chrome/Edge Android.');
  }

  try {
    // Render ESC/POS
    const bytes = renderESCPOS(doc, width);

    // Kirim ke printer
    await printBytes(bytes);

    // Buka laci (opsional)
    if (drawerEnabled) {
      const drawerCmd = openDrawer();
      await printBytes(drawerCmd);
    }
  } catch (err) {
    throw new Error(`Gagal cetak ESC/POS: ${err.message}`);
  }
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

// Helper: pair printer (dipanggil dari UI Pengaturan)
export async function pairBluetoothPrinter() {
  const { pairPrinter } = await import('../print/bluetooth.js');
  return pairPrinter();
}
