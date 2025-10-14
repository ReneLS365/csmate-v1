import { describe, it, expect } from 'vitest'
import { shouldExcludeMaterialEntry } from '../src/lib/materials/exclusions.js'

describe('material exclusion helpers', () => {
  it('skips entries with excluded names', () => {
    expect(shouldExcludeMaterialEntry({ name: 'Km.' })).toBe(true)
    expect(shouldExcludeMaterialEntry({ name: 'Mentortillæg' })).toBe(true)
  })

  it('skips entries when the id matches an excluded key', () => {
    expect(shouldExcludeMaterialEntry({ id: 'Mentortillæg' })).toBe(true)
    expect(shouldExcludeMaterialEntry({ id: 'KM.' })).toBe(true)
  })

  it('allows unrelated entries', () => {
    expect(shouldExcludeMaterialEntry({ name: 'Stige' })).toBe(false)
    expect(shouldExcludeMaterialEntry({ id: 'A-123' })).toBe(false)
  })
})
