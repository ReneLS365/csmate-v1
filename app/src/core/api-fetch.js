import { guardedFetch } from './net-guard.js'
import { enqueue } from './net-queue.js'

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function extractUrl (input) {
  if (typeof input === 'string') return input
  if (input && typeof input.url === 'string') return input.url
  try {
    return String(input)
  } catch {
    return ''
  }
}

function toPlainHeaders (headers) {
  if (!headers) return {}
  if (headers instanceof Headers) {
    return Array.from(headers.entries()).reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
  }
  if (Array.isArray(headers)) {
    return headers.reduce((acc, [key, value]) => {
      if (typeof key === 'string') {
        acc[key] = value
      }
      return acc
    }, {})
  }
  if (typeof headers === 'object') {
    return { ...headers }
  }
  return {}
}

export async function apiFetch (input, init = {}) {
  const method = String(init?.method || 'GET').toUpperCase()
  const response = await guardedFetch(input, init)
  if (response.status !== 503) {
    return response
  }

  if (!WRITE_METHODS.has(method)) {
    return new Response(JSON.stringify({ ok: false, offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    await enqueue({
      url: extractUrl(input),
      method,
      headers: toPlainHeaders(init.headers),
      body: init.body ?? null
    })
  } catch (error) {
    console.warn('Kunne ikke queue offline-kald', error)
  }

  return new Response(JSON.stringify({ ok: true, queued: true, offline: true }), {
    status: 202,
    headers: {
      'Content-Type': 'application/json',
      'X-CSMate-Queued': '1'
    }
  })
}
