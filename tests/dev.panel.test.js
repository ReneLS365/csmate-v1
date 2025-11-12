/**
 * @vitest-environment jsdom
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { openDevPanel } from '../app/src/dev/panel.js'

const originalFetch = globalThis.fetch
const originalShowModal = window.HTMLDialogElement?.prototype?.showModal
const originalClose = window.HTMLDialogElement?.prototype?.close
const originalAlert = window.alert

let fetchMock

function ensureDialogSkeleton () {
  document.body.innerHTML = `
    <dialog id="dev-panel">
      <h3 id="dev-panel-title">Dev Panel</h3>
      <span class="swver"></span>
      <span class="build-time"></span>
      <span class="tenant"></span>
      <span class="tenant-user"></span>
      <ul class="error-log"></ul>
      <button id="close-dev">Luk</button>
    </dialog>
  `
}

describe('dev panel error log', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    ensureDialogSkeleton()
    window.csmate = window.csmate || {}
    window.csmate.errors = []
    window.csmate.currentUser = {
      roles: ['owner'],
      email: 'owner@example.com',
      tenants: [{ id: 'TEN-1' }]
    }

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("const SW_VERSION = 'v20240101T120000'")
    })
    globalThis.fetch = fetchMock

    if (window.HTMLDialogElement) {
      Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', {
        configurable: true,
        writable: true,
        value: vi.fn()
      })
      Object.defineProperty(window.HTMLDialogElement.prototype, 'close', {
        configurable: true,
        writable: true,
        value: vi.fn()
      })
    }

    window.alert = vi.fn()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    if (originalFetch) {
      globalThis.fetch = originalFetch
    } else {
      delete globalThis.fetch
    }
    if (window.HTMLDialogElement) {
      if (originalShowModal) {
        Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', {
          configurable: true,
          writable: true,
          value: originalShowModal
        })
      } else {
        delete window.HTMLDialogElement.prototype.showModal
      }
      if (originalClose) {
        Object.defineProperty(window.HTMLDialogElement.prototype, 'close', {
          configurable: true,
          writable: true,
          value: originalClose
        })
      } else {
        delete window.HTMLDialogElement.prototype.close
      }
    }
    if (originalAlert) {
      window.alert = originalAlert
    } else {
      delete window.alert
    }
  })

  it('renders the 10 most recent errors with stack traces', async () => {
    for (let index = 0; index < 12; index += 1) {
      const error = new Error(`boom ${index}`)
      error.stack = `Error: boom ${index}`
      const event = new window.ErrorEvent('error', {
        message: `boom ${index}`,
        error
      })
      window.dispatchEvent(event)
    }

    await openDevPanel()

    const items = document.querySelectorAll('#dev-panel .error-log li')
    expect(items).toHaveLength(10)
    expect(items[0].textContent).toContain('boom 2')
    expect(items[items.length - 1].textContent).toContain('boom 11')
    const stackNodes = document.querySelectorAll('#dev-panel .error-entry__stack')
    expect(stackNodes.length).toBeGreaterThan(0)
    expect(stackNodes[0].textContent).toContain('Error: boom')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('denies access for users without owner/admin roles', async () => {
    window.csmate.currentUser = { roles: ['viewer'], email: 'viewer@example.com' }

    const result = await openDevPanel()

    expect(result).toBeNull()
    expect(window.alert).toHaveBeenCalledWith('Kun admin adgang')
  })
})
