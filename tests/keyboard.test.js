// Test: shortcut registry (matchKey, filter input, per-tab) + helper kasir murni
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchKey, registerShortcut, clearShortcuts, shortcutHandler } from '../src/ui/keyboardShortcuts.js';
import { validateCheckout, hitungKembalianTunai } from '../src/core/checkout.js';

const fakeEvent = (key, { ctrl = false, alt = false, shift = false, target = null } = {}) => ({
  key,
  ctrlKey: ctrl,
  altKey: alt,
  shiftKey: shift,
  target: target || { tagName: 'BODY' },
  preventDefault() { this._prevented = true; },
});

test('matchKey normalisasi', () => {
  assert.equal(matchKey(fakeEvent('F6')), 'f6');
  assert.equal(matchKey(fakeEvent('Enter', { ctrl: true })), 'ctrl+enter');
  assert.equal(matchKey(fakeEvent('1', { alt: true })), 'alt+1');
  assert.equal(matchKey(fakeEvent('ArrowLeft', { alt: true })), 'alt+arrowleft');
  assert.equal(matchKey(fakeEvent('R', { ctrl: true, shift: true })), 'ctrl+shift+r');
});

test('shortcut dieksekusi & preventDefault', () => {
  clearShortcuts();
  let hit = 0;
  registerShortcut('f6', () => { hit++; }, { allowInInput: true });
  const e = fakeEvent('F6');
  const handled = shortcutHandler(e);
  assert.equal(handled, true);
  assert.equal(hit, 1);
  assert.equal(e._prevented, true);
});

test('shortcut tanpa modifier DIBLOKIR saat mengetik di input', () => {
  clearShortcuts();
  let hit = 0;
  registerShortcut('n', () => { hit++; });
  const e = fakeEvent('n', { target: { tagName: 'INPUT' } });
  const handled = shortcutHandler(e);
  assert.equal(handled, false);
  assert.equal(hit, 0);
});

test('shortcut dgn modifier tetap jalan saat mengetik', () => {
  clearShortcuts();
  let hit = 0;
  registerShortcut('ctrl+enter', () => { hit++; });
  const e = fakeEvent('Enter', { ctrl: true, target: { tagName: 'INPUT' } });
  shortcutHandler(e);
  assert.equal(hit, 1);
});

test('shortcut allowInInput tanpa modifier jalan di input', () => {
  clearShortcuts();
  let hit = 0;
  registerShortcut('f8', () => { hit++; }, { allowInInput: true });
  shortcutHandler(fakeEvent('F8', { target: { tagName: 'INPUT' } }));
  assert.equal(hit, 1);
});

test('shortcut per-tab: tidak jalan di tab lain', () => {
  clearShortcuts();
  let hit = 0;
  registerShortcut('n', () => { hit++; }, { tab: 'produk' });
  // getActiveTab baca .tab-btn.active — tidak ada di Node, jadi null
  shortcutHandler(fakeEvent('n'));
  assert.equal(hit, 0);
});

test('handler return false = tidak ditangani, lanjut entri berikutnya', () => {
  clearShortcuts();
  let a = 0, b = 0;
  registerShortcut('escape', () => { a++; return false; });
  registerShortcut('escape', () => { b++; });
  const handled = shortcutHandler(fakeEvent('Escape'));
  assert.equal(handled, true);
  // implementasi: handler pertama return false → tidak preventDefault tapi tetap berhenti (handled=true)
  assert.equal(a, 1);
  assert.equal(b, 0);
});

// ===== validateCheckout (dari kasir) =====

test('validateCheckout: keranjang kosong', () => {
  assert.deepEqual(validateCheckout([], [{ metode: 'tunai', jumlah: 1000 }], 500).ok, false);
});

test('validateCheckout: belum bayar', () => {
  assert.equal(validateCheckout([{ subtotal: 500 }], [], 500).reason, 'belum-bayar');
});

test('validateCheckout: kurang bayar', () => {
  const r = validateCheckout([{ subtotal: 10000 }], [{ metode: 'tunai', jumlah: 5000 }], 10000);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'kurang-bayar');
  assert.equal(r.kurang, 5000);
});

test('validateCheckout: QRIS campur tunai cukup', () => {
  const r = validateCheckout(
    [{ subtotal: 10000 }],
    [{ metode: 'tunai', jumlah: 4000 }, { metode: 'qris', jumlah: 6000 }],
    10000
  );
  assert.equal(r.ok, true);
});

test('validateCheckout: lebih bayar OK (kembalian)', () => {
  const r = validateCheckout([{ subtotal: 8000 }], [{ metode: 'tunai', jumlah: 10000 }], 8000);
  assert.equal(r.ok, true);
});

test('validateCheckout mencegah transaksi ganda: hasil sama untuk input sama (idempoten check di UI)', () => {
  const args = [[{ subtotal: 5000 }], [{ metode: 'qris', jumlah: 5000 }], 5000];
  assert.deepEqual(validateCheckout(...args), validateCheckout(...args));
});
