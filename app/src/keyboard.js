function focused () {
  const el = document.activeElement
  if (!el) return false
  if (el.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

function hasNativeEnterBehavior (el) {
  if (!el || el === document.body || el === document.documentElement) return false
  if (el.isContentEditable) return true
  if (el.matches?.('button, [role="button"], a[href], summary, [role="link"], [role="menuitem"], [role="option"], [role="tab"]')) return true
  if (typeof el.click === 'function' && el.tabIndex >= 0) return true
  return false
}

function allowsGlobalEnter (el) {
  if (!el) return true
  if (el === document.body || el === document.documentElement) return true
  if (el.isContentEditable) return false
  if (el.tabIndex < 0) return true
  return Boolean(el.closest?.('[data-shortcut-enter]'))
}

export function wireShortcuts () {
  window.addEventListener('keydown', (e) => {
    if (document.querySelector('.csm-np-overlay.open')) return
    if (focused()) return

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      window.JobStore?.saveActive?.()
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault()
      document.getElementById('btn-export-all')?.click()
    }

    if (e.key === 'Enter') {
      const active = document.activeElement
      if (hasNativeEnterBehavior(active)) return
      if (!allowsGlobalEnter(active)) return

      e.preventDefault()
      window.UI?.goNext?.()
    }
  })
}
