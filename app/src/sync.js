import { isEffectivelyOnline, ONLINE_EVENT_NAME } from './core/net-guard.js'

const QUEUE_KEY = 'csmate.sync.queue.v1'
const LAST_SYNC_KEY = 'csmate.sync.last'

const memoryQueue = { jobChanges: [] }
let memoryLastSync = null
let syncHandler = async () => ({ ok: true })
let isSyncing = false
let currentOnline = isEffectivelyOnline()
let statusElements = null
let statusResetTimer = null

function hasStorage () {
  try {
    if (typeof localStorage === 'undefined') return false
    const testKey = '__csmate.sync.test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

function loadQ () {
  if (!hasStorage()) {
    return { jobChanges: memoryQueue.jobChanges.slice() }
  }
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) {
      memoryQueue.jobChanges = []
      return { jobChanges: [] }
    }
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.jobChanges)) {
      const items = parsed.jobChanges.slice()
      memoryQueue.jobChanges = items.slice()
      return { jobChanges: items }
    }
  } catch (error) {
    console.warn('Kunne ikke indlæse sync-kø', error)
  }
  return { jobChanges: memoryQueue.jobChanges.slice() }
}

function saveQ (q) {
  const payload = { jobChanges: Array.isArray(q?.jobChanges) ? q.jobChanges.slice() : [] }
  memoryQueue.jobChanges = payload.jobChanges.slice()
  if (!hasStorage()) {
    return
  }
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('Kunne ikke gemme sync-kø', error)
  }
}

function persistLastSync (ts) {
  if (!ts) return
  memoryLastSync = ts
  if (!hasStorage()) {
    return
  }
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(ts))
  } catch (error) {
    console.warn('Kunne ikke gemme sidst synkroniseret', error)
  }
}

export function getLastSyncTimestamp () {
  if (!hasStorage()) return memoryLastSync
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY)
    if (!raw) return null
    const num = Number(raw)
    return Number.isFinite(num) ? num : null
  } catch {
    return memoryLastSync
  }
}

