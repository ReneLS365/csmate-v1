/**
 * Admin helper functions
 * Provides utilities for admin authentication and lock management
 */

import { getAdminState, setAdminOk, setLock } from '../state/admin.js'

const DEFAULT_ADMIN_CODE = 'StilAce'

/**
 * Try to authenticate with admin code
 * @param {string} code - Admin code to verify
 * @returns {boolean} - Whether authentication succeeded
 */
export function tryAdminCode (code) {
  // Get admin code from environment or use default
  const validCode = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_CODE) || DEFAULT_ADMIN_CODE

  const ok = code === validCode
  setAdminOk(ok)
  if (ok) {
    setLock(false)
  }
  return ok
}

/**
 * Get current admin state
 * @returns {{adminCodeOk: boolean, lockNonInputs: boolean}}
 */
export function useAdmin () {
  return getAdminState()
}

/**
 * Toggle lock state
 * @param {boolean} locked - Whether to lock non-input elements
 */
export function toggleLock (locked) {
  setLock(locked)
}
