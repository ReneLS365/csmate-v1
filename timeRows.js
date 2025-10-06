const timeRowsState = [];
let timeRowsContainer = null;

function normalizeKey(key) {
  return String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
}

function toUiTimeRow(row) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    const normKey = normalizeKey(key);
    if (!Object.prototype.hasOwnProperty.call(normalized, normKey)) {
      normalized[normKey] = value;
    }
  });

  const employeeName = normalized.employeename ?? normalized.employee ?? normalized.name ?? '';
  const employeeId = normalized.employeeid ?? normalized.id ?? '';
  const date = normalized.date ?? '';
  const hours = toNumber(normalized.hours ?? normalized.time ?? normalized.timer);
  const wageType = normalized.wagetype ?? normalized.type ?? '';
  const notes = normalized.notes ?? normalized.note ?? '';

  return {
    employeeName: String(employeeName ?? '').trim(),
    employeeId: employeeId === undefined || employeeId === null ? '' : String(employeeId).trim(),
    date: String(date ?? '').trim(),
    hours,
    wageType: String(wageType ?? '').trim(),
    notes: String(notes ?? '').trim(),
  };
}

export function getTimeRows() {
  return timeRowsState;
}

export function saveTimeRows(rows = getTimeRows()) {
  const sanitized = rows.map(row => ({
    employeeName: String(row.employeeName ?? '').trim(),
    employeeId: row.employeeId === undefined || row.employeeId === null ? '' : String(row.employeeId).trim(),
    date: String(row.date ?? '').trim(),
    hours: toNumber(row.hours),
    wageType: String(row.wageType ?? '').trim(),
    notes: String(row.notes ?? '').trim(),
  }));
  timeRowsState.splice(0, timeRowsState.length, ...sanitized);
  renderTimeRows();
  return timeRowsState;
}

export function setTimeRowsContainer(element) {
  timeRowsContainer = element || null;
  renderTimeRows();
}

export function renderTimeRows() {
  if (!timeRowsContainer) return;
  const rows = getTimeRows();
  if (!rows.length) {
    timeRowsContainer.innerHTML = '<p class="time-rows-empty">Ingen tidsregistreringer</p>';
    return;
  }

  const headers = ['Medarbejder', 'ID', 'Dato', 'Timer', 'Løn-type', 'Noter'];
  const table = document.createElement('table');
  table.className = 'time-rows-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headers.forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');
    const cells = [
      row.employeeName,
      row.employeeId,
      row.date,
      Number.isFinite(row.hours) ? row.hours.toString() : '',
      row.wageType,
      row.notes,
    ];
    cells.forEach(value => {
      const td = document.createElement('td');
      td.textContent = value || '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  timeRowsContainer.innerHTML = '';
  timeRowsContainer.appendChild(table);
}

export function mergeRowsWithSag(imported = {}) {
  const rawRows = Array.isArray(imported.TIME) ? imported.TIME : [];
  const uiRows = rawRows.map(toUiTimeRow);
  const state = getTimeRows();
  state.splice(0, state.length, ...uiRows);
  saveTimeRows(state);
  const current = getTimeRows().map(row => ({ ...row }));
  return { ...imported, TIME: current };
}

export function _applyImportedRows(imported) {
  return mergeRowsWithSag(imported);
}

if (typeof window !== 'undefined') {
  window.timeRowsModule = Object.assign(window.timeRowsModule || {}, {
    getTimeRows,
    saveTimeRows,
    setTimeRowsContainer,
    renderTimeRows,
    mergeRowsWithSag,
    _applyImportedRows,
  });
}

export default {
  getTimeRows,
  saveTimeRows,
  setTimeRowsContainer,
  renderTimeRows,
  mergeRowsWithSag,
  _applyImportedRows,
};
