// UI numeric input helpers: tampilkan separator lokal, simpan angka mentah saat dibaca.
export function bindNumericInput(input) {
  if (!input) return;
  const format = () => {
    const digits = input.value.replace(/\D/g, '');
    input.value = digits ? Number(digits).toLocaleString('id-ID') : '';
  };
  input.addEventListener('input', format);
  input.addEventListener('blur', format);
  input.addEventListener('focus', () => {
    input.value = input.value.replace(/\D/g, '');
  });
  format();
}

export function readNumericInput(input) {
  const value = Number(input?.value.replace(/\D/g, '') || 0);
  return Number.isSafeInteger(value) ? value : NaN;
}
