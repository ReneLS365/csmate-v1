#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function bumpServiceWorkerVersion (options = {}) {
  const projectRoot = options.projectRoot
    ? resolve(options.projectRoot)
    : resolve(__dirname, '..')
  const swPath = resolve(projectRoot, 'app', 'service-worker.js')
  const source = readFileSync(swPath, 'utf8')

  const versionPattern = /const VERSION = ['"].+?['"];?/
  if (!versionPattern.test(source)) {
    throw new Error('Could not find VERSION constant in service worker.')
  }

  const cachePattern = /const CACHE_VERSION = ['"].+?['"];?/
  if (!cachePattern.test(source)) {
    throw new Error('Could not find CACHE_VERSION constant in service worker.')
  }

  const commitRef = (process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 8)
  const isoStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
  const version = `v${isoStamp}${commitRef ? `-${commitRef}` : ''}`

  const updated = source
    .replace(versionPattern, `const VERSION = '${version}';`)
    .replace(cachePattern, `const CACHE_VERSION = '${version}';`)

  if (updated !== source) {
    writeFileSync(swPath, updated)
  }

  return { version, swPath, updated: updated !== source }
}

function isDirectCliExecution () {
  const entry = process.argv?.[1]
  if (!entry) return false
  try {
    return pathToFileURL(entry).href === import.meta.url
  } catch {
    return false
  }
}

if (isDirectCliExecution()) {
  try {
    const result = bumpServiceWorkerVersion()
    if (result.updated) {
      console.log(`Service worker version bumped to ${result.version}`)
    } else {
      console.warn('Service worker version already up to date.')
    }
  } catch (error) {
    console.error(error?.message || error)
    process.exitCode = 1
  }
}
