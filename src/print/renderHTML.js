// renderHTML.js — render dokumen struk ke HTML untuk window.print()
// Mendukung 58mm (32 karakter) dan 80mm (48 karakter)

export function renderHTML(receiptDoc, width = '58') {
  const charWidth = width === '80' ? 48 : 32;
  const paperWidth = width === '80' ? '80mm' : '58mm';

  let html = '<div class="receipt">';

  receiptDoc.forEach(line => {
    if (line.type === 'separator') {
      html += '<div class="separator">'.padEnd(charWidth, '-') + '</div>';
    } else if (line.type === 'text') {
      const cls = [
        line.align || 'left',
        line.size === 'large' ? 'large' : '',
        line.bold ? 'bold' : ''
      ].filter(Boolean).join(' ');
      html += `<div class="${cls}">${escapeHtml(line.content)}</div>`;
    } else if (line.type === 'row') {
      const left = escapeHtml(line.left);
      const right = escapeHtml(line.right);
      const cls = line.bold ? 'bold' : '';
      html += `<div class="row ${cls}"><span>${left}</span><span>${right}</span></div>`;
    } else if (line.type === 'item') {
      const nama = truncate(line.nama, charWidth - 2);
      html += `<div class="item-nama">${escapeHtml(nama)}</div>`;
      const qtyLine = `  ${line.qty} x ${formatRupiah(line.harga)}`;
      const subtotal = formatRupiah(line.subtotal);
      html += `<div class="row"><span>${qtyLine}</span><span>${subtotal}</span></div>`;
    }
  });

  html += '</div>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Struk</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 5mm 2mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
      width: ${paperWidth};
      padding: 0;
    }
    .receipt {
      width: 100%;
    }
    .receipt > div {
      margin: 1px 0;
    }
    .left { text-align: left; }
    .center { text-align: center; }
    .right { text-align: right; }
    .large { 
      font-size: 14px; 
      font-weight: bold;
      margin: 3px 0;
    }
    .bold { font-weight: bold; }
    .separator {
      border-top: 1px dashed #000;
      margin: 3px 0;
      height: 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .item-nama {
      font-weight: 600;
      margin-top: 3px;
    }
    @media print {
      body { margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
  `.trim();
}

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}
