/**
 * @purpose Manage viewport sizing and scroll locking for the numeric keypad overlay.
 * @inputs Relies on DOM nodes with classes .csm-np-overlay and .csm-np plus optional #app root.
 * @outputs Exposes helpers to initialise, open and close the keypad overlay without layout jumps.
 */

const overlayState = {
  overlay: null,
  keypad: null,
  docEl: null,
  body: null,
  appRoot: null,
  scrollY: 0,
  listenersAttached: false
}

function updateViewportMetrics () {
  if (typeof window === 'undefined') return
  const viewport = window.visualViewport
  const height = viewport ? Math.round(viewport.height) : window.innerHeight
  if (overlayState.docEl) {
    overlayState.docEl.style.setProperty('--app-vh', `${height}px`)
  }
  if (overlayState.keypad) {
    overlayState.keypad.style.setProperty('--vp-height', `${height}px`)
    overlayState.keypad.style.height = `${height}px`
  }
}

function attachViewportListeners () {
  if (overlayState.listenersAttached || typeof window === 'undefined') return
  const handler = () => updateViewportMetrics()
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handler, { passive: true })
    window.visualViewport.addEventListener('scroll', handler, { passive: true })
  }
  window.addEventListener('orientationchange', handler, { passive: true })
  window.addEventListener('resize', handler, { passive: true })
  overlayState.listenersAttached = true
}

function ensureOverlayElements () {
  if (overlayState.overlay && overlayState.keypad) {
    return overlayState
  }
  if (typeof document === 'undefined') return null
  const overlay = document.querySelector('.csm-np-overlay')
  const keypad = overlay?.querySelector('.csm-np')
  if (!overlay || !keypad) {
    return null
  }
  overlayState.overlay = overlay
  overlayState.keypad = keypad
  overlayState.docEl = document.documentElement
  overlayState.body = document.body
  overlayState.appRoot = document.querySelector('#app') || overlayState.body
  updateViewportMetrics()
  attachViewportListeners()
  overlay.setAttribute('aria-hidden', overlay.classList.contains('open') ? 'false' : 'true')
  return overlayState
}

export function initNumpadOverlay () {
  return ensureOverlayElements()
}

export function getNumpadOverlayElements () {
  return ensureOverlayElements()
}

export function showNumpadOverlay () {
  const state = ensureOverlayElements()
  if (!state) return false
  const { overlay, docEl, body, appRoot } = state
  if (overlay.classList.contains('open')) {
    updateViewportMetrics()
    return true
  }
  state.scrollY = window.scrollY || docEl?.scrollTop || 0
  docEl?.classList.add('np-open')
  if (body) {
    body.style.position = 'fixed'
    body.style.top = `-${state.scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
  }
  if (appRoot) {
    appRoot.setAttribute('inert', '')
    appRoot.setAttribute('aria-hidden', 'true')
  }
  overlay.classList.add('open')
  overlay.setAttribute('aria-hidden', 'false')
  updateViewportMetrics()
  return true
}

export function hideNumpadOverlay () {
  const state = ensureOverlayElements()
  if (!state) return
  const { overlay, docEl, body, appRoot } = state
  if (!overlay.classList.contains('open')) return

  overlay.classList.remove('open')
  overlay.setAttribute('aria-hidden', 'true')
  if (appRoot) {
    appRoot.removeAttribute('inert')
    appRoot.removeAttribute('aria-hidden')
  }
  if (body) {
    body.style.position = ''
    body.style.top = ''
    body.style.left = ''
    body.style.right = ''
    body.style.width = ''
  }
  docEl?.classList.remove('np-open')
  window.scrollTo(0, state.scrollY || 0)
}

export function isNumpadOverlayOpen () {
  const state = ensureOverlayElements()
  return Boolean(state?.overlay?.classList.contains('open'))
}
