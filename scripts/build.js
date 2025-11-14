#!/usr/bin/env node
import { cpSync, existsSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bumpServiceWorkerVersion } from './bump-sw-version.js'
import { writeCacheReport } from './cache-report.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')
const distDir = resolve(projectRoot, 'dist')
const sourceDir = resolve(projectRoot, 'app')
const publicDir = resolve(projectRoot, 'public')

function ensureSourceExists () {
  try {
    const stats = statSync(sourceDir)
    if (!stats.isDirectory()) {
      throw new Error(`Source directory '${sourceDir}' is not a folder.`)
    }
  } catch (error) {
    throw new Error(`Source directory '${sourceDir}' is missing: ${error.message}`)
  }
}

function copyRecursive (src, dest) {
  rmSync(dest, { recursive: true, force: true })
  cpSync(src, dest, { recursive: true, force: true })
}

function copyPublicAssets () {
  if (!existsSync(publicDir)) return
  cpSync(publicDir, distDir, { recursive: true, force: true })
}

async function logAuth0BuildInfo () {
  try {
    const moduleUrl = new URL('../app/src/auth0-config.js', import.meta.url)
    const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } = await import(moduleUrl.href)
    const formatValue = value => {
      if (typeof value !== 'string' || value.trim().length === 0) return '(empty)'
      return value.trim()
    }
    console.log('[build] Auth0 domain:', formatValue(AUTH0_DOMAIN))
    console.log('[build] Auth0 clientId:', formatValue(AUTH0_CLIENT_ID))
    console.log('[build] Auth0 audience:', formatValue(AUTH0_AUDIENCE))
  } catch (error) {
    console.warn('Could not log Auth0 build information:', error?.message || error)
  }
}

async function main () {
  ensureSourceExists()
  const result = bumpServiceWorkerVersion({ projectRoot })
  const { outputPath: cacheReportPath } = writeCacheReport({ projectRoot })
  copyRecursive(sourceDir, distDir)
  copyPublicAssets()
  console.log(`Build completed. Output: ${distDir}`)
  console.log(`Service worker version: ${result.version}`)
  console.log(`Cache manifest: ${cacheReportPath}`)
  await logAuth0BuildInfo()
}

try {
  await main()
} catch (error) {
  console.error(error?.message || error)
  process.exitCode = 1
}
