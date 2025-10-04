export const CSV_HEADERS = [
  'Type',
  'ProjectId',
  'ProjectName',
  'EmployeeId',
  'EmployeeName',
  'Date',
  'TaskCode',
  'WageType',
  'Hours',
  'AkkordAmount',
  'Notes'
]

export const TYPE_VALUES = new Set(['TIME', 'AKKORD'])
export const WAGE_TYPES = new Set(['Normal', 'OT50', 'OT100'])

export function normaliseDate (value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function toNumber (value) {
  if (value == null || value === '') return 0
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}
