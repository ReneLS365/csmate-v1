import { describe, it, expect } from 'vitest'
import { validateRows } from '../app/src/lib/e-komplet/validate.js'

const baseRow = {
  Type: 'TIME',
  ProjectId: 'SAG-1',
  ProjectName: 'Tagrenovering',
  EmployeeId: 'E1',
  EmployeeName: 'Anna',
  Date: '2024-01-15',
  TaskCode: 'TASK1',
  WageType: 'Normal',
  Hours: 7.5,
  AkkordAmount: '',
  Notes: ''
}

describe('E-Komplet row validation', () => {
  it('accepts a valid dataset', () => {
    const rows = [
      { ...baseRow },
      { ...baseRow, Type: 'AKKORD', EmployeeName: '', EmployeeId: '', Hours: '', AkkordAmount: 1250 }
    ]
    const result = validateRows(rows)
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects invalid type, date and negative hours', () => {
    const rows = [
      { ...baseRow, Type: 'WRONG' },
      { ...baseRow, Date: 'not-a-date' },
      { ...baseRow, Hours: -5 }
    ]
    const result = validateRows(rows)
    expect(result.ok).toBe(false)
    const messages = result.errors.map(err => err.field)
    expect(messages).toContain('Type')
    expect(messages).toContain('Date')
    expect(messages).toContain('Hours')
  })
})
