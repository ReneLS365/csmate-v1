/**
 * Click Guard
 * Blocks clicks on non-input elements when admin lock is active
 */

import { isLocked, subscribe } from '../../state/admin.js'

let isAttached = false

function handlePointerEvent (event) {
  if (!isLocked()) return

  const target = event.target
  if (!target) return

  // Allow clicks on inputs and elements with data-allow-click attribute
  const isInput = target.closest('input, select, textarea, [role="spinbutton"], [data-numpad="true"]')
  const isAllowed = target.closest('[data-allow-click]')

  if (!isInput && !isAllowed) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }
}

export function attachClickGuard () {
  if (isAttached) return
  if (typeof document === 'undefined') return

  document.addEventListener('pointerdown', handlePointerEvent, { capture: true, passive: false })
  document.addEventListener('click', handlePointerEvent, { capture: true, passive: false })
  isAttached = true
}

export function detachClickGuard () {
  if (!isAttached) return
  if (typeof document === 'undefined') return

  document.removeEventListener('pointerdown', handlePointerEvent, { capture: true })
  document.removeEventListener('click', handlePointerEvent, { capture: true })
  isAttached = false
}

export function initClickGuard () {
  // Always attach the guard - it will check lock state internally
  attachClickGuard()

  // Subscribe to state changes to update guard behavior
  subscribe(() => {
    // Guard is always attached, just checks isLocked() internally
    // No need to attach/detach on state changes
  })
}
