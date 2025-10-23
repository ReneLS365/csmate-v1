import { describe, it, expect, beforeEach } from 'vitest'
import { CalcCore } from '../app/src/lib/calc-core.js'

function inputNumber (calc, value) {
  String(value).split('').forEach(ch => {
    if (ch === '.') calc.inputDecimal()
    else calc.inputDigit(ch)
  })
}

describe('CalcCore intelligent percent', () => {
  let calc

  beforeEach(() => {
    calc = new CalcCore()
  })

  it('100 + 7 % = 107', () => {
    inputNumber(calc, '100')
    calc.inputOperator('+')
    inputNumber(calc, '7')
    calc.inputPercent()
    calc.inputEquals()
    expect(Number(calc.getDisplay())).toBeCloseTo(107)
  })

  it('100 - 7 % = 93', () => {
    inputNumber(calc, '100')
    calc.inputOperator('-')
    inputNumber(calc, '7')
    calc.inputPercent()
    calc.inputEquals()
    expect(Number(calc.getDisplay())).toBeCloseTo(93)
  })

  it('300 × 5 % = 15', () => {
    inputNumber(calc, '300')
    calc.inputOperator('×')
    inputNumber(calc, '5')
    calc.inputPercent()
    calc.inputEquals()
    expect(Number(calc.getDisplay())).toBeCloseTo(15)
  })

  it('400 ÷ 50 % = 800', () => {
    inputNumber(calc, '400')
    calc.inputOperator('÷')
    inputNumber(calc, '50')
    calc.inputPercent()
    calc.inputEquals()
    expect(Number(calc.getDisplay())).toBeCloseTo(800)
  })

  it('7 % = 0.07', () => {
    inputNumber(calc, '7')
    calc.inputPercent()
    expect(Number(calc.getDisplay())).toBeCloseTo(0.07)
  })
})

describe('CalcCore roots and errors', () => {
  let calc

  beforeEach(() => {
    calc = new CalcCore()
  })

  it('√9 = 3', () => {
    inputNumber(calc, '9')
    calc.inputSqrt()
    expect(Number(calc.getDisplay())).toBeCloseTo(3)
  })

  it('√-1 triggers error', () => {
    inputNumber(calc, '1')
    calc.inputOperator('-')
    inputNumber(calc, '2')
    calc.inputEquals()
    calc.inputSqrt()
    expect(calc.getDisplay()).toBe('Fejl')
  })

  it('Division by zero -> Fejl', () => {
    inputNumber(calc, '9')
    calc.inputOperator('÷')
    inputNumber(calc, '0')
    calc.inputEquals()
    expect(calc.getDisplay()).toBe('Fejl')
  })
})
