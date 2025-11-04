/** @vitest-environment jsdom */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const overlayMarkup = `
  <div class="csm-np-overlay" id="npOverlay" aria-hidden="true" data-testid="numpad-backdrop">
    <div class="csm-np" role="dialog" aria-modal="true" aria-label="Tal-tastatur" tabindex="-1" data-testid="numpad-dialog">
      <div class="csm-np-topbar">
        <button type="button" class="csm-np-close" data-key="close" aria-label="Luk tastatur" data-testid="numpad-close">×</button>
        <div class="csm-np-screen" id="npScreen" aria-live="polite">0</div>
      </div>
      <div class="csm-np-grid">
        <button type="button" data-key="7" aria-label="7">7</button>
        <button type="button" data-key="8" aria-label="8">8</button>
        <button type="button" data-key="9" aria-label="9">9</button>
        <button type="button" data-key="×" aria-label="gange" class="csm-np-operator">×</button>
        <button type="button" data-key="4" aria-label="4">4</button>
        <button type="button" data-key="5" aria-label="5">5</button>
        <button type="button" data-key="6" aria-label="6">6</button>
        <button type="button" data-key="÷" aria-label="divider" class="csm-np-operator">÷</button>
        <button type="button" data-key="1" aria-label="1">1</button>
        <button type="button" data-key="2" aria-label="2">2</button>
        <button type="button" data-key="3" aria-label="3">3</button>
        <button type="button" data-key="-" aria-label="minus" class="csm-np-operator">-</button>
        <button type="button" data-key="0" aria-label="0">0</button>
        <button type="button" data-key="," aria-label="komma">,</button>
        <button type="button" data-key="C" aria-label="clear" class="csm-np-operator">C</button>
        <button type="button" data-key="+" aria-label="plus" class="csm-np-operator">+</button>
      </div>
      <button type="button" class="csm-np-equals" data-key="=" aria-label="equals">=</button>
      <button type="button" class="csm-np-enter" data-key="enter">Enter</button>
    </div>
  </div>
`

function createDOM () {
  document.body.innerHTML = `
    <input id="hours" value="0" data-numpad-field="hours" />
    <input id="next" value="0" data-numpad-field="next" />
    ${overlayMarkup}
  `
  const input = document.getElementById('hours')
  input?.focus()
  return input
}

