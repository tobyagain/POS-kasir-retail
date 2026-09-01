// UI numeric input: tampilkan separator lokal real-time, simpan angka mentah saat dibaca.
// Prinsip: satu formatter tunggal (PRD §11). Input dibiarkan user-friendly saat ketik.

// Format string rupiah-style: "150000" -> "150.000" (id-ID grouping)
const GROUP_REGEX = /\B(?=(\d{3})+(?!\d))/g;

function formatWithCaret(digits, caretFromEnd) {
  // Format + hitung posisi caret baru berdasarkan digit dari kanan
  const formatted = digits.replace(GROUP_REGEX, '.');
  if (caretFromEnd == null) return { value: formatted, caret: formatted.length };
  // Cari posisi caret di string formatted = total length - (digit dari kanan + titik yang dilewati)
  let digitsSeen = 0;
  let caret = formatted.length;
  for (let i = formatted.length; i > 0; i--) {
    if (digitsSeen === caretFromEnd) { caret = i; break; }
    if (/\d/.test(formatted[i - 1])) digitsSeen++;
  }
  return { value: formatted, caret };
}

export function bindNumericInput(input) {
  if (!input) return;
  if (input.dataset.numericBound === '1') return; // jangan double-bind
  input.dataset.numericBound = '1';

  const digits = () => input.value.replace(/\D/g, '');

  const formatLive = () => {
    const raw = digits();
    if (!raw) { input.value = ''; return; }
    // Hitung digit di kanan caret sebelum format
    const caretPos = input.selectionStart ?? input.value.length;
    const rightOfCaret = input.value.slice(caretPos).replace(/\D/g, '').length;
    const { value, caret } = formatWithCaret(raw, rightOfCaret);
    input.value = value;
    try { input.setSelectionRange(caret, caret); } catch (_) {}
  };

  const formatOnBlur = () => {
    const raw = digits();
    input.value = raw ? Number(raw).toLocaleString('id-ID') : '';
  };

  input.addEventListener('input', formatLive);
  input.addEventListener('blur', formatOnBlur);
  // Jangan strip format di focus. PRD §10: semua nominal input tampil separator Indonesia.
  // User boleh langsung select-all / ketik di tengah tanpa kehilangan konteks.

  // Inisialisasi sekali
  formatOnBlur();
}

export function readNumericInput(input) {
  const value = Number(input?.value.replace(/\D/g, '') || 0);
  return Number.isSafeInteger(value) ? value : NaN;
}

// Eksport untuk test
export function _format(digits) {
  return digits ? digits.replace(GROUP_REGEX, '.') : '';
}
