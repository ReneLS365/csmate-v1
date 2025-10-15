// Lightweight expression evaluator (+ - * /) with locale-safe decimals
function evalExpr (expr) {
  const cleaned = expr
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '')
  if (!/^[0-9.+\-*/]*$/.test(cleaned)) throw new Error('Invalid')
  // eslint-disable-next-line no-new-func
  const val = Function(`"use strict";return (${cleaned || 0});`)()
  if (!Number.isFinite(val)) throw new Error('NaN')
  return val
}

export function openNumpad ({ initial = '', onConfirm } = {}) {
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
        <button class="csm-np-btn csm-np-ok" data-act="ok">OK</button>
      </div>
      <div class="csm-np-foot">
        <button class="csm-np-close" data-act="close">✕</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  const display = overlay.querySelector('#csm-np-display')

  let buffer = String(initial || '').trim()
  const render = () => {
    if (display) display.textContent = buffer || '0'
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
      const out = evalExpr(buffer || '0')
      if (typeof onConfirm === 'function') {
        onConfirm(out)
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
      if (target.dataset.act === 'close' || target === overlay) {
        closeOverlay()
        return
      }
      if (target.dataset.act === 'clear') {
        buffer = ''
        render()
        return
      }
      if (target.dataset.act === 'ok') {
        confirmValue()
        return
      }
      if (target.classList.contains('csm-np-btn') && !target.dataset.act) {
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

export { evalExpr }
