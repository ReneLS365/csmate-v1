const KEY_ALIASES = {
  employeeid: 'employeeId',
  medarbejderid: 'employeeId',
  id: 'employeeId',
  employeename: 'employeeName',
  medarbejder: 'employeeName',
  name: 'employeeName',
  dato: 'date',
  date: 'date',
  timer: 'hours',
  hours: 'hours',
  time: 'hours',
  wagetype: 'wageType',
  wage: 'wageType',
  type: 'wageType',
  notes: 'notes',
  bemaerkning: 'notes'
}

function normaliseKey (name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
}

export function toUiTimeRow (row = {}) {
  const normalized = {}

  Object.entries(row).forEach(([key, value]) => {
    const normKey = normaliseKey(key)
    if (!normKey) return

    const targetKey = KEY_ALIASES[normKey] || normKey
    if (!Object.prototype.hasOwnProperty.call(normalized, targetKey)) {
      normalized[targetKey] = value
    }
  })

  return {
    employeeId: normalized.employeeId ?? '',
    employeeName: normalized.employeeName ?? '',
    date: normalized.date ?? '',
    hours: Number.parseFloat(normalized.hours ?? 0) || 0,
    wageType: normalized.wageType && normalized.wageType !== '' ? normalized.wageType : 'Normal',
    notes: normalized.notes ?? ''
  }
}
