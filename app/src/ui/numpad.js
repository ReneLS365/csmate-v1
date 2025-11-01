import { devlog } from '../utils/devlog.js'

const overlay = typeof document !== 'undefined' ? document.getElementById('npOverlay') : null
const screen = typeof document !== 'undefined' ? document.getElementById('npScreen') : null

let resolveInput = null
let buffer = '0'
let baseValue = 0
let pristine = true
let previousFocus = null
let keydownHandlerAttached = false
let focusTrapAttached = false
const inertRecords = []

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

function setBackgroundInert () {
  if (!overlay) return
  const parent = overlay.parentElement || document.body
  if (!parent) return
  inertRecords.length = 0
  const children = Array.from(parent.children)
  for (const element of children) {
    if (!(element instanceof HTMLElement)) continue
    if (element === overlay) continue
    inertRecords.push({
      element,
      hadInertAttr: element.hasAttribute('inert'),
      inertValue: 'inert' in element ? element.inert : undefined,
      ariaHidden: element.getAttribute('aria-hidden')
    })
    element.setAttribute('aria-hidden', 'true')
    if ('inert' in element) {
      try {
        element.inert = true
      } catch {
        element.setAttribute('inert', '')
      }
    } else {
      element.setAttribute('inert', '')
    }
  }
}

function clearBackgroundInert () {
  while (inertRecords.length > 0) {
    const record = inertRecords.pop()
    if (!record || !(record.element instanceof HTMLElement)) continue
    const { element, hadInertAttr, inertValue, ariaHidden } = record
    if (ariaHidden == null) {
      element.removeAttribute('aria-hidden')
    } else {
      element.setAttribute('aria-hidden', ariaHidden)
    }
    if ('inert' in element) {
      try {
        element.inert = Boolean(inertValue)
      } catch {
        // ignore restoration failures
      }
    }
    if (hadInertAttr) {
      element.setAttribute('inert', '')
    } else {
      element.removeAttribute('inert')
    }
  }
}

function getFocusableElements () {
  if (!overlay) return []
  const selector = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(overlay.querySelectorAll(selector)).filter(element => element instanceof HTMLElement)
}

function focusElement (element) {
  if (!(element instanceof HTMLElement)) return
  try {
    element.focus({ preventScroll: true })
  } catch {
    element.focus()
  }
}

function enforceFocusTrap (event) {
  if (!overlay || !overlay.classList.contains('open')) return
  const target = event?.target
  if (target instanceof Node && overlay.contains(target)) return
  const focusables = getFocusableElements()
  const fallback = focusables.find(el => el instanceof HTMLElement) || overlay.querySelector('.csm-np')
  focusElement(fallback instanceof HTMLElement ? fallback : overlay)
}

function attachFocusTrap () {
  if (focusTrapAttached) return
  if (typeof document === 'undefined') return
  document.addEventListener('focusin', enforceFocusTrap, true)
  focusTrapAttached = true
}

function detachFocusTrap () {
  if (!focusTrapAttached) return
  if (typeof document === 'undefined') return
  document.removeEventListener('focusin', enforceFocusTrap, true)
  focusTrapAttached = false
}

function isFocusableField (element) {
  if (!(element instanceof HTMLInputElement)) return false
  if (element.disabled) return false
  if (element.readOnly && element.tabIndex < 0) return false
  if (element.closest('[hidden]')) return false
  if (element.closest('[aria-hidden="true"]')) return false
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(element)
    if (!style) return true
    if (style.display === 'none' || style.visibility === 'hidden') return false
  }
  return true
}

function resolveNextField (current, direction) {
  const currentElement = current instanceof HTMLElement ? current : null
  const fields = Array.from(document.querySelectorAll('input[data-numpad-field]'))
    .filter(isFocusableField)
  if (!fields.length) return currentElement
  const index = currentElement ? fields.indexOf(currentElement) : -1
  if (direction === 'forward' || direction === 'backward') {
    const step = direction === 'forward' ? 1 : -1
    let candidateIndex = index === -1 ? (direction === 'forward' ? 0 : fields.length - 1) : index + step
    while (candidateIndex >= 0 && candidateIndex < fields.length) {
      const candidate = fields[candidateIndex]
      if (isFocusableField(candidate)) {
        return candidate
      }
      candidateIndex += step
    }
  }
  if (index !== -1 && currentElement) return currentElement
  return currentElement || fields[0]
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

function closeNumpad (commitValue = null, reason = 'close', focusDirection = null) {
  if (!overlay) return
  const reasonLabel = `numpad:close:${reason}`
  devlog.mark('numpad:close:start')
  devlog.mark(`${reasonLabel}:start`)
  devlog.time('numpad:close')
  devlog.time(reasonLabel)
  overlay.classList.remove('open')
  overlay.setAttribute('aria-hidden', 'true')
  document.documentElement.classList.remove('np-lock')

  detachFocusTrap()
  clearBackgroundInert()

  const focusTarget = previousFocus
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

  const direction = focusDirection === 'backward' ? 'backward' : (focusDirection === 'forward' ? 'forward' : null)
  queueMicrotask(() => {
    let candidate = null
    if (direction) {
      candidate = resolveNextField(focusTarget, direction)
    } else if (isFocusableField(focusTarget)) {
      candidate = focusTarget
    } else {
      candidate = resolveNextField(null, null)
    }
    if (candidate) {
      focusElement(candidate)
    }
  })

  devlog.mark(`${reasonLabel}:end`)
  devlog.mark('numpad:close:end')
  const specificMeasure = devlog.measure(reasonLabel, `${reasonLabel}:start`, `${reasonLabel}:end`)
  const specificDuration = devlog.timeEnd(reasonLabel)
  const closeMeasure = devlog.measure('numpad:close', 'numpad:close:start', 'numpad:close:end')
  const closeDuration = devlog.timeEnd('numpad:close')
  devlog.warnIfSlow(reasonLabel, specificMeasure || specificDuration, 50)
  devlog.warnIfSlow('numpad:close', closeMeasure || closeDuration, 50)
}

function commitValue (reason = 'commit', focusDirection = null) {
  devlog.mark('numpad:commit:start')
  devlog.time('numpad:commit')
  try {
    const value = evalExpr(buffer, baseValue)
    closeNumpad(String(value), reason, focusDirection)
  } catch (error) {
    if (screen && typeof screen.animate === 'function') {
      screen.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 160 })
    }
  } finally {
    devlog.mark('numpad:commit:end')
    const measured = devlog.measure('numpad:commit', 'numpad:commit:start', 'numpad:commit:end')
    const duration = devlog.timeEnd('numpad:commit')
    devlog.warnIfSlow('numpad:commit', measured || duration, 50)
  }
}

