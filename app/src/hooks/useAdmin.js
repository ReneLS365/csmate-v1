/**
 * Admin helper functions
 * Provides utilities for admin authentication and lock management
 */

import { getAdminState, setLock } from '../state/admin.js'

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
