/** @vitest-environment jsdom */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const overlayMarkup = `
  <div class="csm-np-overlay" id="npOverlay" aria-hidden="true">
    <div class="csm-np" role="dialog" aria-modal="true" aria-label="Tal-tastatur">
      <div class="csm-np-screen" id="npScreen" aria-live="polite">0</div>
      <div class="csm-np-grid">
        <button type="button" data-key="7">7</button>
        <button type="button" data-key="8">8</button>
        <button type="button" data-key="9">9</button>
        <button type="button" data-key="×">×</button>
        <button type="button" data-key="4">4</button>
        <button type="button" data-key="5">5</button>
        <button type="button" data-key="6">6</button>
        <button type="button" data-key="÷">÷</button>
        <button type="button" data-key="1">1</button>
        <button type="button" data-key="2">2</button>
        <button type="button" data-key="3">3</button>
        <button type="button" data-key="-">-</button>
        <button type="button" data-key="0">0</button>
        <button type="button" data-key=",">,</button>
        <button type="button" data-key="C">C</button>
        <button type="button" data-key="+">+</button>
      </div>
      <button type="button" class="csm-np-enter" data-key="enter">Enter</button>
      <button type="button" class="csm-np-close" data-key="close" aria-label="Luk tastatur">×</button>
    </div>
  </div>
`

function createDOM () {
  document.body.innerHTML = `
    <input id="hours" value="0" />
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
})
