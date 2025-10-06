import { CSV_HEADERS } from './schema.js'
import { loadMapping, saveMapping } from './storage.js'

const HEADER_ALIASES = new Map([
  ['type', 'Type'],
  ['projectid', 'ProjectId'],
  ['projectname', 'ProjectName'],
  ['project', 'ProjectName'],
  ['sagsnummer', 'ProjectId'],
  ['sag', 'ProjectName'],
  ['employeeid', 'EmployeeId'],
  ['employeename', 'EmployeeName'],
  ['employee', 'EmployeeName'],
  ['medarbejder', 'EmployeeName'],
  ['date', 'Date'],
  ['dato', 'Date'],
  ['taskcode', 'TaskCode'],
  ['wage', 'WageType'],
  ['wageType'.toLowerCase(), 'WageType'],
  ['hour', 'Hours'],
  ['hours', 'Hours'],
  ['timer', 'Hours'],
  ['akkord', 'AkkordAmount'],
  ['akkordamount', 'AkkordAmount'],
  ['amount', 'AkkordAmount'],
  ['notes', 'Notes'],
  ['bemærkning', 'Notes'],
  ['bemaerkning', 'Notes']
])

function normalise (name) {
  return String(name || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]/g, '')
}

export async function parseCsv (input) {
  const text = typeof input === 'string' ? input : await input.text()
  const clean = text.replace(/^\ufeff/, '')
  const lines = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    if (char === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === '\n' && !inQuotes) {
      lines.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current) lines.push(current)
  if (!lines.length) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(cell => cell.trim())
  const rows = lines.slice(1).filter(Boolean).map(line => {
    const values = []
    let value = ''
    let quote = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (quote && line[i + 1] === '"') {
          value += '"'
          i++
        } else {
          quote = !quote
        }
      } else if (char === ',' && !quote) {
        values.push(value)
        value = ''
      } else {
        value += char
      }
    }
    values.push(value)
    const row = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })
    return row
  })
  return { headers, rows }
}

export function inferMapping (headers) {
  const mapping = {}
  headers.forEach(header => {
    const normalised = normalise(header)
    const target = HEADER_ALIASES.get(normalised)
    if (target) {
      mapping[target] = header
    }
  })
  return mapping
}

export function needsMapping (headers) {
  const mapping = inferMapping(headers)
  const hasAll = CSV_HEADERS.every(header => mapping[header] || headers.includes(header))
  return !hasAll
}

export function applyMapping (rows, mapping) {
  return rows.map(row => {
    const mapped = {}
    CSV_HEADERS.forEach(header => {
      if (Object.prototype.hasOwnProperty.call(row, header)) {
        mapped[header] = row[header] ?? ''
        return
      }
      const source = mapping?.[header] || header
      mapped[header] = row[source] ?? ''
    })
    return mapped
  })
}

export function loadSavedMapping () {
  return loadMapping()
}

export function persistMapping (mapping) {
  saveMapping(mapping)
}

export function mergeRowsWithSag (rows, sag = {}) {
  const projectId = sag.sagsnummer || sag.ProjectId || ''
  const projectName = sag.opgave || sag.ProjectName || ''
  const filtered = rows.filter(row => {
    if (!projectId && !projectName) return true
    return (projectId ? row.ProjectId === projectId : true) && (projectName ? row.ProjectName === projectName : true)
  })
  const timeRows = filtered.filter(row => row.Type === 'TIME')
  const akkord = filtered.find(row => row.Type === 'AKKORD') || null
  return { timeRows, akkord }
}
