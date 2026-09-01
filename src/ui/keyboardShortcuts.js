// Registry shortcut global — satu listener, dispatch ke handler per tab.
// Modul UI TIDAK menyentuh IndexedDB; hanya atur fokus/UI lewat callback.

const isFormEl = (el) =>
  el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

export function isTypingTarget(el = document.activeElement) {
  return isFormEl(el);
}

// Normalisasi event jadi key string: 'ctrl+enter', 'alt+1', 'f6', 'delete', ...
export function matchKey(e) {
  const parts = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  let key = e.key.toLowerCase();
  if (key === ' ') key = 'space';
  parts.push(key);
  return parts.join('+');
}

// Satu shortcut = satu entri: { key, handler, opts }
// opts.allowInInput: jalan walau fokus di input (default: hanya untuk combo ctrl/alt)
// opts.tab: hanya jalan saat tab aktif (nama data-tab). undefined = global.
const registry = [];

export function registerShortcut(key, handler, opts = {}) {
  registry.push({ key: key.toLowerCase(), handler, opts });
  return () => {
    const i = registry.findIndex(r => r.handler === handler && r.key === key.toLowerCase());
    if (i >= 0) registry.splice(i, 1);
  };
}

export function clearShortcuts() {
  registry.length = 0;
}

export function getActiveTab() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('.tab-btn.active')?.dataset.tab || null;
}

function hasModifier(key) {
  return key.startsWith('ctrl+') || key.startsWith('alt+') || key.includes('+ctrl+') || key.includes('+alt+');
}

export function shortcutHandler(e) {
  const key = matchKey(e);
  const typing = isTypingTarget(e.target);
  const activeTab = getActiveTab();

  for (const entry of registry) {
    if (entry.key !== key) continue;
    const { tab, allowInInput } = entry.opts;
    if (tab && tab !== activeTab) continue;
    // Blokir saat mengetik, kecuali ada modifier (ctrl/alt) atau eksplisit diizinkan
    if (typing && !allowInInput && !hasModifier(key)) continue;

    const result = entry.handler(e);
    if (result !== false) e.preventDefault();
    return true;
  }
  return false;
}

let started = false;
export function initKeyboardShortcuts(doc = document) {
  if (started) return;
  started = true;
  doc.addEventListener('keydown', shortcutHandler);
}

export function focusElement(selOrEl, { select = true } = {}) {
  const el = typeof selOrEl === 'string' ? document.querySelector(selOrEl) : selOrEl;
  if (!el) return false;
  el.focus();
  if (select && typeof el.select === 'function') el.select();
  el.scrollIntoView?.({ block: 'nearest' });
  return true;
}

// Navigasi tab Alt+1..Alt+8 — dipanggil dari app.js
export function bindTabNavigation() {
  const tabs = Array.from(document.querySelectorAll('.tab-btn'));
  tabs.forEach((btn, i) => {
    registerShortcut(`alt+${i + 1}`, () => {
      btn.click();
      return true;
    }, { allowInInput: true });
  });
}
