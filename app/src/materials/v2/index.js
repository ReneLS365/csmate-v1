import {
  isMaterialsV2Enabled,
  isTenantPricingEnabled,
  readFirmId,
  persistFirmId,
  readAdminState,
  storeAdminState
} from '../featureFlags.ts'
import { createMaterialsRenderer } from './renderer.js'

const DB_NAME = 'materials_v2'
const DB_VERSION = 1
const STORE_BASE = 'base'
const STORE_OVERRIDES = 'overrides'
const BASE_KEY = 'materials'
const KNOWN_FIRMS_KEY = 'csmate_known_firms'

function openDb () {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = event => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_BASE)) {
        db.createObjectStore(STORE_BASE)
      }
      if (!db.objectStoreNames.contains(STORE_OVERRIDES)) {
        db.createObjectStore(STORE_OVERRIDES)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet (storeName, key) {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function idbSet (storeName, key, value) {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value, key)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function fetchJson (url) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json()
}

async function loadBaseMaterials () {
  const cached = await idbGet(STORE_BASE, BASE_KEY)
  try {
    const data = await fetchJson('/data/materials.json')
    await idbSet(STORE_BASE, BASE_KEY, data)
    return data
  } catch (error) {
    if (cached) {
      console.warn('Bruger cached base materialer', error)
      return cached
    }
    throw error
  }
}

async function loadTenantOverrides (firmId) {
  const cached = await idbGet(STORE_OVERRIDES, firmId)
  if (!isTenantPricingEnabled()) {
    return cached || {}
  }

  const query = new URLSearchParams({ firm: firmId })
  try {
    const data = await fetchJson(`/.netlify/functions/tenant-config?${query.toString()}`)
    const priceSource = data?.prices ?? data?.price_table
    const prices = priceSource && typeof priceSource === 'object' && !Array.isArray(priceSource) ? priceSource : {}
    await idbSet(STORE_OVERRIDES, firmId, prices)
    return prices
  } catch (error) {
    if (cached) {
      console.warn('Bruger cached tenant overrides', error)
      return cached
    }
    throw error
  }
}

function getKnownFirms (current) {
  const firms = new Map()
  if (typeof window !== 'undefined') {
    const globals = window.CSMATE_TENANTS || window.__CSMATE_TENANTS__
    if (Array.isArray(globals)) {
      globals.forEach(item => {
        if (item && item.id) {
          firms.set(item.id, {
            id: item.id,
            label: item.label || item.id
          })
        }
      })
    }
    try {
      const raw = window.localStorage.getItem(KNOWN_FIRMS_KEY)
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) {
          list.forEach(entry => {
            if (entry && entry.id) {
              firms.set(entry.id, {
                id: entry.id,
                label: entry.label || entry.id
              })
            }
          })
        }
      }
    } catch (error) {
      console.warn('Kunne ikke læse kendte firmaer', error)
    }
  }
  if (current && !firms.has(current)) {
    const label = current.charAt(0).toUpperCase() + current.slice(1)
    firms.set(current, { id: current, label })
  }
  return Array.from(firms.values())
}

function persistKnownFirm (firmId, label) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(KNOWN_FIRMS_KEY)
    let list = []
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        list = [...parsed]
      }
    }
    if (!list.some(item => item?.id === firmId)) {
      list.push({ id: firmId, label: label || firmId })
    }
    window.localStorage.setItem(KNOWN_FIRMS_KEY, JSON.stringify(list))
  } catch (error) {
    console.warn('Kunne ikke gemme kendte firmaer', error)
  }
}

async function verifyAdminCode (firmId, code) {
  const response = await fetch('/.netlify/functions/admin-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', firmId, code })
  })
  if (response.status === 401) {
    return false
  }
  if (!response.ok) {
    throw new Error(`Verify failed: ${response.status}`)
  }
  const result = await response.json()
  return Boolean(result?.verified)
}

async function updateTenantPrices (firmId, diff) {
  const response = await fetch('/.netlify/functions/admin-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_prices',
      firmId,
      updates: diff?.updates || {},
      removals: diff?.removals || []
    })
  })
  if (!response.ok) {
    throw new Error(`Gem fejl: ${response.status}`)
  }
  return response.json()
}

function installMaterialsOverscrollStop () {
  if (typeof document === 'undefined') return

  const el =
    document.querySelector('#materials .mat-scroll') ||
    document.querySelector('#materials-list') ||
    document.querySelector('.materials-scroll') ||
    document.querySelector('#materials') ||
    document.querySelector('.materials-v2__body')

  if (!el || el.dataset.csmOverscrollStop === '1') return

  el.dataset.csmOverscrollStop = '1'

  let startY = 0
  el.addEventListener('touchstart', event => {
    startY = event.touches[0].clientY
  }, { passive: true })

  const canScroll = () => el.scrollHeight - el.clientHeight > 1

  el.addEventListener('touchmove', event => {
    if (!canScroll()) return
    const y = event.touches[0].clientY
    const movingUp = y > startY
    const movingDown = y < startY
    const atTop = el.scrollTop <= 0
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
    if ((atTop && movingUp) || (atBottom && movingDown)) {
      event.preventDefault()
    }
  }, { passive: false })

  el.addEventListener('wheel', event => {
    if (!canScroll()) return
    const delta = Math.sign(event.deltaY)
    const atTop = el.scrollTop <= 0
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      event.preventDefault()
    }
  }, { passive: false })
}

async function init () {
  if (typeof document === 'undefined') return
  if (!isMaterialsV2Enabled()) return

  const container = document.getElementById('optaellingContainer')
  if (!container || !container.parentElement) return

  container.style.display = 'none'

  const mountPoint = document.createElement('div')
  mountPoint.id = 'materials-v2-root'
  container.insertAdjacentElement('afterend', mountPoint)

  let firmId = readFirmId()
  persistKnownFirm(firmId)
  persistFirmId(firmId)
  let baseMaterials
  try {
    baseMaterials = await loadBaseMaterials()
  } catch (error) {
    console.error('Kunne ikke hente base materialer', error)
    return
  }

  async function renderForFirm (targetFirmId, keepAdmin = false) {
    firmId = targetFirmId
    persistFirmId(firmId)
    persistKnownFirm(firmId)
    let overrides = {}
    try {
      overrides = await loadTenantOverrides(firmId)
    } catch (error) {
      console.warn('Kunne ikke hente tenant overrides', error)
      overrides = {}
    }

    mountPoint.innerHTML = ''
    const knownFirms = getKnownFirms(firmId)
    const renderer = createMaterialsRenderer({
      container: mountPoint,
      materials: baseMaterials,
      overrides,
      firmId,
      availableFirms: knownFirms,
      isAdmin: keepAdmin && readAdminState(),
      onFirmChange: nextFirm => {
        renderForFirm(nextFirm, readAdminState())
      },
      onAdminVerify: async code => {
        try {
          const ok = await verifyAdminCode(firmId, code)
          if (ok) {
            storeAdminState(true)
          }
          return ok
        } catch (error) {
          console.error('Verify fejl', error)
          throw error
        }
      },
      onAdminToggle: enabled => {
        storeAdminState(enabled)
      },
      onSavePrices: async diff => {
        const result = await updateTenantPrices(firmId, diff)
        const prices = result?.prices || {}
        await idbSet(STORE_OVERRIDES, firmId, prices)
        await renderForFirm(firmId, true)
      }
    })
    installMaterialsOverscrollStop()
    return renderer
  }

  await renderForFirm(firmId, readAdminState())
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
}

export { init }
