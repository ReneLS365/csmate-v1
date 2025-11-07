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

export function wireShortcuts () {
  window.addEventListener('keydown', event => {
    if (document.querySelector('.numpad.open')) return
    if (hasFocusedInput()) return

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      window.JobStore?.saveActive?.()
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault()
      document.getElementById('btn-export-all')?.click()
    }

    if (event.key === 'Enter') {
      if (!focusIsGlobal()) return
      event.preventDefault()
      window.UI?.goNext?.()
    }
  })
}
