import { describe, it, expect, beforeEach, vi } from 'vitest'

let isEffectivelyOnline
let setOfflineUserFlag
let ONLINE_EVENT_NAME

function setNavigatorOnline (value) {
  Object.defineProperty(global.navigator, 'onLine', {
    configurable: true,
    get: () => value
  })
}

describe('net-guard', () => {
  beforeEach(async () => {
    const navigatorStub = { onLine: true }
    const documentStub = {
      body: { dataset: {} },
      querySelectorAll: () => [],
      getElementById: () => null
    }
    if (typeof global.CustomEvent === 'undefined') {
      global.CustomEvent = class CustomEvent extends Event {
        constructor (name, params) {
          super(name, params)
          this.detail = params?.detail
        }
      }
    }
    const listeners = new Map()
    const windowStub = {
      navigator: navigatorStub,
      location: { origin: 'http://localhost' },
      addEventListener: (type, handler) => {
        const list = listeners.get(type) || []
        list.push(handler)
        listeners.set(type, list)
      },
      removeEventListener: (type, handler) => {
        const list = listeners.get(type)
        if (!list) return
        const index = list.indexOf(handler)
        if (index >= 0) list.splice(index, 1)
      },
      dispatchEvent: (event) => {
        const list = listeners.get(event.type)
        if (!list || list.length === 0) return true
        list.slice().forEach(handler => {
          try {
            handler.call(windowStub, event)
          } catch (error) {
            console.error(error)
          }
        })
        return true
      }
    }
    global.window = windowStub
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: navigatorStub
    })
    global.document = documentStub
    ;({ isEffectivelyOnline, setOfflineUserFlag, ONLINE_EVENT_NAME } = await import('../app/src/core/net-guard.js'))
  })

  it('reports online when browser online and no offline override', () => {
    setNavigatorOnline(true)
    setOfflineUserFlag(false)
    expect(isEffectivelyOnline()).toBe(true)
  })

  it('reports offline when browser offline', () => {
    setNavigatorOnline(false)
    expect(isEffectivelyOnline()).toBe(false)
  })

  it('reports offline when offline user flag set', () => {
    setOfflineUserFlag(true)
    expect(isEffectivelyOnline()).toBe(false)
  })

  it('updates body dataset based on offline state', () => {
    setOfflineUserFlag(true)
    expect(document.body.dataset.online).toBe('0')
    setOfflineUserFlag(false)
    expect(document.body.dataset.online).toBe('1')
  })
})
