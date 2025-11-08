(function initMaterialsUI(){
  const container = document.getElementById('optaellingContainer');
  if (!container) return;

  const fmtDK = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' });

  container.querySelectorAll('.mat-row').forEach(updateLine);

  container.addEventListener('input', (e) => {
    if (!e.target.classList.contains('mat-qty')) return;
    const row = e.target.closest('.mat-row');
    updateLine(row);

    if (typeof recalcTotals === 'function') {
      recalcTotals();
    } else if (typeof updateTotals === 'function') {
      updateTotals();
    }
  });

  const observer = new MutationObserver(mutations => {
    let needsUpdate = false;
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element && (node.classList.contains('mat-row') || node.querySelector('.mat-row'))) {
            needsUpdate = true;
          }
        });
      } else if (mutation.type === 'attributes' && mutation.attributeName === 'data-price') {
        needsUpdate = true;
      }
    });
    if (needsUpdate) {
      container.querySelectorAll('.mat-row').forEach(updateLine);
    }
  });

  observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-price'] });

  function parseQty(value){
    if (value == null) return 0;

    let s = String(value).trim();

    s = s.replace(/\s+/g, '');

    const lastComma = s.lastIndexOf(',');
    const lastDot   = s.lastIndexOf('.');

    if (lastComma > -1 && lastDot > -1){
      if (lastComma > lastDot){
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else {
      s = s.replace(',', '.');
    }

    s = s.replace(/[^0-9.]/g, '');
    const firstDot = s.indexOf('.');
    if (firstDot !== -1){
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
    }

    if (s === '' || s === '.') return 0;

    const n = parseFloat(s);
    if (!Number.isFinite(n) || n < 0) return 0;

    return n;
  }

  function formatQtyDK(n){
    const str = n.toFixed(6).replace(/0+$/,'').replace(/\.$/,'');
    return str.replace('.', ',');
  }

  function round2(n){ return Math.round(n * 100) / 100; }

  function updateLine(row){
    if (!row) return;

    const qtyEl   = row.querySelector('.mat-qty');
    const priceEl = row.querySelector('.mat-price');
    const lineEl  = row.querySelector('.mat-line');
    if (!qtyEl || !priceEl || !lineEl) return;

    const qty   = parseQty(qtyEl.value);
    let price   = parseFloat(priceEl.dataset.price || '');
    if (!Number.isFinite(price)) {
      price = parseQty(priceEl.value);
    }
    const line  = round2(qty * (Number.isFinite(price) ? price : 0));

    const qtyFormatted = formatQtyDK(qty);
    qtyEl.value = qtyEl.type === 'number'
      ? qtyFormatted.replace(',', '.')
      : qtyFormatted;

    const hasQty = qty > 0;
    row.toggleAttribute('data-has-qty', hasQty);
    row.dataset.hasQty = hasQty ? 'true' : 'false';

    if (Number.isFinite(price)) {
      const priceFormatted = price.toFixed(2);
      priceEl.value = priceEl.type === 'number'
        ? priceFormatted
        : priceFormatted.replace('.', ',');
    } else if (priceEl.value) {
      if (priceEl.type === 'number') {
        const fallbackPrice = parseQty(priceEl.value);
        priceEl.value = Number.isFinite(fallbackPrice) ? String(fallbackPrice) : '';
      } else {
        priceEl.value = String(priceEl.value).replace('.', ',');
      }
    } else {
      priceEl.value = '';
    }

    const formattedLine = fmtDK.format(line);
    const lineText = `${formattedLine} kr`;
    if (lineEl instanceof HTMLInputElement) {
      lineEl.value = lineText;
    } else {
      lineEl.textContent = lineText;
    }
  }

  window.parseQty = parseQty;
  window.formatQtyDK = formatQtyDK;
  window.round2 = round2;
  window.updateMaterialLine = row => updateLine(row);
})();
