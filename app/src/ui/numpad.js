const overlay = typeof document !== 'undefined' ? document.getElementById('npOverlay') : null
const screen = typeof document !== 'undefined' ? document.getElementById('npScreen') : null

let resolveInput = null
let buffer = '0'
let baseValue = 0
let pristine = true
let previousFocus = null
let keydownHandlerAttached = false

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

export function evalExpr (expr, base = 0) {
  const baseNumber = toNumber(base, 0)
  const raw = typeof expr === 'string' ? expr.trim() : ''
  if (!raw) return baseNumber

  const normalized = raw
    .replace(/,/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '')

  const expression = /^[+\-*/]/.test(normalized) ? `${baseNumber}${normalized}` : normalized
  if (!/^[0-9.+\-*/]*$/.test(expression)) throw new Error('Invalid expression')

  // eslint-disable-next-line no-new-func
  const value = Function(`"use strict";return (${expression || baseNumber});`)()
  if (!Number.isFinite(value)) throw new Error('Invalid result')
  return value
}

function render () {
  if (screen) {
    screen.textContent = buffer || '0'
  }
}

function currentOperandHasComma () {
  const lastPlus = buffer.lastIndexOf('+')
  const lastMinus = buffer.lastIndexOf('-')
  const lastTimes = buffer.lastIndexOf('×')
  const lastDivide = buffer.lastIndexOf('÷')
  const lastOp = Math.max(lastPlus, lastMinus, lastTimes, lastDivide)
  const segment = buffer.slice(lastOp + 1)
  return segment.includes(',')
}

function closeNumpad (commitValue = null) {
  if (!overlay) return
  overlay.classList.remove('open')
  overlay.setAttribute('aria-hidden', 'true')
  document.documentElement.classList.remove('np-lock')

  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus({ preventScroll: true })
  }
  previousFocus = null

  if (keydownHandlerAttached) {
    document.removeEventListener('keydown', handleKeydown, true)
    keydownHandlerAttached = false
  }

  const resolver = resolveInput
  resolveInput = null
  if (typeof commitValue === 'string' && resolver) {
    resolver(commitValue)
  } else if (!commitValue && resolver) {
    resolver(null)
  }
}

function commitValue () {
  try {
    const value = evalExpr(buffer, baseValue)
    closeNumpad(String(value))
  } catch (error) {
    if (screen && typeof screen.animate === 'function') {
      screen.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 160 })
    }
  }
}

function applyKey (key) {
  switch (key) {
    case 'enter':
      commitValue()
      return
    case 'close':
      closeNumpad()
      return
    case 'C':
      buffer = '0'
      pristine = true
      render()
      return
    case ',':
      if (currentOperandHasComma()) return
      buffer = pristine ? '0,' : `${buffer},`
      pristine = false
      render()
      return
    case '+':
    case '-':
    case '×':
    case '÷':
      if (pristine || buffer === '0') {
        buffer = key
      } else if (/[+\-×÷]$/.test(buffer)) {
        buffer = buffer.slice(0, -1) + key
      } else {
        buffer = `${buffer}${key}`
      }
      pristine = false
      render()
      return
    default:
      if (/^\d$/.test(key)) {
        if (pristine || buffer === '0') {
          buffer = key
        } else {
          buffer = `${buffer}${key}`
        }
        pristine = false
        render()
      }
  }
}

function handlePointerDown (event) {
  if (!(event instanceof PointerEvent)) return
  if (!overlay) return

  const target = event.target
  if (target === overlay) {
    event.preventDefault()
    closeNumpad()
    return
  }

  const button = target instanceof HTMLElement ? target.closest('button[data-key]') : null
  if (!button) return

  event.preventDefault()
  overlay.setPointerCapture?.(event.pointerId)
  const key = button.getAttribute('data-key')
  if (!key) return
  applyKey(key)
}

function handleKeydown (event) {
  if (!overlay || !overlay.classList.contains('open')) return
  const { key } = event

  if (key === 'Escape') {
    event.preventDefault()
    closeNumpad()
    return
  }

  if (key === 'Enter') {
    event.preventDefault()
    commitValue()
    return
  }

  if (key === 'Backspace') {
    event.preventDefault()
    if (buffer.length <= 1) {
      buffer = '0'
      pristine = true
    } else {
      buffer = buffer.slice(0, -1)
      pristine = false
    }
    render()
    return
  }

  if (/^[0-9]$/.test(key)) {
    event.preventDefault()
    applyKey(key)
    return
  }

  if (key === ',' || key === '.') {
    event.preventDefault()
    applyKey(',')
    return
  }

  if (key === '+' || key === '-') {
    event.preventDefault()
    applyKey(key)
    return
  }

  if (key === '*' || key === 'x' || key === 'X') {
    event.preventDefault()
    applyKey('×')
    return
  }

  if (key === '/' || key === '÷') {
    event.preventDefault()
    applyKey('÷')
  }
}

if (overlay) {
  overlay.addEventListener('pointerdown', handlePointerDown, { passive: false })
}

export function openNumpad (options = {}) {
  if (!overlay || !screen) return Promise.resolve(null)

  const normalized = typeof options === 'string' ? { startValue: options } : options || {}
  const startValue = typeof normalized.startValue === 'string' ? normalized.startValue : (typeof normalized.initial === 'string' ? normalized.initial : '')
  baseValue = toNumber(normalized.baseValue ?? normalized.base ?? 0, 0)

  const initial = startValue.trim()
  const fallback = initial !== '' ? initial : String(baseValue || 0)
  buffer = fallback || '0'
  pristine = initial === ''
  render()

  overlay.classList.add('open')
  overlay.setAttribute('aria-hidden', 'false')
  document.documentElement.classList.add('np-lock')

  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

  if (!keydownHandlerAttached) {
    document.addEventListener('keydown', handleKeydown, true)
    keydownHandlerAttached = true
  }

  const firstButton = overlay.querySelector('button[data-key]')
  queueMicrotask(() => {
    if (firstButton instanceof HTMLElement) {
      firstButton.focus()
    }
  })

  return new Promise(resolve => {
    resolveInput = resolve
  })
}

export function isNumpadOpen () {
  return Boolean(overlay?.classList.contains('open'))
}
