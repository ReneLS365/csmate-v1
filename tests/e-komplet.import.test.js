import { describe, it, expect } from 'vitest'
import { parseCsv, applyMapping } from '../src/lib/e-komplet/import.js'

describe('E-Komplet import mapping', () => {
  it('prefers canonical headers over saved overrides', async () => {
    const csv = 'Hours,Timer\n7.5,8.0\n'
    const { rows } = await parseCsv(csv)
    const savedMapping = { Hours: 'Timer' }

    const mapped = applyMapping(rows, savedMapping)

    expect(mapped).toHaveLength(1)
    expect(mapped[0].Hours).toBe('7.5')
  })
})
