// Import produk dari CSV — logika murni, tanpa DOM/IndexedDB.
// CSV hasil export Excel Indonesia memakai delimiter ';', negara lain ','.
// Parser auto-detect delimiter dari baris header.

// Deteksi delimiter: hitung kandidat di baris pertama
export function detectDelimiter(headerLine) {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

// Parse CSV teks -> array of array string. Dukung quoted field ("a;b") & escaped quote ("").
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  // Normalisasi line ending
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ';' || c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  // Field terakhir
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Kolom yang dikenali (header case-insensitive, terima alias)
const KOLOM = {
  barcode: ['barcode', 'kode', 'kodebarang', 'kode_bar'],
  nama: ['nama', 'namaproduk', 'nama_produk', 'produk'],
  kategori: ['kategori', 'category', 'kelompok'],
  satuan: ['satuan', 'unit', 'uom'],
  hargajual: ['hargajual', 'harga_jual', 'harga', 'jual'],
  stokmin: ['stokmin', 'stok_min', 'minstok', 'min'],
};

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[\s\-]/g, '');
}

// Map header -> index kolom. Return null kalau kolom wajib (nama, hargajual) tidak ada.
export function mapHeader(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => {
    const norm = normalizeHeader(h);
    for (const [key, aliases] of Object.entries(KOLOM)) {
      if (aliases.includes(norm)) { map[key] = i; break; }
    }
  });
  if (map.nama === undefined || map.hargajual === undefined) return null;
  return map;
}

// Parse angka dari string: terima "15000", "15.000" (ribuan id), "15000,00" (desimal id).
// Ambil digit saja — konsisten dengan buatProduk() yang strip non-digit.
export function parseAngka(str) {
  const digits = String(str ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

const SATUAN_VALID = ['pcs', 'box', 'dus', 'kg', 'liter'];

// Konversi baris CSV -> objek produk. Return { produk } atau { error }.
export function rowToProduk(row, colMap, lineNo) {
  const get = (key) => colMap[key] !== undefined ? (row[colMap[key]] ?? '').trim() : '';

  const nama = get('nama');
  if (!nama) return { error: `Baris ${lineNo}: nama kosong` };

  const hargaJual = parseAngka(get('hargajual'));
  if (hargaJual <= 0) return { error: `Baris ${lineNo}: harga jual tidak valid ("${get('hargajual')}")` };

  let satuan = get('satuan').toLowerCase() || 'pcs';
  if (!SATUAN_VALID.includes(satuan)) satuan = 'pcs';

  return {
    produk: {
      barcode: get('barcode'),
      nama,
      kategori: get('kategori'),
      satuan,
      hargaJual,
      stokMin: parseAngka(get('stokmin')) || 10,
    }
  };
}

// Parse seluruh teks CSV -> { produkList, errors, skipped }
export function parseImportProduk(text) {
  const rows = parseCSV(text).filter(r => r.some(f => f.trim() !== ''));
  if (rows.length < 2) return { produkList: [], errors: ['File kosong atau hanya header'], skipped: 0 };

  const colMap = mapHeader(rows[0]);
  if (!colMap) {
    return {
      produkList: [],
      errors: ['Header tidak dikenali. Wajib ada kolom "nama" dan "hargaJual". Download template untuk contoh.'],
      skipped: 0
    };
  }

  const produkList = [];
  const errors = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const result = rowToProduk(rows[i], colMap, i + 1);
    if (result.error) { errors.push(result.error); skipped++; }
    else produkList.push(result.produk);
  }

  return { produkList, errors, skipped };
}

// Template CSV untuk di-download user (delimiter ';' sesuai Excel Indonesia)
export const TEMPLATE_CSV =
  'barcode;nama;kategori;satuan;hargaJual;stokMin\n' +
  '8991002100013;Indomie Goreng;Makanan;pcs;3500;20\n' +
  '8996001600018;Aqua 600ml;Minuman;pcs;4000;24\n' +
  ';Kopi Kapal Api Sachet;Minuman;pcs;1500;50\n';
