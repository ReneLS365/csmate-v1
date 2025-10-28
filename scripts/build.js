#!/usr/bin/env node
import { cpSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bumpServiceWorkerVersion } from './bump-sw-version.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')
const distDir = resolve(projectRoot, 'dist')
const sourceDir = resolve(projectRoot, 'app')

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

function main () {
  ensureSourceExists()
  const result = bumpServiceWorkerVersion({ projectRoot })
  copyRecursive(sourceDir, distDir)
  console.log(`Build completed. Output: ${distDir}`)
  console.log(`Service worker version: ${result.version}`)
}

try {
  main()
} catch (error) {
  console.error(error?.message || error)
  process.exitCode = 1
}
