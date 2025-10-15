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
        <button class="csm-np-btn">7</button><button class="csm-np-btn">8</button><button class="csm-np-btn">9</button><button class="csm-np-btn csm-np-op">×</button>
        <button class="csm-np-btn">4</button><button class="csm-np-btn">5</button><button class="csm-np-btn">6</button><button class="csm-np-btn csm-np-op">÷</button>
        <button class="csm-np-btn">1</button><button class="csm-np-btn">2</button><button class="csm-np-btn">3</button><button class="csm-np-btn csm-np-op">-</button>
        <button class="csm-np-btn">0</button><button class="csm-np-btn">,</button><button class="csm-np-btn" data-act="clear">C</button><button class="csm-np-btn csm-np-op">+</button>
      </div>
      <div class="csm-np-foot">
        <button class="csm-np-close" data-act="close">✕</button>
        <button class="csm-np-ok" data-act="ok">OK</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

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

  const closeOverlay = () => {
    window.removeEventListener('keydown', keyHandler)
    document.documentElement.style.overflow = prevOverflow || ''
    overlay.remove()
  }

  const confirmValue = () => {
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

  overlay.addEventListener(
    'click',
    event => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return

      if (target === overlay) {
        closeOverlay()
        return
      }

      const action = target.dataset.act
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
      if (target.classList.contains('csm-np-btn') && !action) {
        buffer += target.textContent.trim()
        render()
      }
    },
    { passive: true }
  )

  const keyHandler = event => {
    if (event.key === 'Escape') {
      closeOverlay()
      return
    }
    if (event.key === 'Enter') {
      confirmValue()
      return
    }
    if (event.key === 'Backspace') {
      buffer = buffer.slice(0, -1)
      render()
      return
    }
    if ('0123456789+-*/.,xX'.includes(event.key)) {
      const key = event.key.replace('x', '×').replace('X', '×').replace('.', ',')
      buffer += key
      render()
    }
  }
  window.addEventListener('keydown', keyHandler)

  render()
}
