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
  const overlay = document.createElement('div')
  overlay.className = 'csm-np-overlay'
  overlay.innerHTML = `
    <div class="csm-np" role="dialog" aria-modal="true">
      <div class="csm-np-display" id="csm-np-display" aria-live="polite">0</div>
      <div class="csm-np-grid">
        <button class="csm-np-btn">7</button>
        <button class="csm-np-btn">8</button>
        <button class="csm-np-btn">9</button>
        <button class="csm-np-btn csm-np-op">×</button>
        <button class="csm-np-btn">4</button>
        <button class="csm-np-btn">5</button>
        <button class="csm-np-btn">6</button>
        <button class="csm-np-btn csm-np-op">÷</button>
        <button class="csm-np-btn">1</button>
        <button class="csm-np-btn">2</button>
        <button class="csm-np-btn">3</button>
        <button class="csm-np-btn csm-np-op">-</button>
        <button class="csm-np-btn">0</button>
        <button class="csm-np-btn">,</button>
        <button class="csm-np-btn" data-action="clear">C</button>
        <button class="csm-np-btn csm-np-op">+</button>
        <button class="csm-np-btn csm-np-close" data-action="close" aria-label="Luk">✕</button>
      </div>
      <div class="csm-np-foot">
        <button class="csm-np-ok" data-action="ok" aria-label="Bekræft">OK</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  const dialog = overlay.querySelector('.csm-np')
  const display = overlay.querySelector('#csm-np-display')
  const base = toNumber(baseValue, 0)
  const initialDisplay = typeof initial === 'string' ? initial.trim() : ''
  const fallbackDisplay = (initialDisplay !== '' ? initialDisplay : formatDisplayValue(base)) || '0'

  let buffer = ''
  const render = () => {
    if (display) display.textContent = buffer || fallbackDisplay || '0'
  }

  const prevOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'

  function closeOverlay () {
    if (dialog) {
      dialog.removeEventListener('keydown', handleKeydown)
    }
    document.documentElement.style.overflow = prevOverflow || ''
    overlay.remove()
  }

  function confirmValue () {
    try {
      const result = evalExpr(buffer, base)
      if (typeof onConfirm === 'function') {
        onConfirm(result)
      }
      closeOverlay()
    } catch (error) {
      if (display) {
        display.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 160 })
      }
    }
  }

  function handleKeydown (event) {
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

  overlay.addEventListener('click', event => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    if (target === overlay) {
      closeOverlay()
      return
    }

    const button = target.closest('button[data-action], .csm-np-btn, .csm-np-ok')
    if (!(button instanceof HTMLButtonElement) || !overlay.contains(button)) return

    const action = button.dataset.action
    if (action === 'close') {
      closeOverlay()
      return
    }
    if (action === 'clear') {
      buffer = ''
      render()
      return
    }
    if (action === 'ok') {
      confirmValue()
      return
    }
    if (button.classList.contains('csm-np-btn') && !action) {
      buffer += button.textContent.trim()
      render()
    }
  })

  if (dialog) {
    dialog.addEventListener('keydown', handleKeydown)
  }

  const firstFocusable = dialog?.querySelector('.csm-np-grid button, .csm-np-ok')
  if (firstFocusable instanceof HTMLElement) {
    requestAnimationFrame(() => firstFocusable.focus())
  }

  render()
}