function applyKey (key) {
  switch (key) {
    case 'enter':
      devlog.mark('numpad:clickOK→close:start')
      devlog.time('numpad:clickOK→close')
      commitValue('commit-button')
      devlog.mark('numpad:clickOK→close:end')
      {
        const measured = devlog.measure('numpad:clickOK→close', 'numpad:clickOK→close:start', 'numpad:clickOK→close:end')
        const duration = devlog.timeEnd('numpad:clickOK→close')
        devlog.warnIfSlow('numpad:clickOK→close', measured || duration, 50)
      }
      return
    case 'close':
      devlog.mark('numpad:clickClose:start')
      devlog.time('numpad:clickClose')
      closeNumpad(null, 'close-button')
      devlog.mark('numpad:clickClose:end')
      {
        const measured = devlog.measure('numpad:clickClose', 'numpad:clickClose:start', 'numpad:clickClose:end')
        const duration = devlog.timeEnd('numpad:clickClose')
        devlog.warnIfSlow('numpad:clickClose', measured || duration, 50)
      }
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
    closeNumpad(null, 'overlay')
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
    devlog.mark('numpad:key→close:start')
    devlog.time('numpad:key→close')
    closeNumpad(null, 'escape')
    devlog.mark('numpad:key→close:end')
    {
      const measured = devlog.measure('numpad:key→close', 'numpad:key→close:start', 'numpad:key→close:end')
      const duration = devlog.timeEnd('numpad:key→close')
      devlog.warnIfSlow('numpad:key→close', measured || duration, 50)
    }
    return
  }

  if (key === 'Enter') {
    event.preventDefault()
    devlog.mark('numpad:key→close:start')
    devlog.time('numpad:key→close')
    commitValue('enter-key')
    devlog.mark('numpad:key→close:end')
    {
      const measured = devlog.measure('numpad:key→close', 'numpad:key→close:start', 'numpad:key→close:end')
      const duration = devlog.timeEnd('numpad:key→close')
      devlog.warnIfSlow('numpad:key→close', measured || duration, 50)
    }
    return
  }

  if (key === 'Tab') {
    event.preventDefault()
    devlog.mark('numpad:key→close:start')
    devlog.time('numpad:key→close')
    const direction = event.shiftKey ? 'backward' : 'forward'
    commitValue('tab-key', direction)
    devlog.mark('numpad:key→close:end')
    {
      const measured = devlog.measure('numpad:key→close', 'numpad:key→close:start', 'numpad:key→close:end')
      const duration = devlog.timeEnd('numpad:key→close')
      devlog.warnIfSlow('numpad:key→close', measured || duration, 50)
    }
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

  devlog.mark('numpad:open')
  const triggerMeasure = devlog.measure('numpad:trigger→open', 'numpad:trigger', 'numpad:open')
  const triggerDuration = devlog.timeEnd('numpad:trigger→open')
  devlog.warnIfSlow('numpad:trigger→open', triggerMeasure || triggerDuration, 50)
  devlog.time('numpad:open→focus')

  overlay.classList.add('open')
  overlay.setAttribute('aria-hidden', 'false')
  document.documentElement.classList.add('np-lock')

  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null

  setBackgroundInert()
  attachFocusTrap()

  if (!keydownHandlerAttached) {
    document.addEventListener('keydown', handleKeydown, true)
    keydownHandlerAttached = true
  }

  const firstButton = overlay.querySelector('button[data-key]')
  queueMicrotask(() => {
    if (firstButton instanceof HTMLElement) {
      devlog.mark('numpad:focus')
      const measured = devlog.measure('numpad:open→focus', 'numpad:open', 'numpad:focus')
      const duration = devlog.timeEnd('numpad:open→focus')
      devlog.warnIfSlow('numpad:open→focus', measured || duration, 50)
      focusElement(firstButton)
    }
  })

  return new Promise(resolve => {
    resolveInput = resolve
  })
}

export function isNumpadOpen () {
  return Boolean(overlay?.classList.contains('open'))
}
