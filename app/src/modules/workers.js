const dependencies = {
  formatNumber: (value) => (typeof value === 'number' && Number.isFinite(value)) ? String(value) : String(value ?? ''),
  toNumber: (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const normalized = value.replace(/\./g, '').replace(',', '.');
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value == null) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  },
  updateTotals: () => {},
  beregnLon: null,
  syncLonAuditState: null
};

let workerCount = 0;

function resolveContainer(container) {
  if (container && typeof HTMLElement !== 'undefined' && container instanceof HTMLElement) return container;
  if (typeof document !== 'undefined') {
    return document.getElementById('workers');
  }
  return null;
}

export function configureWorkerModule(overrides = {}) {
  if (!overrides || typeof overrides !== 'object') return;
  if (typeof overrides.formatNumber === 'function') {
    dependencies.formatNumber = overrides.formatNumber;
  }
  if (typeof overrides.toNumber === 'function') {
    dependencies.toNumber = overrides.toNumber;
  }
  if (typeof overrides.updateTotals === 'function') {
    dependencies.updateTotals = overrides.updateTotals;
  }
  if (typeof overrides.beregnLon === 'function' || overrides.beregnLon === null) {
    dependencies.beregnLon = overrides.beregnLon;
  }
  if (typeof overrides.syncLonAuditState === 'function' || overrides.syncLonAuditState === null) {
    dependencies.syncLonAuditState = overrides.syncLonAuditState;
  }
}

export function getWorkerCount() {
  return workerCount;
}

export function setWorkerCount(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    workerCount = Math.floor(value);
  } else {
    workerCount = 0;
  }
  return workerCount;
}

function createWorkerFieldset(index) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'worker-row';
  fieldset.id = `worker${index}`;
  fieldset.innerHTML = `
    <legend>Mand ${index}</legend>
    <div class="worker-grid">
      <label>
        <span>Timer</span>
        <input type="text" class="worker-hours" value="0" inputmode="decimal" data-numpad="true" data-decimal="comma" data-numpad-field="worker-hours-${index}">
      </label>
      <label>
        <span>Uddannelse</span>
        <select class="worker-udd">
          <option value="udd1">Udd1 (42,98 kr)</option>
          <option value="udd2">Udd2 (49,38 kr)</option>
        </select>
      </label>
      <label>
        <span>Mentortillæg (22,26 kr/t)</span>
        <input type="text" class="worker-tillaeg" value="0" inputmode="decimal" data-numpad="true" data-decimal="comma" data-numpad-field="worker-tillaeg-${index}">
      </label>
    </div>
    <div class="worker-output" aria-live="polite"></div>
  `;
  return fieldset;
}

export function resetWorkers(options = {}) {
  const container = resolveContainer(options.container);
  workerCount = 0;
  if (container) {
    container.innerHTML = '';
  }
}

export function addWorker(options = {}) {
  const container = resolveContainer(options.container);
  if (!container) {
    console.warn('Kan ikke tilføje medarbejder – container mangler i DOM.');
    return null;
  }
  const nextIndex = setWorkerCount(workerCount + 1);
  const fieldset = createWorkerFieldset(nextIndex);
  container.appendChild(fieldset);
  if (typeof dependencies.syncLonAuditState === 'function') {
    dependencies.syncLonAuditState();
  }
  return fieldset;
}

export function captureWorkers(container = resolveContainer()) {
  if (!container) return [];
  const rows = container.querySelectorAll('.worker-row');
  if (!rows.length) return [];
  return Array.from(rows).map(row => {
    const hours = row.querySelector('.worker-hours');
    const udd = row.querySelector('.worker-udd');
    const tillaeg = row.querySelector('.worker-tillaeg');
    const legend = row.querySelector('legend');
    return {
      name: legend?.textContent?.trim() || '',
      hours: hours?.value || '',
      udd: udd?.value || 'udd1',
      tillaeg: tillaeg?.value || ''
    };
  });
}

export function applyWorkers(workers = [], options = {}) {
  const container = resolveContainer(options.container);
  if (!container) return;
  container.innerHTML = '';
  workerCount = 0;
  if (!Array.isArray(workers) || workers.length === 0) {
    addWorker({ container });
    return;
  }
  workers.forEach(worker => {
    const row = addWorker({ container });
    if (!row) return;
    const hours = row.querySelector('.worker-hours');
    const udd = row.querySelector('.worker-udd');
    const tillaeg = row.querySelector('.worker-tillaeg');
    if (hours) hours.value = worker.hours ?? '';
    if (udd) udd.value = worker.udd ?? 'udd1';
    if (tillaeg) tillaeg.value = worker.tillaeg ?? '';
  });
}

export function populateWorkersFromLabor(entries = [], options = {}) {
  resetWorkers(options);
  if (!Array.isArray(entries) || entries.length === 0) {
    addWorker(options);
    dependencies.updateTotals(true);
    return;
  }

  entries.forEach((entry, index) => {
    const row = addWorker(options);
    if (!row) return;

    const hoursInput = row.querySelector('.worker-hours');
    const tillaegInput = row.querySelector('.worker-tillaeg');
    const uddSelect = row.querySelector('.worker-udd');

    if (hoursInput) {
      hoursInput.value = dependencies.formatNumber(dependencies.toNumber(entry?.hours));
    }
    if (tillaegInput) {
      tillaegInput.value = dependencies.formatNumber(dependencies.toNumber(entry?.mentortillaeg));
    }
    if (uddSelect instanceof HTMLSelectElement) {
      const savedValue = typeof entry?.udd === 'string' ? entry.udd.trim() : '';
      if (savedValue) {
        const hasOption = Array.from(uddSelect.options).some(option => option.value === savedValue);
        if (hasOption) {
          uddSelect.value = savedValue;
        } else if (uddSelect.options.length > 0) {
          uddSelect.selectedIndex = 0;
        }
      } else if (uddSelect.options.length > 0) {
        uddSelect.selectedIndex = 0;
      }
    }
  });

  dependencies.updateTotals(true);
  const hasRegisteredHours = entries.some(entry => dependencies.toNumber(entry?.hours) > 0);
  if (hasRegisteredHours && typeof dependencies.beregnLon === 'function') {
    dependencies.beregnLon();
  }
}
