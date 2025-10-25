import { initNumpadOverlay, getNumpadOverlayElements, showNumpadOverlay, hideNumpadOverlay } from '../modules/numpadOverlay.js'

// Lightweight expression evaluator (+ - * /) with locale-safe decimals
function toNumber (value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '.').trim()
    if (normalized === '') return fallback
    const parsed = Number.parseFloat(normalized)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function evalExpr (expr, baseValue = 0) {
  const base = toNumber(baseValue, 0)
  const raw = typeof expr === 'string' ? expr.trim() : ''
  if (!raw) return base

  const normalized = raw
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '')

  const expression = /^[+\-*/]/.test(normalized) ? `${base}${normalized}` : normalized
  if (!/^[0-9.+\-*/]*$/.test(expression)) throw new Error('Invalid')

  // eslint-disable-next-line no-new-func
  const value = Function(`"use strict";return (${expression || base});`)()
  if (!Number.isFinite(value)) throw new Error('NaN')
  return value
}

function formatDisplayValue (value) {
  const number = toNumber(value, 0)
  return String(number).replace('.', ',')
}

export function openNumpad ({ initial = '', baseValue = 0, onConfirm } = {}) {
  initNumpadOverlay()
  const elements = getNumpadOverlayElements()
  if (!elements) return

  const { overlay, keypad } = elements
  const display = overlay.querySelector('#csm-np-display')
  const base = toNumber(baseValue, 0)
  const initialDisplay = typeof initial === 'string' ? initial.trim() : ''
  const fallbackDisplay = (initialDisplay !== '' ? initialDisplay : formatDisplayValue(base)) || '0'
  let buffer = ''
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  let closed = false

  const render = () => {
    if (display) display.textContent = buffer || fallbackDisplay || '0'
  }

  const cleanup = () => {
    if (closed) return
    closed = true
    keypad?.removeEventListener('keydown', handleKeydown)
    overlay.removeEventListener('click', handleClick)
    document.removeEventListener('keydown', handleEscape, true)
    hideNumpadOverlay()
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus({ preventScroll: true })
    }
  }

  const closeOverlay = () => {
    cleanup()
  }

  const confirmValue = () => {
    try {
      const result = evalExpr(buffer, base)
      if (typeof onConfirm === 'function') {
        onConfirm(result)
      }
      cleanup()
    } catch (error) {
      if (display) {
        display.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 160 })
      }
    }
  }

  const handleKeydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeOverlay()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      confirmValue()
      return
    }
    if (event.key === 'Backspace') {
      event.preventDefault()
      buffer = buffer.slice(0, -1)
      render()
      return
    }
    if ('0123456789+-*/.,xX'.includes(event.key)) {
      event.preventDefault()
      const key = event.key.replace('x', '×').replace('X', '×').replace('.', ',')
      buffer += key
      render()
    }
  }

  const handleEscape = event => {
    if (event.key === 'Escape' && overlay.classList.contains('open')) {
      event.preventDefault()
      closeOverlay()
    }
  }

  const handleClick = event => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    if (target === overlay) {
      if (!overlay.classList.contains('no-backdrop-close')) {
        event.preventDefault()
        closeOverlay()
      }
      return
    }

    const button = target.closest('button[data-action], .csm-np-btn')
    if (!(button instanceof HTMLButtonElement) || !overlay.contains(button)) return

    const action = button.dataset.action
    if (action === 'cancel') {
      event.preventDefault()
      closeOverlay()
      return
    }
    if (action === 'clear') {
      event.preventDefault()
      buffer = ''
      render()
      return
    }
    if (action === 'confirm') {
      event.preventDefault()
      confirmValue()
      return
    }
    if (button.classList.contains('csm-np-btn') && !action) {
      event.preventDefault()
      buffer += button.textContent.trim()
      render()
    }
  }

  const opened = showNumpadOverlay()
  if (!opened) {
    cleanup()
    return
  }

  keypad?.addEventListener('keydown', handleKeydown)
  overlay.addEventListener('click', handleClick)
  document.addEventListener('keydown', handleEscape, true)

  render()

  const focusable = overlay.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  if (focusable instanceof HTMLElement) {
    requestAnimationFrame(() => focusable.focus({ preventScroll: true }))
  }
}
