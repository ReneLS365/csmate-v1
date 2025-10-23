import { describe, it, expect } from 'vitest'
import { buildEKompletRows, rowsToCsv } from '../app/src/lib/e-komplet/export.js'
import { parseCsv, applyMapping } from '../app/src/lib/e-komplet/import.js'
import { validateRows } from '../app/src/lib/e-komplet/validate.js'
import { CSV_HEADERS } from '../app/src/lib/e-komplet/schema.js'

describe('E-Komplet export/import roundtrip', () => {
  it('keeps core fields identical', async () => {
    const sag = {
      sagsnummer: 'SAG-123',
      opgave: 'Stillads',
      dato: '2024-02-01',
      kunde: 'Byg A/S'
    }
    const price = { akkordAmount: 4200 }
    const timeRows = [
      { employeeId: 'E1', employeeName: 'Anna', date: '2024-02-01', hours: 7.5, wageType: 'Normal' },
      { employeeId: 'E2', employeeName: 'Bo', date: '2024-02-01', hours: 6, wageType: 'OT50' }
    ]

    const rows = buildEKompletRows(sag, price, timeRows)
    const csv = rowsToCsv(rows)
    const { rows: parsed } = await parseCsv(csv)
    const identity = {}
    CSV_HEADERS.forEach(header => { identity[header] = header })
    const mapped = applyMapping(parsed, identity)
    const validation = validateRows(mapped)
    expect(validation.ok).toBe(true)

    const roundTripIds = mapped.map(row => row.ProjectId)
    expect(new Set(roundTripIds)).toEqual(new Set(rows.map(row => row.ProjectId)))
    expect(mapped.find(row => row.Type === 'AKKORD').AkkordAmount).toBe(String(price.akkordAmount))
    const names = mapped.filter(row => row.Type === 'TIME').map(row => row.EmployeeName)
    expect(names).toContain('Anna')
    expect(names).toContain('Bo')
  })
})
