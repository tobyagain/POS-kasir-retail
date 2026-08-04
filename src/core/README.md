# core/ — fungsi murni

Tanpa DOM, tanpa IndexedDB, tanpa Date.now() internal. Input -> output.
Ini lapisan yang dites paling ketat karena rumus salah = uang salah.

- `hpp.js`     — rata-rata bergerak (INV-3). Tertes.
- `shift.js`   — kas sistem & selisih (INV-4). Tertes.
- `reports.js` — laba kotor/bersih, stok menipis (INV-1/2). Tertes. Dilengkapi di Tahap 5.
- `receipt.js` — buildReceipt (Tahap 2, belum dibuat).
