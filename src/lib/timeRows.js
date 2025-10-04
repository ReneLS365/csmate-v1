const NORMALIZED_KEYS = new Map([
  ['employeeid', 'employeeId'],
  ['medarbejderid', 'employeeId'],
  ['id', 'employeeId'],
  ['employeename', 'employeeName'],
  ['medarbejder', 'employeeName'],
  ['name', 'employeeName'],
  ['dato', 'date'],
  ['date', 'date'],
  ['timer', 'hours'],
  ['hours', 'hours'],
  ['time', 'hours'],
  ['wagetype', 'wageType'],
  ['wage', 'wageType'],
  ['type', 'wageType'],
  ['notes', 'notes'],
  ['bemærkning', 'notes'],
  ['bemaerkning', 'notes']
])

function normaliseKey (name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
}

export function toUiTimeRow (row = {}) {
  const normalized = {}

  Object.entries(row ?? {}).forEach(([key, value]) => {
    const normKey = normaliseKey(key)
    if (!normKey) return

    if (!Object.prototype.hasOwnProperty.call(normalized, normKey)) {
      normalized[normKey] = value
    }
  })

  const mapped = {}
  Object.entries(normalized).forEach(([key, value]) => {
    const targetKey = NORMALIZED_KEYS.get(key) || key
    mapped[targetKey] = value
  })

  return {
    employeeId: mapped.employeeId ?? '',
    employeeName: mapped.employeeName ?? '',
    date: mapped.date ?? '',
    hours: Number.parseFloat(mapped.hours ?? 0) || 0,
    wageType: mapped.wageType && mapped.wageType !== '' ? mapped.wageType : 'Normal',
    notes: mapped.notes ?? ''
  }
}