function formatTimestamp (ts) {
  if (!ts) return '-'
  const date = new Date(Number(ts))
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatFriendlyTime (ts) {
  if (!ts) return '-'
  const date = new Date(Number(ts))
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function pendingEntries () {
  const queue = loadQ()
  const pending = queue.jobChanges.filter(entry => !entry?.syncedAt)
  return { queue, pending }
}

export function queueChange (jobId, payload = {}) {
  const { queue } = pendingEntries()
  queue.jobChanges.push({ jobId, payload, ts: Date.now(), syncedAt: null })
  saveQ(queue)
  updateBadge()
}

export function pendingCount () {
  return pendingEntries().pending.length
}

export function markAllSynced () {
  const { queue, pending } = pendingEntries()
  if (!pending.length) return getLastSyncTimestamp() || Date.now()
  const now = Date.now()
  queue.jobChanges = queue.jobChanges.map(entry => {
    if (!entry.syncedAt) {
      return { ...entry, syncedAt: now }
    }
    return entry
  })
  saveQ(queue)
  persistLastSync(now)
  return now
}

function ensureStatusElements () {
  if (statusElements) return statusElements
  if (typeof document === 'undefined') return null
  const bar = document.getElementById('statusbar')
  if (!bar) return null
  statusElements = {
    bar,
    dot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    lastSync: document.getElementById('last-sync'),
    button: document.getElementById('btn-sync-now')
  }
  return statusElements
}

function updateLastSyncDisplay (ts = getLastSyncTimestamp()) {
  const els = ensureStatusElements()
  if (!els?.lastSync) return
  els.lastSync.textContent = formatTimestamp(ts)
}

function updateStatusLabel ({ forceText } = {}) {
  const els = ensureStatusElements()
  if (!els?.statusText) return
  if (forceText) {
    els.statusText.textContent = forceText
    return
  }
  if (isSyncing) {
    els.statusText.textContent = 'Synkroniserer…'
    return
  }
  const pending = pendingCount()
  const base = currentOnline ? 'Online' : 'Offline'
  const suffix = pending > 0 ? ` – ${pending} ændring${pending === 1 ? '' : 'er'} klar` : ''
  els.statusText.textContent = `${base}${suffix}`
}

function flashStatusMessage (message, duration = 4000) {
  if (typeof window === 'undefined') return
  const els = ensureStatusElements()
  if (!els?.statusText) return
  if (statusResetTimer) {
    window.clearTimeout(statusResetTimer)
    statusResetTimer = null
  }
  els.statusText.textContent = message
  statusResetTimer = window.setTimeout(() => {
    statusResetTimer = null
    updateStatusLabel()
  }, duration)
}

function setSyncVisualState (running) {
  const els = ensureStatusElements()
  isSyncing = running
  if (els?.bar) {
    els.bar.dataset.syncState = running ? 'syncing' : 'idle'
    els.bar.classList.toggle('syncing', running)
  }
  if (els?.button) {
    els.button.disabled = running
    els.button.setAttribute('aria-busy', running ? 'true' : 'false')
  }
  if (!statusResetTimer) {
    updateStatusLabel()
  }
}

export function updateBadge () {
  const els = ensureStatusElements()
  if (!els) return
  if (els.statusText) {
    updateStatusLabel()
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('csmate:pending-change', {
      detail: { pending: pendingCount() }
    }))
  }
}

function applyOnlineState (online) {
  const els = ensureStatusElements()
  currentOnline = online
  if (!els?.bar || !els?.dot) {
    updateStatusLabel()
    return
  }
  els.bar.classList.toggle('online', online)
  els.bar.classList.toggle('offline', !online)
  els.dot.classList.toggle('online', online)
  els.dot.classList.toggle('offline', !online)
  updateStatusLabel()
}

export async function runSyncNow ({ source = 'manual' } = {}) {
  if (isSyncing) return { skipped: true }
  const { pending } = pendingEntries()
  if (!pending.length) {
    flashStatusMessage('Ingen ændringer at synkronisere', 2500)
    return { ok: true, pending: 0, timestamp: getLastSyncTimestamp() }
  }

  setSyncVisualState(true)
  try {
    const result = await syncHandler({ jobChanges: pending.slice(), source })
    const ts = markAllSynced()
    updateLastSyncDisplay(ts)
    updateBadge()
    flashStatusMessage(`Synkroniseret kl. ${formatFriendlyTime(ts)}`)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('csmate:sync-complete', {
        detail: { timestamp: ts, pending: pending.length, result, source }
      }))
    }
    return { ok: true, timestamp: ts, pending: pending.length, result }
  } catch (error) {
    console.error('Sync kørsel fejlede', error)
    flashStatusMessage('Synkronisering fejlede')
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('csmate:sync-error', {
        detail: { error, source }
      }))
    }
    throw error
  } finally {
    setSyncVisualState(false)
    updateBadge()
  }
}

export function registerSyncHandler (handler) {
  if (typeof handler === 'function') {
    syncHandler = handler
  }
}

export function wireStatusbar () {
  const els = ensureStatusElements()
  if (!els) return

  applyOnlineState(isEffectivelyOnline())
  updateLastSyncDisplay()
  updateBadge()

  if (els.button && !els.button.dataset.syncBound) {
    els.button.addEventListener('click', async () => {
      try {
        await runSyncNow({ source: 'manual' })
      } catch (error) {
        console.error('Manuel synkronisering fejlede', error)
      }
    })
    els.button.dataset.syncBound = '1'
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => applyOnlineState(isEffectivelyOnline()))
    window.addEventListener('offline', () => applyOnlineState(isEffectivelyOnline()))
    window.addEventListener(ONLINE_EVENT_NAME, event => {
      const state = typeof event?.detail?.online === 'boolean' ? event.detail.online : isEffectivelyOnline()
      applyOnlineState(state)
    })
    window.addEventListener('storage', event => {
      if (event.key === QUEUE_KEY) {
        updateBadge()
      } else if (event.key === LAST_SYNC_KEY) {
        updateLastSyncDisplay()
      }
    })
  }
}

if (typeof window !== 'undefined') {
  window.CSMateSync = window.CSMateSync || {}
  window.CSMateSync.runSyncNow = runSyncNow
  window.CSMateSync.registerSyncHandler = registerSyncHandler
}

export function __resetSyncStateForTests () {
  if (hasStorage()) {
    try { localStorage.removeItem(QUEUE_KEY) } catch {}
    try { localStorage.removeItem(LAST_SYNC_KEY) } catch {}
  }
  memoryQueue.jobChanges = []
  memoryLastSync = null
  isSyncing = false
  statusElements = null
  statusResetTimer = null
  currentOnline = isEffectivelyOnline()
}
