/**
 * NetGuard: centraliseret fetch-wrapper og UI-tilstande for offline-mode.
 */
const ONLINE_SELECTOR = '[data-online-only]'
let offlineUserActive = false
let lastEffectiveOnline = null
export const ONLINE_EVENT_NAME = 'csmate:effective-online-change'

export function setOfflineUserFlag (value) {
  offlineUserActive = Boolean(value)
  applyOnlineState()
}

export function isEffectivelyOnline () {
  const browserOnline = typeof navigator === 'undefined' ? true : Boolean(navigator.onLine)
  return browserOnline && !offlineUserActive
}

export async function guardedFetch (input, init = {}) {
  if (isEffectivelyOnline()) {
    return fetch(input, init)
  }
  const payload = {
    ok: false,
    offline: true,
    message: 'Kald blokeret i offline-tilstand'
  }
  return new Response(JSON.stringify(payload), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  })
}

function updateOnlineElements (online) {
  if (typeof document === 'undefined') return
  const elements = document.querySelectorAll(ONLINE_SELECTOR)
  elements.forEach(element => {
    try {
      if (!online) {
        if (!element.hasAttribute('disabled')) {
          element.setAttribute('disabled', '')
          element.dataset.netGuardDisabled = '1'
        } else if (!element.dataset.netGuardDisabled) {
          element.dataset.netGuardDisabled = '0'
        }
        if (!element.dataset.netGuardPointer) {
          element.dataset.netGuardPointer = element.style.pointerEvents || ''
        }
        if (!element.dataset.netGuardOpacity) {
          element.dataset.netGuardOpacity = element.style.opacity || ''
        }
        element.style.pointerEvents = 'none'
        element.style.opacity = '0.6'
      } else {
        if (element.dataset.netGuardDisabled === '1') {
          element.removeAttribute('disabled')
        }
        delete element.dataset.netGuardDisabled
        if (element.dataset.netGuardPointer !== undefined) {
          element.style.pointerEvents = element.dataset.netGuardPointer
          delete element.dataset.netGuardPointer
        } else {
          element.style.pointerEvents = ''
        }
        if (element.dataset.netGuardOpacity !== undefined) {
          element.style.opacity = element.dataset.netGuardOpacity
          delete element.dataset.netGuardOpacity
        } else {
          element.style.opacity = ''
        }
      }
      if (!online) {
        if (!element.dataset.netGuardTitle) {
          element.dataset.netGuardTitle = element.getAttribute('title') || ''
        }
        element.setAttribute('title', 'Utilgængelig offline')
      } else if (element.dataset.netGuardTitle !== undefined) {
        if (element.dataset.netGuardTitle) {
          element.setAttribute('title', element.dataset.netGuardTitle)
        } else {
          element.removeAttribute('title')
        }
        delete element.dataset.netGuardTitle
      }
    } catch (error) {
      console.warn('Kunne ikke opdatere online-only element', error)
    }
  })
}

function updateBadge (online) {
  if (typeof document === 'undefined') return
  const badge = document.getElementById('status-badge')
  if (!badge) return
  badge.style.display = ''
  badge.textContent = online ? 'Online' : 'Offline'
  badge.classList.toggle('badge-online', online)
  badge.classList.toggle('badge-offline', !online)
  badge.setAttribute('aria-live', 'polite')
}

export function applyOnlineState () {
  const online = isEffectivelyOnline()
  updateOnlineElements(online)
  updateBadge(online)

  if (typeof document !== 'undefined' && document.body) {
    document.body.dataset.online = online ? '1' : '0'
  }

  if (typeof window !== 'undefined') {
    if (lastEffectiveOnline !== online) {
      lastEffectiveOnline = online
      window.dispatchEvent(new CustomEvent(ONLINE_EVENT_NAME, { detail: { online } }))
    }
  } else {
    lastEffectiveOnline = online
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => applyOnlineState())
  window.addEventListener('offline', () => applyOnlineState())
}

// Initial evaluering når modulet indlæses
applyOnlineState()
