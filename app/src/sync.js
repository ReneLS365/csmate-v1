// app/src/sync.js
const KEY = 'csmate.sync.queue.v1'
function loadQ () {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { jobChanges: [] }
  } catch {
    return { jobChanges: [] }
  }
}
function saveQ (q) {
  localStorage.setItem(KEY, JSON.stringify(q))
}

export function queueChange (jobId, payload = {}) {
  const q = loadQ()
  q.jobChanges.push({ jobId, payload, ts: Date.now(), syncedAt: null })
  saveQ(q)
  updateBadge()
}
export function pendingCount () {
  return loadQ().jobChanges.filter(x => !x.syncedAt).length
}
export function markAllSynced () {
  const q = loadQ()
  const now = Date.now()
  q.jobChanges.forEach(x => { if (!x.syncedAt) x.syncedAt = now })
  saveQ(q)
  return now
}
export function updateBadge () {
  const el = document.querySelector('#status-text')
  if (!el) return
  const c = pendingCount()
  el.dataset.pending = String(c)
}

export function wireStatusbar () {
  const bar = document.getElementById('statusbar')
  const dot = document.getElementById('status-dot')
  const last = document.getElementById('last-sync')
  const statusText = document.getElementById('status-text')

  function applyOnlineState () {
    const online = navigator.onLine
    bar?.classList.toggle('online', online)
    bar?.classList.toggle('offline', !online)
    dot?.classList.toggle('online', online)
    dot?.classList.toggle('offline', !online)
    if (statusText) statusText.textContent = online ? 'Online' : 'Offline'
    updateBadge()
  }

  window.addEventListener('online', applyOnlineState)
  window.addEventListener('offline', applyOnlineState)
  applyOnlineState()

  document.getElementById('btn-sync-now')?.addEventListener('click', () => {
    const ts = markAllSynced()
    if (last) {
      last.textContent = new Date(ts).toISOString().slice(0, 16).replace('T', ' ')
    }
    updateBadge()
    alert('Synkronisering markeret lokalt.')
  })

  updateBadge()
}
