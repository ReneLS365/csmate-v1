/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { initialiseDiagnostics } from '../app/src/ui/diagnostics.js'

function createCalcStub () {
  return {
    clearAll: vi.fn(),
    inputDigit: vi.fn(),
    inputOperator: vi.fn(),
    inputEquals: vi.fn(),
    getDisplay: vi.fn().mockReturnValue('10')
  }
}

describe('diagnostics panel', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    window.history.replaceState({}, '', '/?debug=1')
  })

  it('escapes diagnostics details when rendering log entries', async () => {
    const root = document.getElementById('root')

    await initialiseDiagnostics({ calc: createCalcStub(), root })

    const payload = '<img src=x onerror="alert(1)">' // malicious content
    const errorEvent = new window.ErrorEvent('error', { message: payload })
    window.dispatchEvent(errorEvent)

    const entries = Array.from(document.querySelectorAll('.csmate-diagnostics li'))
    const injected = entries.find((item) => item.textContent.includes('img src'))

    expect(injected).toBeTruthy()
    expect(injected.innerHTML).not.toContain('<img')
    expect(injected.textContent).toContain(payload)
  })
})