describe('numpad interactions', () => {
  let openNumpad
  let isNumpadOpen

  beforeEach(async () => {
    vi.resetModules()
    const input = createDOM()
    expect(input).toBeInstanceOf(HTMLElement)
    ;({ openNumpad, isNumpadOpen } = await import('../app/src/ui/numpad.js'))
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('commits value with Enter and returns focus', async () => {
    const input = document.getElementById('hours')
    input.value = '12'

    const resultPromise = openNumpad({ startValue: '12', baseValue: 12 })
    expect(isNumpadOpen()).toBe(true)

    const type = key => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true })
      document.dispatchEvent(event)
    }

    type('Backspace')
    type('Backspace')
    type('1')
    type('6')
    type('Enter')

    const result = await resultPromise
    expect(result).toBe('16')
    expect(isNumpadOpen()).toBe(false)

    await Promise.resolve()
    expect(document.activeElement).toBe(input)
  })

  it('commits with Enter button click and does NOT jump focus to next field', async () => {
    const input = document.getElementById('hours')
    const next = document.getElementById('next')
    input.value = '8'

    const resultPromise = openNumpad({ startValue: '8', baseValue: 8 })
    expect(isNumpadOpen()).toBe(true)

    // Simulate clicking the Enter button
    const enterButton = document.querySelector('button[data-key="enter"]')
    expect(enterButton).toBeInstanceOf(HTMLElement)

    const pointerEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1
    })
    enterButton.dispatchEvent(pointerEvent)

    const result = await resultPromise
    expect(result).toBe('8')
    expect(isNumpadOpen()).toBe(false)

    // Focus should return to the original input, NOT jump to the next field
    await Promise.resolve()
    expect(document.activeElement).toBe(input)
    expect(document.activeElement).not.toBe(next)
  })

  it('commits with Enter key and does NOT jump focus to next field', async () => {
    const input = document.getElementById('hours')
    const next = document.getElementById('next')
    input.value = '5'

    const resultPromise = openNumpad({ startValue: '5', baseValue: 5 })
    expect(isNumpadOpen()).toBe(true)

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    document.dispatchEvent(enterEvent)

    const result = await resultPromise
    expect(result).toBe('5')
    expect(isNumpadOpen()).toBe(false)

    // Focus should return to the original input, NOT jump to the next field
    await Promise.resolve()
    expect(document.activeElement).toBe(input)
    expect(document.activeElement).not.toBe(next)
  })

  it('commits on Tab and focuses the next numpad field', async () => {
    const input = document.getElementById('hours')
    const next = document.getElementById('next')
    input.value = '4'

    const resultPromise = openNumpad({ startValue: '4', baseValue: 4 })
    expect(isNumpadOpen()).toBe(true)

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    document.dispatchEvent(tabEvent)

    const result = await resultPromise
    expect(result).toBe('4')
    expect(isNumpadOpen()).toBe(false)

    await Promise.resolve()
    await Promise.resolve()
    expect(document.activeElement).toBe(next)
  })

  it('closes without commit on Escape', async () => {
    const input = document.getElementById('hours')
    input.value = '99'

    const resultPromise = openNumpad({ startValue: '99', baseValue: 99 })
    expect(isNumpadOpen()).toBe(true)

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    document.dispatchEvent(escapeEvent)

    const result = await resultPromise
    expect(result).toBeNull()
    expect(isNumpadOpen()).toBe(false)

    await Promise.resolve()
    expect(document.activeElement).toBe(input)
  })

  it('applies inert to the background while open', async () => {
    const input = document.getElementById('hours')
    const promise = openNumpad({ startValue: '1', baseValue: 1 })
    expect(isNumpadOpen()).toBe(true)
    expect(input?.getAttribute('aria-hidden')).toBe('true')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await promise
    expect(input?.hasAttribute('aria-hidden')).toBe(false)
  })

  it('falls back to first field on Escape if original field is disabled', async () => {
    const input = document.getElementById('hours')
    const next = document.getElementById('next')
    input.value = '7'

    const resultPromise = openNumpad({ startValue: '7', baseValue: 7 })
    expect(isNumpadOpen()).toBe(true)

    // Disable the original field while numpad is open
    input.disabled = true

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    document.dispatchEvent(escapeEvent)

    const result = await resultPromise
    expect(result).toBeNull()
    expect(isNumpadOpen()).toBe(false)

    // Focus should fall back to the first available field for accessibility
    await Promise.resolve()
    await Promise.resolve()
    expect(document.activeElement).toBe(next)
  })

  it('evaluates expression with equals button without closing', async () => {
    const input = document.getElementById('hours')
    const resultPromise = openNumpad({ startValue: '12', baseValue: 12 })
    expect(isNumpadOpen()).toBe(true)

    const screen = document.getElementById('npScreen')
    expect(screen.textContent).toBe('12')

    // Click the plus button
    const plusButton = document.querySelector('button[data-key="+"]')
    plusButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }))
    expect(screen.textContent).toBe('12+')

    // Click 3
    const threeButton = document.querySelector('button[data-key="3"]')
    threeButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }))
    expect(screen.textContent).toBe('12+3')

    // Click equals button
    const equalsButton = document.querySelector('button[data-key="="]')
    equalsButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }))

    // Should show result and still be open
    expect(screen.textContent).toBe('15')
    expect(isNumpadOpen()).toBe(true)

    // Now commit with Enter
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    document.dispatchEvent(enterEvent)

    const result = await resultPromise
    expect(result).toBe('15')
    expect(isNumpadOpen()).toBe(false)
  })

  it('evaluates multiplication with equals key', async () => {
    const resultPromise = openNumpad({ startValue: '10', baseValue: 10 })
    expect(isNumpadOpen()).toBe(true)

    const screen = document.getElementById('npScreen')

    // Type 10×2 (using * key which maps to ×)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '*', bubbles: true }))
    expect(screen.textContent).toBe('10×')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))
    expect(screen.textContent).toBe('10×2')

    // Press equals key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '=', bubbles: true }))

    // Should show result
    expect(screen.textContent).toBe('20')
    expect(isNumpadOpen()).toBe(true)

    // Close without committing
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    const result = await resultPromise
    expect(result).toBeNull()
  })

  it('handles division with decimal result using equals', async () => {
    const resultPromise = openNumpad({ startValue: '10', baseValue: 10 })
    expect(isNumpadOpen()).toBe(true)

    const screen = document.getElementById('npScreen')

    // Type 10÷4
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '÷', bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }))

    // Press equals
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '=', bubbles: true }))

    // Should show result with comma as decimal separator
    expect(screen.textContent).toBe('2,5')
    expect(isNumpadOpen()).toBe(true)

    // Close
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await resultPromise
  })

  it('handles invalid expression with equals gracefully', async () => {
    const resultPromise = openNumpad({ startValue: '1', baseValue: 1 })
    expect(isNumpadOpen()).toBe(true)

    const screen = document.getElementById('npScreen')

    // Type invalid expression: 1,,2
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ',', bubbles: true }))
    expect(screen.textContent).toBe('1,')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ',', bubbles: true }))
    // Second comma should be ignored by currentOperandHasComma check
    expect(screen.textContent).toBe('1,')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))
    expect(screen.textContent).toBe('1,2')

    // Press equals - should work fine with 1.2
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '=', bubbles: true }))
    expect(screen.textContent).toBe('1,2')
    expect(isNumpadOpen()).toBe(true)

    // Close
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await resultPromise
  })
})
