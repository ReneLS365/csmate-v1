#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateSW } from 'workbox-build'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function buildServiceWorker () {
  const projectRoot = resolve(__dirname, '..')
  const swDest = resolve(projectRoot, 'dist', 'service-worker.js')

  await generateSW({
    swDest,
    globDirectory: resolve(projectRoot, 'dist'),
    globPatterns: ['**/*.{html,js,css,svg,png,woff2}'],
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'html',
          expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 3600 }
        }
      },
      {
        urlPattern: ({ request }) => ['script', 'style'].includes(request.destination),
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'assets' }
      },
      {
        urlPattern: ({ request }) => request.destination === 'image',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'images',
          expiration: { maxEntries: 150, maxAgeSeconds: 30 * 24 * 3600 }
        }
      },
      {
        urlPattern: ({ request }) => request.destination === 'font',
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts',
          expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 3600 }
        }
      }
    ],
    additionalManifestEntries: ['/', '/?source=pwa']
  })

  const source = await readFile(swDest, 'utf8')
  const prewarmSnippet = `
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(workbox.core.cacheNames.precache)
      await cache.addAll(['/', '/?source=pwa'])
    } catch (error) {
      console.warn('Workbox prewarm mislykkedes', error)
    }
  })())
})
`
  await writeFile(swDest, `${source}\n${prewarmSnippet}`)
  console.log('✅ Workbox SW generated')
}

buildServiceWorker().catch(error => {
  console.error(error?.message || error)
  process.exitCode = 1
})
