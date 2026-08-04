// Schema IndexedDB v1 — satu sumber kebenaran untuk store + index
// Lihat docs/DATA-MODEL.md untuk struktur lengkap

export const DB_NAME = 'posretail';
export const DB_VERSION = 1;

// Definisi store: { name, keyPath, autoIncrement?, indexes: [{name, keyPath, unique?}] }
export const STORES = [
  {
    name: 'products',
    keyPath: 'id',
    indexes: [
      { name: 'barcode', keyPath: 'barcode', unique: false },
      { name: 'nama', keyPath: 'nama', unique: false },
      { name: 'kategori', keyPath: 'kategori', unique: false }
    ]
  },
  {
    name: 'purchases',
    keyPath: 'id',
    indexes: [
      { name: 'tanggal', keyPath: 'tanggal', unique: false },
      { name: 'supplier', keyPath: 'supplier', unique: false }
    ]
  },
  {
    name: 'sales',
    keyPath: 'id',
    indexes: [
      { name: 'noStruk', keyPath: 'noStruk', unique: true },
      { name: 'shiftId', keyPath: 'shiftId', unique: false },
      { name: 'tanggal', keyPath: 'tanggal', unique: false },
      { name: 'void', keyPath: 'void', unique: false }
    ]
  },
  {
    name: 'shifts',
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'buka', keyPath: 'buka', unique: false }
    ]
  },
  {
    name: 'cashflow',
    keyPath: 'id',
    indexes: [
      { name: 'shiftId', keyPath: 'shiftId', unique: false },
      { name: 'tanggal', keyPath: 'tanggal', unique: false },
      { name: 'jenis', keyPath: 'jenis', unique: false },
      { name: 'kategori', keyPath: 'kategori', unique: false }
    ]
  },
  {
    name: 'stockMoves',
    keyPath: 'id',
    indexes: [
      { name: 'produkId', keyPath: 'produkId', unique: false },
      { name: 'tanggal', keyPath: 'tanggal', unique: false },
      { name: 'tipe', keyPath: 'tipe', unique: false }
    ]
  },
  {
    name: 'meta',
    keyPath: 'key'
  }
];
