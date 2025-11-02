#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * @purpose Generate a deterministic manifest of the service worker cache configuration for verification.
 * @inputs options?: {
 *   projectRoot?: string,
 *   serviceWorkerSource?: string,
 *   outputPath?: string
 * }
 * @outputs cache-output.json written alongside the repository root and returned as an object when invoked programmatically.
 */

function resolveProjectRoot (projectRoot) {
  return projectRoot ? resolve(projectRoot) : resolve(__dirname, '..')
}

function readServiceWorkerSource (root, customSource) {
  if (typeof customSource === 'string') return customSource
  const swPath = resolve(root, 'app', 'service-worker.js')
  return readFileSync(swPath, 'utf8')
}

function extractStringConstant (source, name) {
  const pattern = new RegExp(`const\\s+${name}\\s*=\\s*['"]([^'"]+)['"]`)
  const match = source.match(pattern)
  if (!match) {
    throw new Error(`Unable to find constant ${name} in service worker`)
  }
  return match[1]
}

function extractPrecacheEntries (source) {
  const pattern = /const\s+PRECACHE\s*=\s*\[(.*?)\];/s
  const match = source.match(pattern)
  if (!match) {
    throw new Error('Unable to locate PRECACHE array in service worker')
  }
  return match[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const withoutLeading = entry.replace(/^['"]/, '')
      const literal = withoutLeading.replace(/['"]$/, '')
      if (!literal) {
        throw new Error(`Invalid PRECACHE entry: ${entry}`)
      }
      return literal
    })
}

function extractDataMatchers (source) {
  const pattern = /const\s+DATA_MATCHERS\s*=\s*\[(.*?)\];/s
  const match = source.match(pattern)
  if (!match) {
    return []
  }
  return match[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/,$/, ''))
}

function normaliseUrlToFile (url) {
  if (url === '/' || url.startsWith('/?')) return 'index.html'
  return url.replace(/^\//, '')
}

function describeFile (root, relativeFile, url) {
  const searchRoots = [
    { base: 'app', dir: resolve(root, 'app') },
    { base: 'public', dir: resolve(root, 'public') }
  ]

  const record = {
    url,
    file: `app/${relativeFile}`,
    aliasFor: url === '/' ? '/index.html' : undefined,
    exists: false,
    bytes: null,
    sha256: null
  }

  for (const { base, dir } of searchRoots) {
    const filePath = resolve(dir, relativeFile)
    try {
      const stats = statSync(filePath)
      if (!stats.isFile()) continue
      record.exists = true
      record.bytes = stats.size
      record.file = `${base}/${relative(dir, filePath)}`
      const hash = createHash('sha256')
      hash.update(readFileSync(filePath))
      record.sha256 = hash.digest('hex')
      break
    } catch {}
  }

  if (!record.exists) {
    delete record.bytes
    delete record.sha256
  }

  if (!record.aliasFor) {
    delete record.aliasFor
  }

  return record
}

export function generateCacheReport (options = {}) {
  const root = resolveProjectRoot(options.projectRoot)
  const swSource = readServiceWorkerSource(root, options.serviceWorkerSource)
  const version = extractStringConstant(swSource, 'VERSION')
  const cachePrefix = extractStringConstant(swSource, 'CACHE_PREFIX')
  const precacheEntries = extractPrecacheEntries(swSource)
  const dataMatchers = extractDataMatchers(swSource)

  const unique = new Set()
  const precache = precacheEntries.map((url) => {
    const normalised = normaliseUrlToFile(url)
    const descriptor = describeFile(root, normalised, url)
    const key = descriptor.file
    if (unique.has(key) && url !== '/') {
      descriptor.duplicateOf = Array.from(unique).find((item) => item === key)
    }
    unique.add(key)
    return descriptor
  })

  return {
    version,
    cachePrefix,
    cacheName: `${cachePrefix}-${version}`,
    precache,
    dataMatchers
  }
}

export function writeCacheReport (options = {}) {
  const root = resolveProjectRoot(options.projectRoot)
  const targetPath = resolve(root, options.outputPath || 'cache-output.json')
  const report = generateCacheReport({ ...options, projectRoot: root })
  writeFileSync(targetPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return { outputPath: targetPath, report }
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
    const { outputPath, report } = writeCacheReport()
    console.log(`Cache manifest written to ${outputPath}`)
    console.log(`Cache name: ${report.cacheName}`)
  } catch (error) {
    console.error(error?.message || error)
    process.exitCode = 1
  }
}
