import { describe, it, expect, beforeEach, vi } from 'vitest'

function createStorage () {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)) },
    removeItem: (key) => { store.delete(key) },
    clear: () => { store.clear() }
  }
}

async function loadQueueModule () {
  vi.resetModules()
  const storage = createStorage()
  const eventTarget = new EventTarget()
  Object.assign(eventTarget, {
    location: { origin: 'http://localhost' },
    localStorage: storage,
    navigator: {}
  })
  global.window = eventTarget
  global.localStorage = storage
  global.document = { body: { dataset: {} } }
  window.csmate = {}
  try {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true })
  } catch {
    window.indexedDB = undefined
  }
  return await import('../app/src/core/net-queue.js')
}

describe('net-queue', () => {
  let queue

  beforeEach(async () => {
    queue = await loadQueueModule()
  })

  it('stores operations and drains successfully', async () => {
    await queue.enqueue({ url: '/test', method: 'POST', body: JSON.stringify({ ok: 1 }) })
    let ops = await queue.allOps()
    expect(ops).toHaveLength(1)
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    await queue.drain({ fetchImpl: mockFetch })
    ops = await queue.allOps()
    expect(ops).toHaveLength(0)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/test'), expect.objectContaining({ method: 'POST' }))
  })

  it('schedules retry with backoff on failure', async () => {
    await queue.enqueue({ url: '/fail', method: 'POST' })
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })
    await queue.drain({ fetchImpl: mockFetch })
    const ops = await queue.allOps()
    expect(ops).toHaveLength(1)
    expect(ops[0].tries).toBeGreaterThanOrEqual(1)
    expect(ops[0].nextAt).toBeGreaterThan(Date.now() - 10)
  })
})
