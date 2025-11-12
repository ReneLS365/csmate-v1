import { requestSync } from './sw-bridge.js'

const DB_NAME = 'csmateQueue'
const STORE_NAME = 'ops'
const LS_KEY = 'csmate.queue.ops.v1'

let dbPromise = null
let changeHandlers = []

function hasWindow () {
  return typeof window !== 'undefined'
}

function notifyChange () {
  changeHandlers.forEach(handler => {
    try { handler() } catch (error) { console.warn('NetQueue change handler fejlede', error) }
  })
}

export function onChange (handler) {
  if (typeof handler !== 'function') return () => {}
  changeHandlers = changeHandlers.concat(handler)
  return () => {
    changeHandlers = changeHandlers.filter(candidate => candidate !== handler)
  }
}

function idbAvailable () {
  if (!hasWindow()) return false
  try {
    return Boolean(window.indexedDB)
  } catch {
    return false
  }
}

function openDb () {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getDb () {
  if (!dbPromise) {
    dbPromise = openDb().catch(error => {
      console.warn('Kunne ikke åbne IndexedDB for net-queue', error)
      dbPromise = null
      throw error
    })
  }
  return dbPromise
}

async function idbPut (record) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(record)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbDelete (id) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function idbAll () {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : [])
    request.onerror = () => reject(request.error)
  })
}

function readLocalStorage () {
  if (!hasWindow() || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Kunne ikke læse net-queue fra localStorage', error)
    return []
  }
}

function writeLocalStorage (items) {
  if (!hasWindow() || !window.localStorage) return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(items))
  } catch (error) {
    console.warn('Kunne ikke gemme net-queue i localStorage', error)
  }
}

function normalizeHeaders (headers = {}) {
  if (headers instanceof Headers) {
    return Array.from(headers.entries()).reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
  }
  if (Array.isArray(headers)) {
    return headers.reduce((acc, entry) => {
      if (entry && typeof entry[0] === 'string') {
        acc[entry[0]] = entry[1]
      }
      return acc
    }, {})
  }
  if (headers && typeof headers === 'object') {
    return { ...headers }
  }
  return {}
}

function normalizeUrl (input) {
  if (typeof input === 'string') {
    if (!hasWindow()) return input
    try {
      return new URL(input, window.location.origin).toString()
    } catch {
      return input
    }
  }
  if (input && typeof input === 'object' && typeof input.url === 'string') {
    return input.url
  }
  return String(input || '')
}

function normalizeBody (body) {
  if (body == null) return null
  if (typeof body === 'string') return body
  if (body instanceof URLSearchParams) return body.toString()
  try {
    return JSON.stringify(body)
  } catch {
    return null
  }
}

function createRecord (operation) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return {
    id,
    url: normalizeUrl(operation?.url ?? operation?.input ?? operation?.path ?? ''),
    method: String(operation?.method || 'GET').toUpperCase(),
    headers: normalizeHeaders(operation?.headers),
    body: normalizeBody(operation?.body),
    tries: Number(operation?.tries) || 0,
    nextAt: Number(operation?.nextAt) || 0,
    enqueuedAt: Number(operation?.enqueuedAt) || Date.now()
  }
}

async function persistLocalRecord (record) {
  const list = readLocalStorage()
  const next = list.filter(item => item?.id !== record.id)
  next.push(record)
  writeLocalStorage(next)
}

async function removeLocalRecord (id) {
  const list = readLocalStorage()
  const next = list.filter(item => item?.id !== id)
  writeLocalStorage(next)
}

async function readAllRecords () {
  if (idbAvailable()) {
    try {
      const rows = await idbAll()
      if (Array.isArray(rows) && rows.length) {
        return rows.slice().sort((a, b) => (a.enqueuedAt || 0) - (b.enqueuedAt || 0))
      }
      return []
    } catch (error) {
      console.warn('IDB read fejlede, falder tilbage til localStorage', error)
    }
  }
  const items = readLocalStorage()
  return items.slice().sort((a, b) => (a.enqueuedAt || 0) - (b.enqueuedAt || 0))
}

async function writeRecord (record) {
  if (idbAvailable()) {
    try {
      await idbPut(record)
      return
    } catch (error) {
      console.warn('IDB write fejlede, falder tilbage til localStorage', error)
    }
  }
  await persistLocalRecord(record)
}

async function deleteRecord (id) {
  if (idbAvailable()) {
    try {
      await idbDelete(id)
      return
    } catch (error) {
      console.warn('IDB delete fejlede, falder tilbage til localStorage', error)
    }
  }
  await removeLocalRecord(id)
}

export async function enqueue (operation) {
  const record = createRecord(operation || {})
  await writeRecord(record)
  notifyChange()
  try {
    await requestSync()
  } catch {}
  return record.id
}

export async function allOps () {
  return readAllRecords()
}

export async function remove (id) {
  await deleteRecord(id)
  notifyChange()
}

export async function size () {
  const items = await readAllRecords()
  return items.length
}

function backoffMs (tries) {
  const schedule = [0, 2000, 5000, 10000, 30000, 60000]
  return schedule[Math.min(schedule.length - 1, Math.max(0, tries))]
}

async function persistUpdate (record) {
  await writeRecord(record)
  notifyChange()
}

export async function drain ({ fetchImpl = fetch } = {}) {
  const items = await readAllRecords()
  for (const entry of items) {
    const now = Date.now()
    if (entry.nextAt && now < entry.nextAt) {
      continue
    }

    try {
      const response = await fetchImpl(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body
      })
      if (response && response.ok) {
        await deleteRecord(entry.id)
      } else {
        const updated = {
          ...entry,
          tries: (entry.tries || 0) + 1,
          nextAt: Date.now() + backoffMs((entry.tries || 0) + 1)
        }
        await persistUpdate(updated)
      }
    } catch (error) {
      const updated = {
        ...entry,
        tries: (entry.tries || 0) + 1,
        nextAt: Date.now() + backoffMs((entry.tries || 0) + 1)
      }
      await persistUpdate(updated)
    }
  }
  notifyChange()
}

if (hasWindow()) {
  window.csmate = window.csmate || {}
  window.csmate.queue = {
    enqueue,
    drain,
    size,
    allOps,
    remove
  }
}
