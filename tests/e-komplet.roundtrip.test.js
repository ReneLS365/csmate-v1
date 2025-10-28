import { describe, it, expect } from 'vitest'
import { buildEKompletRows, rowsToCsv } from '../app/src/lib/e-komplet/export.js'
import { parseCsv, applyMapping } from '../app/src/lib/e-komplet/import.js'
import { validateRows } from '../app/src/lib/e-komplet/validate.js'
import { CSV_HEADERS } from '../app/src/lib/e-komplet/schema.js'
import { EK_HEADER, exportEKCSV } from '../src/lib/exporters-ek.js'
import { selectComputed } from '../src/modules/selectors.js'

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

  it('emits the expanded EK header and formatted row', () => {
    const state = {
      id: 'PR-42',
      totals: { materials: 12000 },
      materialsSum: 12000,
      sledPercent: 0.07,
      kmQty: 0,
      kmRate: 0,
      hoursMontage: 40,
      addOns: { udd1: 0, udd2: 0, mentor: 0 },
      pay: { base_wage_hourly: 185.5 }
    }

    const csv = exportEKCSV(state)
    const cols = csv.split(';')
    expect(EK_HEADER).toBe('project_id;job_type;variant;hours;base_wage;hourly_no_add;overskud_pr_time;overskud_total;accord_sum')
    expect(cols).toHaveLength(9)
    expect(cols[0]).toBe('PR-42')
    expect(cols[1]).toBe('montage')
    expect(cols[2]).toBe('noAdd')
    expect(cols[3]).toBe('40,00')
    expect(cols[4]).toBe('185,50')

    const computed = selectComputed(state)
    const hourlyNoAdd = computed.hourlyNoAdd.toFixed(2).replace('.', ',')
    const overskudPerTime = Math.max(computed.hourlyNoAdd - state.pay.base_wage_hourly, 0).toFixed(2).replace('.', ',')
    const overskudTotal = Math.max(computed.hourlyNoAdd - state.pay.base_wage_hourly, 0) * computed.hours

    expect(cols[5]).toBe(hourlyNoAdd)
    expect(cols[6]).toBe(overskudPerTime)
    expect(cols[7]).toBe(overskudTotal.toFixed(2).replace('.', ','))
    expect(cols[8]).toMatch(/\d+,\d{2}/)
  })

  it('clamps overskud values when hourly rates fall below the base wage', () => {
    const state = {
      id: 'PR-43',
      totals: { materials: 4000 },
      materialsSum: 4000,
      sledPercent: 0.07,
      kmQty: 0,
      kmRate: 0,
      hoursMontage: 32,
      addOns: { udd1: 0, udd2: 0, mentor: 0 },
      pay: { base_wage_hourly: 999 }
    }

    const csv = exportEKCSV(state)
    const cols = csv.split(';')
    expect(cols[6]).toBe('0,00')
    expect(cols[7]).toBe('0,00')
  })
})
