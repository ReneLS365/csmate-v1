import { buildEKompletRows, rowsToCsv } from '../lib/e-komplet/export.js'
import { parseCsv, applyMapping } from '../lib/e-komplet/import.js'
import { validateRows } from '../lib/e-komplet/validate.js'
import { CSV_HEADERS } from '../lib/e-komplet/schema.js'

export async function initialiseDiagnostics ({ calc, panel: _panel, numpad: _numpad, root = document.body }) {
  const params = new URLSearchParams(window.location.search)
  const debugEnabled = params.get('debug') === '1' || window.__DEBUG === true
  if (!debugEnabled) return

  const log = []
  const addResult = (label, ok, detail = '') => {
    log.push({ label, ok, detail })
  }

  window.addEventListener('error', event => {
    addResult('JS fejl', false, event.message)
    render()
  })

  window.addEventListener('unhandledrejection', event => {
    addResult('Unhandled promise', false, event.reason?.message || String(event.reason))
    render()
  })

  try {
    const viewport = document.querySelector('meta[name="viewport"]')
    addResult('Viewport meta', Boolean(viewport))
  } catch (err) {
    addResult('Viewport meta', false, err.message)
  }

  try {
    const buttons = Array.from(document.querySelectorAll('.csmate-numpad button'))
    const small = buttons.filter(btn => btn.offsetWidth < 44 || btn.offsetHeight < 44)
    addResult('Touch targets ≥44px', small.length === 0, small.length ? `${small.length} små knapper` : '')
  } catch (err) {
    addResult('Touch targets ≥44px', false, err.message)
  }

  try {
    const navButtons = document.querySelectorAll('button, [role="button"]')
    addResult('Knapper findes', navButtons.length > 0)
  } catch (err) {
    addResult('Knapper findes', false, err.message)
  }

  if (typeof calc?.inputDigit === 'function') {
    try {
      calc.clearAll()
      calc.inputDigit('5')
      calc.inputOperator('+')
      calc.inputDigit('5')
      calc.inputEquals()
      addResult('Numpad smoke', calc.getDisplay() === '10')
    } catch (err) {
      addResult('Numpad smoke', false, err.message)
    }
  }

  try {
    const sag = { sagsnummer: 'X1', opgave: 'Demo', dato: '2024-01-01' }
    const price = { akkordAmount: 1250 }
    const timeRows = [
      { employeeId: 'A1', employeeName: 'Test', date: '2024-01-01', hours: 7.5, wageType: 'Normal' }
    ]
    const rows = buildEKompletRows(sag, price, timeRows)
    const csv = rowsToCsv(rows)
    const { rows: parsed } = await parseCsv(csv)
    const identity = {}
    CSV_HEADERS.forEach(header => { identity[header] = header })
    const mapped = applyMapping(parsed, identity)
    const validation = validateRows(mapped)
    addResult('E-Komplet round-trip', validation.ok)
  } catch (err) {
    addResult('E-Komplet round-trip', false, err.message)
  }

  const render = () => {
    let panelEl = root.querySelector('.csmate-diagnostics')
    if (!panelEl) {
      panelEl = document.createElement('aside')
      panelEl.className = 'csmate-diagnostics'
      const heading = document.createElement('h2')
      heading.textContent = 'Diagnostics'
      const list = document.createElement('ul')
      panelEl.append(heading, list)
      root.append(panelEl)
    }
    const list = panelEl.querySelector('ul')
    if (!list) return

    while (list.firstChild) {
      list.removeChild(list.firstChild)
    }

    for (const item of log) {
      const entry = document.createElement('li')
      const iconText = item.ok ? '✅' : '❌'
      entry.append(document.createTextNode(`${iconText} ${item.label}`))

      const hasDetail = item.detail !== undefined && item.detail !== null && item.detail !== ''
      if (hasDetail) {
        const detailText = typeof item.detail === 'string' ? item.detail : String(item.detail)
        entry.append(document.createTextNode(` – ${detailText}`))
      }

      list.append(entry)
    }
  }

  render()
}
