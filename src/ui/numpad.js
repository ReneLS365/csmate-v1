import { CalcCore } from '../lib/calc-core.js'

const BUTTON_LAYOUT = [
  ['√', 'π', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', 'Enter']
]

const OPERATOR_MAP = new Map([
  ['−', '-']
])

function prefersReducedMotion () {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export class Numpad {
  constructor ({ root = document.body, calc } = {}) {
    this.root = root
    this.calc = calc || new CalcCore({ onChange: state => this._render(state) })
    this.calc.setOnChange(state => this._render(state))
    this.container = this._build()
    this.expressionEl = this.container.querySelector('.csmate-expression')
    this.displayEl = this.container.querySelector('.csmate-display')
    this._visible = false
    this._backspaceTimer = null
    this._outsideHandler = event => {
      if (!this._visible) return
      if (!this.container.contains(event.target)) {
        this.exitAugmentMode(false)
      }
    }
    this._keyHandler = event => {
      if (!this._visible) return
      if (event.key === 'Escape') {
        event.preventDefault()
        this.exitAugmentMode(false)
        return
      }
      if (this.calc.handleKey(event.key)) {
        event.preventDefault()
        this._vibrate()
      }
    }
    document.addEventListener('keydown', this._keyHandler)
    document.addEventListener('pointerdown', this._outsideHandler)
    this._render(this.calc.state)
  }

  _build () {
    const container = document.createElement('div')
    container.className = 'csmate-numpad'
    container.dataset.hidden = 'true'
    container.setAttribute('role', 'dialog')
    container.setAttribute('aria-modal', 'true')
    container.tabIndex = -1

    const handle = document.createElement('div')
    handle.className = 'csmate-handle'
    container.append(handle)

    const header = document.createElement('div')
    header.className = 'csmate-numpad-header'
    header.innerHTML = '<span>CSMate</span><button type="button" class="csmate-close" aria-label="Luk">×</button>'
    container.append(header)

    const expression = document.createElement('div')
    expression.className = 'csmate-expression'
    container.append(expression)

    const display = document.createElement('div')
    display.className = 'csmate-display'
    display.setAttribute('aria-live', 'polite')
    container.append(display)

    const grid = document.createElement('div')
    grid.className = 'csmate-numpad-grid'
    BUTTON_LAYOUT.flat().forEach(symbol => {
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.key = symbol
      button.textContent = symbol
      button.setAttribute('aria-label', labelForKey(symbol))
      button.addEventListener('click', () => this._handlePress(symbol))
      if (symbol === '⌫') {
        button.addEventListener('pointerdown', () => this._startBackspaceHold())
        button.addEventListener('pointerup', () => this._stopBackspaceHold())
        button.addEventListener('pointerleave', () => this._stopBackspaceHold())
      }
      grid.append(button)
    })
    container.append(grid)

    header.querySelector('.csmate-close').addEventListener('click', () => this.exitAugmentMode(false))

    this.root.append(container)
    return container
  }

  _handlePress (symbol) {
    if (symbol === 'Enter') {
      this.calc.inputEquals()
      this._vibrate()
      this.hide()
      return
    }
    if (symbol === '⌫') {
      this.calc.inputBackspace()
      this._vibrate()
      return
    }
    if (symbol === '√') {
      this.calc.inputSqrt()
      this._vibrate()
      return
    }
    if (symbol === 'π') {
      this.calc.inputPi()
      this._vibrate()
      return
    }
    if (symbol === '%') {
      this.calc.inputPercent()
      this._vibrate()
      return
    }
    if (symbol === '.') {
      this.calc.inputDecimal()
      this._vibrate()
      return
    }
    if (/^[0-9]$/.test(symbol)) {
      this.calc.inputDigit(symbol)
      this._vibrate()
      return
    }
    const normalised = OPERATOR_MAP.get(symbol) || symbol
    this.calc.inputOperator(normalised)
    this._vibrate()
  }

  _startBackspaceHold () {
    this._stopBackspaceHold()
    this._backspaceTimer = window.setTimeout(() => {
      this.calc.inputBackspace({ clearAll: true })
      this._vibrate()
    }, 600)
  }

  _stopBackspaceHold () {
    if (this._backspaceTimer) {
      window.clearTimeout(this._backspaceTimer)
      this._backspaceTimer = null
    }
  }

  _render (state) {
    if (!this.expressionEl || !this.displayEl) return
    this.expressionEl.textContent = state.expression || ''
    const value = state.augment && state.preview != null ? state.preview : state.display
    this.displayEl.textContent = value
  }

  enterAugmentMode (config) {
    this.calc.enterAugmentMode(config)
    this.show()
  }

  exitAugmentMode (commit) {
    const augment = this.calc.exitAugmentMode(commit)
    if (augment && augment.targetEl && commit) {
      const value = this.calc.getDisplay()
      augment.targetEl.value = value
      if (typeof augment.onCommit === 'function') {
        augment.onCommit(Number(value))
      }
    }
    this.hide()
  }

  show () {
    this._visible = true
    this.container.dataset.hidden = 'false'
    this.container.focus()
  }

  hide () {
    this._visible = false
    this.container.dataset.hidden = 'true'
  }

  destroy () {
    document.removeEventListener('keydown', this._keyHandler)
    document.removeEventListener('pointerdown', this._outsideHandler)
    this.container.remove()
  }

  _vibrate () {
    if (prefersReducedMotion()) return
    try {
      if (navigator?.vibrate) {
        navigator.vibrate(10)
      }
    } catch (err) {
      // ignore vibration errors
    }
  }
}

function labelForKey (symbol) {
  switch (symbol) {
    case '√': return 'Kvadratrod'
    case 'π': return 'Pi'
    case '%': return 'Procent'
    case '÷': return 'Divider'
    case '×': return 'Gange'
    case '−': return 'Minus'
    case '⌫': return 'Slet'
    case 'Enter': return 'Beregn'
    default: return symbol
  }
}
