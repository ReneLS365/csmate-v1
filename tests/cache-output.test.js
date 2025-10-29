import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { generateCacheReport } from '../scripts/cache-report.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

function loadManifest () {
  const manifestPath = resolve(projectRoot, 'cache-output.json')
  const raw = readFileSync(manifestPath, 'utf8')
  return JSON.parse(raw)
}

describe('cache-output manifest', () => {
  it('matches the service worker precache list', () => {
    const expected = generateCacheReport({ projectRoot })
    const manifest = loadManifest()

    expect(manifest.version).toBe(expected.version)
    expect(manifest.cacheName).toBe(expected.cacheName)
    expect(manifest.cachePrefix).toBe(expected.cachePrefix)
    expect(manifest.precache.map((entry) => entry.url)).toEqual(
      expected.precache.map((entry) => entry.url)
    )
    expect(manifest.dataMatchers).toEqual(expected.dataMatchers)
  })

  it('contains size and hash for each cached file', () => {
    const manifest = loadManifest()
    manifest.precache.forEach((entry) => {
      expect(entry.exists).toBe(true)
      expect(typeof entry.bytes).toBe('number')
      expect(entry.bytes).toBeGreaterThan(0)
      expect(typeof entry.sha256).toBe('string')
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
