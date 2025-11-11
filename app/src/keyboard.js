import { isNumpadOpen } from './ui/numpad.js'

function hasFocusedInput () {
  const el = document.activeElement
  if (!el) return false
  if (el.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

function focusIsGlobal () {
  const el = document.activeElement
  if (!el) return true
  return el === document.body || el === document.documentElement
}

function modalIsOpen () {
  return Boolean(document.querySelector('.modal:not([hidden])')) || Boolean(document.querySelector('.modal[aria-hidden="false"]'))
}

function defaultSave () {
  window.JobStore?.saveActive?.()
}

function defaultExport () {
  document.getElementById('btn-export-all')?.click()
}

function defaultNext () {
  window.UI?.goNext?.()
}

function defaultOpenHelp () {
  const btn = document.getElementById('tab-btn-help')
  if (btn) {
    btn.click()
  }
  const tab = document.getElementById('tab-help')
  if (tab) {
    window.requestAnimationFrame(() => {
      try {
        tab.focus()
      } catch {}
    })
  }
}

function defaultOpenDevPanel () {
  try {
    const event = new CustomEvent('csmate:devpanel-request', {
      detail: { reason: 'shortcut', focus: true }
    })
    window.dispatchEvent(event)
  } catch (error) {
    console.warn('Dev panel shortcut failed', error)
  }
}

function shouldBlockShortcuts (event, options) {
  if (!event || event.defaultPrevented) return true
  if (typeof options.shouldDisable === 'function' && options.shouldDisable(event)) return true
  if (isNumpadOpen()) return true
  if (modalIsOpen()) return true
  if (hasFocusedInput()) return true
  if (event.target && event.target.closest?.('[data-shortcuts="ignore"]')) return true
  return false
}

let wired = false

export function wireShortcuts (options = {}) {
  if (wired || typeof window === 'undefined') return
  wired = true

  const config = {
    onSave: options.onSave || defaultSave,
    onExport: options.onExport || defaultExport,
    onNext: options.onNext || defaultNext,
    onHelp: options.onHelp || defaultOpenHelp,
    onDevtools: options.onDevtools || defaultOpenDevPanel,
    shouldDisable: options.shouldDisable || null
  }

  window.addEventListener('keydown', event => {
    if (shouldBlockShortcuts(event, config)) return

    const key = event.key
    const lower = typeof key === 'string' ? key.toLowerCase() : key

    if ((event.ctrlKey || event.metaKey) && lower === 's') {
      event.preventDefault()
      if (typeof config.onSave === 'function') config.onSave(event)
      return
    }

    if ((event.ctrlKey || event.metaKey) && lower === 'p') {
      event.preventDefault()
      if (typeof config.onExport === 'function') config.onExport(event)
      return
    }

    if (event.shiftKey && (key === '?' || (lower === '/' && event.shiftKey))) {
      event.preventDefault()
      if (typeof config.onHelp === 'function') config.onHelp(event)
      return
    }

    if (event.shiftKey && lower === 'd') {
      event.preventDefault()
      if (typeof config.onDevtools === 'function') config.onDevtools(event)
      return
    }

    if (key === 'Enter') {
      if (!focusIsGlobal()) return
      event.preventDefault()
      if (typeof config.onNext === 'function') config.onNext(event)
    }
  }, true)
}
