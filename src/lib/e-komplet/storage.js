const STORAGE_KEYS = {
  sagsinfo: 'csmate:sagsinfo:v1',
  price: 'csmate:price-breakdown:v1',
  time: 'csmate:time-rows:v1',
  mapping: 'csmate:e-komplet:mapping:v1',
  backup: 'csmate:backup:v1'
}

const memoryStore = new Map()

function getStorage () {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch (err) {
    // ignore
  }
  return {
    getItem: key => memoryStore.get(key) ?? null,
    setItem: (key, value) => { memoryStore.set(key, value) },
    removeItem: key => { memoryStore.delete(key) }
  }
}

const storage = getStorage()

function safeJsonParse (value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (err) {
    return fallback
  }
}

export function saveSagsinfo (data) {
  storage.setItem(STORAGE_KEYS.sagsinfo, JSON.stringify(data))
}

export function loadSagsinfo () {
  return safeJsonParse(storage.getItem(STORAGE_KEYS.sagsinfo), null)
}

export function savePriceBreakdown (data) {
  storage.setItem(STORAGE_KEYS.price, JSON.stringify(data))
}

export function loadPriceBreakdown () {
  return safeJsonParse(storage.getItem(STORAGE_KEYS.price), null)
}

export function saveTimeRows (rows) {
  storage.setItem(STORAGE_KEYS.time, JSON.stringify(rows))
}

export function loadTimeRows () {
  return safeJsonParse(storage.getItem(STORAGE_KEYS.time), [])
}

export function saveMapping (mapping) {
  storage.setItem(STORAGE_KEYS.mapping, JSON.stringify(mapping))
}

export function loadMapping () {
  return safeJsonParse(storage.getItem(STORAGE_KEYS.mapping), {})
}

export function createProjectSnapshot () {
  return {
    sagsinfo: loadSagsinfo(),
    price: loadPriceBreakdown(),
    time: loadTimeRows()
  }
}

export function saveBackup () {
  const snapshot = createProjectSnapshot()
  storage.setItem(STORAGE_KEYS.backup, JSON.stringify({ at: Date.now(), snapshot }))
  return snapshot
}

export function loadBackup () {
  const raw = safeJsonParse(storage.getItem(STORAGE_KEYS.backup), null)
  return raw
}

export function exportProject () {
  const snapshot = createProjectSnapshot()
  return JSON.stringify(snapshot, null, 2)
}

export function importProject (json) {
  const snapshot = typeof json === 'string' ? safeJsonParse(json, null) : json
  if (!snapshot || typeof snapshot !== 'object') return false
  if (snapshot.sagsinfo) saveSagsinfo(snapshot.sagsinfo)
  if (snapshot.price) savePriceBreakdown(snapshot.price)
  if (snapshot.time) saveTimeRows(snapshot.time)
  return true
}
