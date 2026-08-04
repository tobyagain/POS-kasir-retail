// drawer.js — perintah buka laci kas (ESC/POS only)
// Hanya dipakai di mode printMethod='escpos' (Android Bluetooth)
// Mode browser (Windows) mengatur laci di driver printer

const ESC = 0x1B;

/**
 * Generate ESC/POS command untuk buka laci kas.
 * ESC p m t1 t2
 * m = pin number (0 atau 1)
 * t1 = on time (25 = 100ms)
 * t2 = off time (250 = 1000ms)
 */
export function openDrawer(pin = 0) {
  return new Uint8Array([ESC, 0x70, pin, 25, 250]);
}
