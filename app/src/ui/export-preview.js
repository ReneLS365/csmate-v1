const MIME = {
  csv: 'text/csv;charset=utf-8',
  json: 'application/json;charset=utf-8',
  txt: 'text/plain;charset=utf-8'
};

function trapFocus (dlg) {
  const focusables = dlg.querySelectorAll(
    'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const onKey = event => {
    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === 'Escape') {
      dlg.close();
    }
  };
  dlg.addEventListener('keydown', onKey);
}

function normaliseText (data, type) {
  if (type === 'json') {
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return '';
    }
  }
  if (typeof data === 'string') return data;
  return String(data ?? '');
}

export function showExportPreview (data, type = 'csv', options = {}) {
  const prev = document.getElementById('export-preview');
  if (prev) prev.remove();

  const dlg = document.createElement('dialog');
  dlg.id = 'export-preview';
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-labelledby', 'export-preview-title');
  dlg.innerHTML = `
    <form method="dialog" style="min-width: min(90vw, 900px); max-width: 100%;">
      <header class="modal-header" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
        <h3 id="export-preview-title">Preview (${type.toUpperCase()})</h3>
        <button id="dl-cancel" type="submit" aria-label="Luk">✕</button>
      </header>
      <div class="modal-body" style="max-height:60vh;overflow:auto">
        <pre id="export-preview-pre" aria-label="Indhold for eksport" style="white-space:pre-wrap;padding:.5rem;border:1px solid #ddd;border-radius:.5rem"></pre>
      </div>
      <footer style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.75rem">
        <button id="dl-ok" type="button">Download</button>
        <button id="dl-cancel-2" type="submit">Annuller</button>
      </footer>
    </form>`;
  document.body.append(dlg);

  const fullText = normaliseText(data, type);
  const text = fullText.length > 200000 ? fullText.slice(0, 200000) : fullText;
  const pre = dlg.querySelector('#export-preview-pre');
  if (pre) pre.textContent = text;

  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');

  trapFocus(dlg);

  dlg.addEventListener('click', event => {
    const rect = dlg.querySelector('form')?.getBoundingClientRect();
    if (!rect) return;
    const inDialog = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inDialog) dlg.close();
  });

  const downloadButton = dlg.querySelector('#dl-ok');
  if (downloadButton) {
    downloadButton.addEventListener('click', () => {
      dlg.close();
      triggerDownload(fullText, type, options?.fileName);
    });
  }
  const cancelButton = dlg.querySelector('#dl-cancel-2');
  if (cancelButton) cancelButton.addEventListener('click', () => dlg.close());
  const closeButton = dlg.querySelector('#dl-cancel');
  if (closeButton) closeButton.addEventListener('click', () => dlg.close());

  return dlg;
}

function triggerDownload (text, type, fileName) {
  const blob = new Blob([text], { type: MIME[type] || MIME.txt });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `export-${new Date().toISOString().replace(/[:.]/g, '-')}.${type}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
