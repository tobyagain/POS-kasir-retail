// renderESCPOS.js — render dokumen struk ke ESC/POS byte array
// Untuk printer thermal via Bluetooth (Android, Tahap 6)

// ESC/POS commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;
const INIT = [ESC, 0x40]; // Initialize printer
const ALIGN_LEFT = [ESC, 0x61, 0x00];
const ALIGN_CENTER = [ESC, 0x61, 0x01];
const ALIGN_RIGHT = [ESC, 0x61, 0x02];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const SIZE_NORMAL = [GS, 0x21, 0x00];
const SIZE_LARGE = [GS, 0x21, 0x11]; // 2x width + height
const CUT_PAPER = [GS, 0x56, 0x00]; // Full cut

export function renderESCPOS(receiptDoc, width = '58') {
  const charWidth = width === '80' ? 48 : 32;
  const bytes = [];

  // Initialize
  bytes.push(...INIT);

  receiptDoc.forEach(line => {
    if (line.type === 'separator') {
      bytes.push(...ALIGN_LEFT);
      bytes.push(...textToBytes('-'.repeat(charWidth)));
      bytes.push(LF);
    } else if (line.type === 'text') {
      // Align
      if (line.align === 'center') bytes.push(...ALIGN_CENTER);
      else if (line.align === 'right') bytes.push(...ALIGN_RIGHT);
      else bytes.push(...ALIGN_LEFT);

      // Size
      if (line.size === 'large') bytes.push(...SIZE_LARGE);
      else bytes.push(...SIZE_NORMAL);

      // Bold
      if (line.bold) bytes.push(...BOLD_ON);

      bytes.push(...textToBytes(line.content));
      bytes.push(LF);

      // Reset
      if (line.bold) bytes.push(...BOLD_OFF);
      bytes.push(...SIZE_NORMAL);
    } else if (line.type === 'row') {
      bytes.push(...ALIGN_LEFT);
      if (line.bold) bytes.push(...BOLD_ON);

      const left = line.left;
      const right = line.right;
      const spaceCount = charWidth - left.length - right.length;
      const row = left + ' '.repeat(Math.max(0, spaceCount)) + right;

      bytes.push(...textToBytes(row));
      bytes.push(LF);

      if (line.bold) bytes.push(...BOLD_OFF);
    } else if (line.type === 'item') {
      // Item nama
      bytes.push(...ALIGN_LEFT);
      bytes.push(...BOLD_ON);
      bytes.push(...textToBytes(truncate(line.nama, charWidth)));
      bytes.push(LF);
      bytes.push(...BOLD_OFF);

      // Qty x harga = subtotal
      const qtyLine = `  ${line.qty} x ${formatRupiah(line.harga)}`;
      const subtotal = formatRupiah(line.subtotal);
      const spaceCount = charWidth - qtyLine.length - subtotal.length;
      const row = qtyLine + ' '.repeat(Math.max(0, spaceCount)) + subtotal;

      bytes.push(...textToBytes(row));
      bytes.push(LF);
    }
  });

  // Cut paper
  bytes.push(LF, LF, LF);
  bytes.push(...CUT_PAPER);

  return new Uint8Array(bytes);
}

// Helper: string → byte array (CP437 / ASCII)
function textToBytes(str) {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(str));
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function truncate(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}
