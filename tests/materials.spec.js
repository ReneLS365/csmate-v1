/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { createMaterialRow, attachRowHandlers } from '../app/src/modules/materialRowTemplate.js'

describe('Material rows layout', () => {
  it('custom rows use same structure and show price input', () => {
    const { row } = createMaterialRow({ id: 'x', name: '', quantity: 0, price: 0, manual: true })
    const name = row.querySelector('.csm-name')
    const qty = row.querySelector('.csm-qty')
    const price = row.querySelector('.csm-price')
    const sum = row.querySelector('.csm-sum')

    expect(name).toBeTruthy()
    expect(qty).toBeTruthy()
    expect(price).toBeTruthy()
    expect(sum).toBeTruthy()

    const style = getComputedStyle(price)
    expect(['', 'static']).toContain(style.position)
  })

  it('sum updates when price or qty changes', () => {
    const { row, qtyInput, priceInput, sumElement } = createMaterialRow({ id: 'y', name: 'Test', quantity: 2, price: 10 })
    attachRowHandlers(row)

    priceInput.value = '12.5'
    priceInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(sumElement.textContent).toMatch(/25,00|25.00/)

    qtyInput.value = '3'
    qtyInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(sumElement.textContent).toMatch(/37,50|37.50/)
  })
})
