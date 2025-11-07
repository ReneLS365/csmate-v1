function focused() {
  const el = document.activeElement;
  if (!el) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function wireShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (document.querySelector('.numpad.open')) return;
    if (focused()) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      window.JobStore?.saveActive?.();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      document.getElementById('btn-export-all')?.click();
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      window.UI?.goNext?.();
    }
  });
}
