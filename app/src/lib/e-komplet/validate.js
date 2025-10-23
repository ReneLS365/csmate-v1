import { CSV_HEADERS, TYPE_VALUES, WAGE_TYPES, normaliseDate, toNumber } from './schema.js'

export function validateRows (rows = []) {
  const errors = []
  const seenKeys = new Set()
  rows.forEach((row, index) => {
    CSV_HEADERS.forEach(header => {
      if (!(header in row)) {
        errors.push({ index, field: header, message: `Mangler kolonne ${header}` })
      }
    })
    if (!TYPE_VALUES.has(row.Type)) {
      errors.push({ index, field: 'Type', message: 'Ugyldig Type' })
    }
    if (row.Type === 'TIME' && !row.EmployeeName) {
      errors.push({ index, field: 'EmployeeName', message: 'Medarbejder mangler' })
    }
    if (row.WageType && !WAGE_TYPES.has(row.WageType)) {
      errors.push({ index, field: 'WageType', message: 'Ugyldig løntype' })
    }
    const date = normaliseDate(row.Date)
    if (!date) {
      errors.push({ index, field: 'Date', message: 'Ugyldig dato' })
    }
    if (row.Type === 'TIME') {
      const hours = toNumber(row.Hours)
      if (hours < 0) {
        errors.push({ index, field: 'Hours', message: 'Timer må ikke være negative' })
      }
    }
    const key = `${row.Type}-${row.ProjectId}-${row.EmployeeId}-${row.Date}-${row.TaskCode}`
    if (seenKeys.has(key)) {
      errors.push({ index, field: 'ProjectId', message: 'Dubletlinje' })
    } else {
      seenKeys.add(key)
    }
  })
  return {
    ok: errors.length === 0,
    errors
  }
}
