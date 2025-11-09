/**
 * Admin lock state management
 * Manages admin authentication and UI element locking
 */

const state = {
  adminCodeOk: false,
  // Default to unlocked so general navigation/buttons remain usable
  lockNonInputs: false
}

const listeners = new Set()

function notifyListeners () {
  listeners.forEach(listener => {
    try {
      listener(state)
    } catch (error) {
      console.error('Admin state listener error:', error)
    }
  })
}

export function getAdminState () {
  return { ...state }
}

export function setAdminOk (ok) {
  state.adminCodeOk = Boolean(ok)
  if (ok) {
    state.lockNonInputs = false
  }
  notifyListeners()
}

export function setLock (locked) {
  state.lockNonInputs = Boolean(locked)
  notifyListeners()
}

export function subscribe (listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('Listener must be a function')
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isLocked () {
  return state.lockNonInputs
}

export function isAdminAuthenticated () {
  return state.adminCodeOk
}
