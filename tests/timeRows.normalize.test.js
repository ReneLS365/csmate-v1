import { describe, expect, it, afterEach, beforeEach } from 'vitest'
import { toUiTimeRow } from '../src/lib/timeRows.js'

describe('time row key normalisation without String.normalize', () => {
  const originalNormalize = String.prototype.normalize

  beforeEach(() => {
    // simulate environments (fx ældre webviews) der ikke understøtter normalize
    String.prototype.normalize = undefined
  })

  afterEach(() => {
    String.prototype.normalize = originalNormalize
  })

  it('removes diacritics fra header-navne ved import', () => {
    const uiRow = toUiTimeRow({ 'Årbejdstype': 'Normal', 'Tîmer': '2', 'Notés': 'note' })

    expect(uiRow).toEqual({
      employeeId: '',
      employeeName: '',
      date: '',
      hours: 2,
      wageType: 'Normal',
      notes: 'note'
    })
  })

  it('bevarer ukendte tegn hvis der ikke findes fallback', () => {
    const uiRow = toUiTimeRow({ '字段': 'værdi' })

    expect(uiRow).toEqual({
      employeeId: '',
      employeeName: '',
      date: '',
      hours: 0,
      wageType: 'Normal',
      notes: ''
    })
  })
})
