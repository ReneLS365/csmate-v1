import { describe, expect, it, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { loadStackConfig, hasStackConfig, maskSecret } from '../stack/config.js'
import { createStackServerApp, getStackServerApp, resetStackServerApp } from '../stack/server.js'

const ORIGINAL_ENV = { ...process.env }
const STACK_KEYS = [
  'STACK_PROJECT_ID',
  'STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY',
  'STACK_BASE_URL',
  'STACK_TOKEN_STORE',
  'DATABASE_URL',
  'VITE_DATABASE_URL'
]

function overrideStackEnv (entries) {
  for (const key of STACK_KEYS) {
    if (entries && Object.prototype.hasOwnProperty.call(entries, key)) {
      const value = entries[key]
      if (value === undefined || value === null) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    } else {
      delete process.env[key]
    }
  }
}

describe('stack config', () => {
  beforeEach(() => {
    overrideStackEnv({
      STACK_PROJECT_ID: 'proj-123',
      STACK_PUBLISHABLE_CLIENT_KEY: 'pk-abc',
      STACK_SECRET_SERVER_KEY: 'sk-secret',
      STACK_BASE_URL: 'https://auth.example.com',
      STACK_TOKEN_STORE: 'memory',
      DATABASE_URL: 'postgres://example'
    })
    resetStackServerApp()
  })

  afterEach(() => {
    resetStackServerApp()
    overrideStackEnv({})
  })

  afterAll(() => {
    overrideStackEnv(ORIGINAL_ENV)
  })

  it('loads stack config from environment', () => {
    const config = loadStackConfig()
    expect(config.projectId).toBe('proj-123')
    expect(config.publishableClientKey).toBe('pk-abc')
    expect(config.secretServerKey).toBe('sk-secret')
    expect(config.baseUrl).toBe('https://auth.example.com')
    expect(config.databaseUrl).toBe('postgres://example')
    expect(config.tokenStore).toBe('memory')
  })

  it('throws when required env vars are missing', () => {
    overrideStackEnv({ STACK_PROJECT_ID: '', STACK_PUBLISHABLE_CLIENT_KEY: '', STACK_SECRET_SERVER_KEY: '' })
    expect(() => loadStackConfig()).toThrow(/Missing Neon Auth environment variables/)
  })

  it('detects config presence', () => {
    expect(hasStackConfig()).toBe(true)
    overrideStackEnv({})
    expect(hasStackConfig()).toBe(false)
  })

  it('masks secrets for logging', () => {
    expect(maskSecret('abcd1234')).toBe('********')
    expect(maskSecret('short')).toBe('*****')
  })

  it('creates and caches stack server app', () => {
    const factory = vi.fn((cfg) => ({ cfg, createdAt: Date.now() }))
    const direct = createStackServerApp({ factory })
    expect(direct.cfg.projectId).toBe('proj-123')
    expect(factory).toHaveBeenCalledTimes(1)

    const cachedFirst = getStackServerApp({ factory })
    expect(cachedFirst.cfg.projectId).toBe('proj-123')
    expect(factory).toHaveBeenCalledTimes(2)

    const cachedSecond = getStackServerApp({ factory })
    expect(cachedSecond).toBe(cachedFirst)
    expect(factory).toHaveBeenCalledTimes(2)

    const forced = getStackServerApp({ factory, force: true })
    expect(forced).not.toBe(cachedFirst)
    expect(factory).toHaveBeenCalledTimes(3)
  })
})
