// UI Kasir
import { cariByBarcode, cariByNama } from '../services/productService.js';
import { simpanPenjualan } from '../services/saleService.js';
import { getShiftTerbuka } from '../services/shiftService.js';
import { cetakStruk } from '../services/printService.js';

let keranjang = [];
let shiftAktif = null;

export async function initKasirUI() {
  shiftAktif = await getShiftTerbuka();
  
  if (!shiftAktif) {
    renderGuardShift();
    return;
  }

  await renderKasir();
}

function renderGuardShift() {
  const container = document.querySelector('[data-panel="kasir"]');
  container.innerHTML = `
    <div style="max-width:500px; margin:2rem auto; text-align:center; padding:2rem; background:#fef2f2; border:1px solid #fca5a5; border-radius:8px;">
      <h2 class="text-red">⚠ Tidak Ada Shift Terbuka</h2>
      <p class="mt-1 text-gray">Buka shift dulu di tab <strong>Shift</strong> sebelum jualan.</p>
      <button class="primary mt-2" onclick="window.goToShift()">Ke Tab Shift</button>
    </div>
  `;
}

window.goToShift = () => {
  document.querySelector('[data-tab="shift"]').click();
};

async function renderKasir() {
  const container = document.querySelector('[data-panel="kasir"]');
  container.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 400px; gap:1rem; height:calc(100vh - 120px);">
      <!-- Kiri: Input & Keranjang -->
      <div style="display:flex; flex-direction:column;">
        <div style="background:#fff; padding:1rem; border-radius:4px; margin-bottom:1rem;">
          <div class="flex gap-1">
            <input type="text" id="input-barcode" placeholder="Scan/ketik barcode atau nama produk" style="flex:1;" autofocus>
            <button class="primary" onclick="window.cariProdukKasir()">Cari</button>
          </div>
        </div>

        <div style="flex:1; overflow-y:auto; background:#fff; border-radius:4px; padding:1rem;">
          <h3>Keranjang</h3>
          <table class="mt-1" id="table-keranjang">
            <thead>
              <tr>
                <th>Produk</th>
                <th style="width:80px;">Qty</th>
                <th style="width:100px;">Harga</th>
                <th style="width:100px;">Diskon</th>
                <th style="width:100px;">Subtotal</th>
                <th style="width:60px;">Aksi</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>

      <!-- Kanan: Total & Bayar -->
      <div style="background:#fff; padding:1.5rem; border-radius:4px; display:flex; flex-direction:column;">
        <div style="flex:1;">
          <div style="font-size:12px; color:#6b7280; margin-bottom:1rem;">
            Shift: <strong>${shiftAktif.kasir}</strong> | Buka: ${formatJam(shiftAktif.buka)}
          </div>

          <div style="border-bottom:2px solid #e5e7eb; padding-bottom:1rem; margin-bottom:1rem;">
            <div class="flex" style="justify-content:space-between; margin-bottom:0.5rem;">
              <span>Subtotal</span>
              <span id="label-subtotal">Rp 0</span>
            </div>
            <div class="flex" style="justify-content:space-between; margin-bottom:0.5rem;">
              <span>Diskon Nota</span>
              <input type="number" id="input-diskon-nota" value="0" style="width:120px; text-align:right;" min="0">
            </div>
          </div>

          <div class="flex" style="justify-content:space-between; font-size:20px; font-weight:600; margin-bottom:1.5rem;">
            <span>TOTAL</span>
            <span id="label-total">Rp 0</span>
          </div>

          <div style="border:1px solid #e5e7eb; padding:1rem; border-radius:4px; background:#f9fafb;">
            <strong>Pembayaran</strong>
            <div id="pembayaran-list" class="mt-1"></div>
            <button class="secondary mt-1" style="width:100%;" onclick="window.tambahPembayaran()">+ Tambah Metode</button>
          </div>

          <div class="flex mt-2" style="justify-content:space-between; font-size:16px;">
            <span>Dibayar</span>
            <span id="label-dibayar">Rp 0</span>
          </div>
          <div class="flex mt-1" style="justify-content:space-between; font-size:16px;">
            <span>Kembalian</span>
            <span id="label-kembalian" class="text-green">Rp 0</span>
          </div>
        </div>

        <div class="flex gap-1 mt-2">
          <button class="primary" style="flex:1;" onclick="window.bayarSekarang()">BAYAR</button>
          <button class="secondary" onclick="window.resetKeranjang()">Reset</button>
        </div>
      </div>
    </div>
  `;

  renderKeranjang();
  document.getElementById('input-barcode').focus();
  document.getElementById('input-barcode').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.cariProdukKasir();
  });
  document.getElementById('input-diskon-nota').addEventListener('input', hitungTotal);
}

window.cariProdukKasir = async () => {
  const input = document.getElementById('input-barcode').value.trim();
  if (!input) return;

  // Coba barcode dulu
  let produk = await cariByBarcode(input);
  
  // Kalau tidak ketemu, coba nama
  if (!produk) {
    const hasil = await cariByNama(input);
    if (hasil.length === 0) {
      alert('Produk tidak ditemukan');
      return;
    }
    if (hasil.length === 1) {
      produk = hasil[0];
    } else {
      // Banyak hasil — pilih manual (simplified: ambil pertama)
      produk = hasil[0];
    }
  }

  tambahKeKeranjang(produk);
  document.getElementById('input-barcode').value = '';
  document.getElementById('input-barcode').focus();
};

function tambahKeKeranjang(produk) {
  // Cek sudah ada di keranjang
  const existing = keranjang.find(it => it.produkId === produk.id);
  if (existing) {
    existing.qty++;
    existing.subtotal = existing.qty * existing.hargaJualSnapshot - existing.diskonItem;
  } else {
    keranjang.push({
      produkId: produk.id,
      nama: produk.nama,
      qty: 1,
      hargaJualSnapshot: produk.hargaJual,  // INV-2: snapshot harga
      hppSnapshot: produk.hpp,              // INV-1: snapshot HPP
      diskonItem: 0,
      subtotal: produk.hargaJual
    });
  }
  renderKeranjang();
}

window.ubahQty = (index, delta) => {
  keranjang[index].qty += delta;
  if (keranjang[index].qty <= 0) {
    keranjang.splice(index, 1);
  } else {
    keranjang[index].subtotal = keranjang[index].qty * keranjang[index].hargaJualSnapshot - keranjang[index].diskonItem;
  }
  renderKeranjang();
};

window.ubahDiskonItem = (index, nilai) => {
  keranjang[index].diskonItem = parseInt(nilai) || 0;
  keranjang[index].subtotal = keranjang[index].qty * keranjang[index].hargaJualSnapshot - keranjang[index].diskonItem;
  renderKeranjang();
};

window.hapusItem = (index) => {
  keranjang.splice(index, 1);
  renderKeranjang();
};

function renderKeranjang() {
  const tbody = document.querySelector('#table-keranjang tbody');
  if (!tbody) return;

  if (keranjang.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-gray" style="text-align:center;">Keranjang kosong</td></tr>';
  } else {
    tbody.innerHTML = keranjang.map((it, i) => `
      <tr>
        <td>${it.nama}</td>
        <td>
          <div class="flex gap-1" style="align-items:center;">
            <button class="secondary" style="padding:0.25rem 0.5rem;" onclick="window.ubahQty(${i}, -1)">-</button>
            <span style="width:30px; text-align:center;">${it.qty}</span>
            <button class="secondary" style="padding:0.25rem 0.5rem;" onclick="window.ubahQty(${i}, 1)">+</button>
          </div>
        </td>
        <td class="text-right">${formatRupiah(it.hargaJualSnapshot)}</td>
        <td>
          <input type="number" value="${it.diskonItem}" min="0" style="width:100%; text-align:right;"
                 onchange="window.ubahDiskonItem(${i}, this.value)">
        </td>
        <td class="text-right">${formatRupiah(it.subtotal)}</td>
        <td>
          <button class="secondary" style="padding:0.25rem 0.5rem;" onclick="window.hapusItem(${i})">×</button>
        </td>
      </tr>
    `).join('');
  }

  hitungTotal();
}

let pembayaranList = [];

window.tambahPembayaran = () => {
  const metode = prompt('Metode: tunai / qris / transfer / kartu', 'tunai');
  if (!metode) return;
  const jumlah = parseInt(prompt('Jumlah (Rp):', '0'));
  if (!jumlah) return;

  pembayaranList.push({ metode, jumlah });
  renderPembayaran();
};

window.hapusPembayaran = (index) => {
  pembayaranList.splice(index, 1);
  renderPembayaran();
};

function renderPembayaran() {
  const container = document.getElementById('pembayaran-list');
  if (!container) return;

  if (pembayaranList.length === 0) {
    container.innerHTML = '<div class="text-gray" style="font-size:12px;">Belum ada pembayaran</div>';
  } else {
    container.innerHTML = pembayaranList.map((p, i) => `
      <div class="flex" style="justify-content:space-between; align-items:center; margin-top:0.5rem;">
        <span>${p.metode}</span>
        <span>${formatRupiah(p.jumlah)}</span>
        <button class="secondary" style="padding:0.25rem 0.5rem;" onclick="window.hapusPembayaran(${i})">×</button>
      </div>
    `).join('');
  }

  hitungTotal();
}

function hitungTotal() {
  const subtotal = keranjang.reduce((sum, it) => sum + it.subtotal, 0);
  const diskonNota = parseInt(document.getElementById('input-diskon-nota')?.value || 0);
  const total = subtotal - diskonNota;
  const dibayar = pembayaranList.reduce((sum, p) => sum + p.jumlah, 0);
  const kembalian = Math.max(0, dibayar - total);

  document.getElementById('label-subtotal').textContent = formatRupiah(subtotal);
  document.getElementById('label-total').textContent = formatRupiah(total);
  document.getElementById('label-dibayar').textContent = formatRupiah(dibayar);
  document.getElementById('label-kembalian').textContent = formatRupiah(kembalian);
}

window.bayarSekarang = async () => {
  if (keranjang.length === 0) {
    alert('Keranjang kosong');
    return;
  }

  if (pembayaranList.length === 0) {
    alert('Tambahkan pembayaran');
    return;
  }

  const diskonNota = parseInt(document.getElementById('input-diskon-nota').value || 0);
  const total = keranjang.reduce((sum, it) => sum + it.subtotal, 0) - diskonNota;
  const dibayar = pembayaranList.reduce((sum, p) => sum + p.jumlah, 0);

  if (dibayar < total) {
    alert('Pembayaran kurang');
    return;
  }

  try {
    const saleData = {
      shiftId: shiftAktif.id,
      items: keranjang,
      diskonNota,
      pembayaran: pembayaranList,
      kasir: shiftAktif.kasir
    };

    await simpanPenjualan(saleData);

    // Cetak struk (ambil sale terakhir — workaround sederhana, nanti bisa return dari simpanPenjualan)
    const { listPenjualan } = await import('../services/saleService.js');
    const sales = await listPenjualan({ shiftId: shiftAktif.id });
    const lastSale = sales[0]; // terakhir = paling baru (sorted desc)

    if (lastSale) {
      await cetakStruk(lastSale);
    }

    alert('Transaksi berhasil!');
    resetKeranjang();
  } catch (err) {
    alert('Gagal: ' + err.message);
  }
};

window.resetKeranjang = () => {
  keranjang = [];
  pembayaranList = [];
  document.getElementById('input-diskon-nota').value = '0';
  renderKeranjang();
  renderPembayaran();
};

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatJam(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

window.initKasirUI = initKasirUI;
