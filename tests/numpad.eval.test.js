import { describe, it, expect } from 'vitest'
import { evalExpr } from '../src/ui/numpad.js'

describe('evalExpr', () => {
  it('returns base value when expression is empty', () => {
    expect(evalExpr('', 42)).toBe(42)
  })

  it('supports relative additions with locale commas', () => {
    expect(evalExpr('+0,5', '12,5')).toBeCloseTo(13)
  })

  it('supports multiplicative expressions from the base value', () => {
    expect(evalExpr('×2', 7.5)).toBeCloseTo(15)
    expect(evalExpr('÷4', 12)).toBeCloseTo(3)
  })

  it('treats plain numbers as absolute values', () => {
    expect(evalExpr('17,25', 3)).toBeCloseTo(17.25)
  })

  it('rejects invalid characters', () => {
    expect(() => evalExpr('5+abc', 10)).toThrow()
  })
})
