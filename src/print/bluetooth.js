// bluetooth.js — kirim byte ESC/POS ke printer Bluetooth
// Web Bluetooth API — hanya jalan di HTTPS atau localhost

let device = null;
let characteristic = null;

// UUID standar untuk printer thermal (bisa beda per vendor)
const SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'; // printer service
const CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';    // print data

/**
 * Pair printer Bluetooth.
 * Browser akan tampilkan dialog pilih device.
 */
export async function pairPrinter() {
  try {
    // Request device
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID]
    });

    // Connect
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHAR_UUID);

    return { success: true, name: device.name };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Kirim byte array ke printer.
 * Data di-chunk 512 byte (MTU limit Bluetooth LE).
 */
export async function printBytes(data) {
  if (!characteristic) {
    throw new Error('Printer belum dipair. Panggil pairPrinter() dulu.');
  }

  const chunkSize = 512;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await characteristic.writeValue(chunk);
    // Delay kecil agar printer tidak overflow
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

/**
 * Disconnect printer.
 */
export function disconnect() {
  if (device && device.gatt.connected) {
    device.gatt.disconnect();
  }
  device = null;
  characteristic = null;
}

/**
 * Cek apakah browser support Web Bluetooth.
 */
export function isBluetoothSupported() {
  return 'bluetooth' in navigator;
}
