const OPERATIONS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => b === 0 ? Number.NaN : a / b
}

const KEY_TO_OPERATOR = {
  '+': '+',
  '-': '-',
  '*': '×',
  x: '×',
  '/': '÷'
}

export class CalcCore {
  constructor ({ onChange } = {}) {
    this.state = {
      display: '0',
      expression: '',
      accumulator: null,
      operator: null,
      previousValue: null,
      shouldResetDisplay: false,
      error: null,
      augment: null,
      preview: null
    }
    this.onChange = onChange || null
    this._emit()
  }

  setOnChange (fn) {
    this.onChange = fn
    this._emit()
  }

  getDisplay () {
    return this.state.display
  }

  clearAll () {
    this.state.display = '0'
    this.state.expression = ''
    this.state.accumulator = null
    this.state.operator = null
    this.state.previousValue = null
    this.state.shouldResetDisplay = false
    this.state.error = null
    this.state.preview = null
    if (this.state.augment) {
      this.state.augment = { ...this.state.augment, active: true }
      this.state.accumulator = this.state.augment.base
      this.state.operator = this.state.augment.operator
      this.state.expression = this._buildExpression()
    }
    this._emit()
  }

  inputDigit (digit) {
    if (!/^[0-9]$/.test(String(digit))) return
    if (this.state.shouldResetDisplay || this.state.display === '0') {
      this.state.display = String(digit)
    } else {
      this.state.display += String(digit)
    }
    this.state.shouldResetDisplay = false
    this._refreshPreview()
    this._emit()
  }

  inputDecimal () {
    if (this.state.shouldResetDisplay) {
      this.state.display = '0.'
      this.state.shouldResetDisplay = false
      this._refreshPreview()
      this._emit()
      return
    }
    if (!this.state.display.includes('.')) {
      this.state.display += this.state.display === '' ? '0.' : '.'
      this._refreshPreview()
      this._emit()
    }
  }

  inputPi () {
    this.state.display = this._formatNumber(Math.PI)
    this.state.shouldResetDisplay = true
    this._refreshPreview()
    this._emit()
  }

  inputSqrt () {
    const value = this._currentValue()
    if (value < 0) {
      this._setError('Fejl')
      return
    }
    const result = Math.sqrt(value)
    this.state.display = this._formatNumber(result)
    this.state.shouldResetDisplay = true
    this._refreshPreview()
    this._emit()
  }

  inputPercent () {
    const current = this._currentValue()
    if (this.state.operator && this.state.accumulator != null) {
      switch (this.state.operator) {
        case '+':
        case '-':
          this.state.display = this._formatNumber(this.state.accumulator * (current / 100))
          break
        case '×':
        case '÷':
          this.state.display = this._formatNumber(current / 100)
          break
        default:
          this.state.display = this._formatNumber(current / 100)
      }
    } else {
      this.state.display = this._formatNumber(current / 100)
    }
    this.state.shouldResetDisplay = true
    this._refreshPreview()
    this._emit()
  }

  inputOperator (operator) {
    if (!OPERATIONS[operator]) return
    if (this.state.operator && !this.state.shouldResetDisplay) {
      this._commitPending()
    } else {
      this.state.accumulator = this._currentValue()
    }
    this.state.operator = operator
    this.state.shouldResetDisplay = true
    this.state.expression = this._buildExpression({ includeCurrent: false })
    this._refreshPreview()
    this._emit()
  }

  inputBackspace ({ clearAll = false } = {}) {
    if (clearAll) {
      this.clearAll()
      return
    }
    if (this.state.shouldResetDisplay) {
      this.state.display = '0'
      this.state.shouldResetDisplay = false
    } else {
      this.state.display = this.state.display.length > 1 ? this.state.display.slice(0, -1) : '0'
    }
    this._refreshPreview()
    this._emit()
  }

  inputEquals () {
    this._commitPending()
    if (this.state.augment) {
      const value = this._currentValue()
      const commitValue = Number.isFinite(value) ? value : 0
      const augment = this.state.augment
      this.exitAugmentMode(true, commitValue)
      if (augment?.onCommit) augment.onCommit(commitValue)
    }
    this._emit()
  }

  handleKey (key) {
    if (key === 'Enter') {
      this.inputEquals()
      return true
    }
    if (key === 'Backspace') {
      this.inputBackspace()
      return true
    }
    if (key === 'Delete') {
      this.clearAll()
      return true
    }
    if (key === '%') {
      this.inputPercent()
      return true
    }
    if (key === '.') {
      this.inputDecimal()
      return true
    }
    if (/^[0-9]$/.test(key)) {
      this.inputDigit(key)
      return true
    }
    if (KEY_TO_OPERATOR[key]) {
      this.inputOperator(KEY_TO_OPERATOR[key])
      return true
    }
    return false
  }

  enterAugmentMode ({ base, operator = '+', targetEl = null, onCommit = null }) {
    const numericBase = Number(base) || 0
    this.state.augment = { base: numericBase, operator, targetEl, onCommit, active: true }
    this.state.accumulator = numericBase
    this.state.operator = operator
    this.state.display = '0'
    this.state.expression = this._buildExpression()
    this.state.preview = numericBase
    this.state.shouldResetDisplay = false
    this._emit()
  }

  exitAugmentMode (commit, overrideValue = null) {
    if (!this.state.augment) return
    const value = overrideValue != null ? overrideValue : this._currentValue()
    if (commit) {
      this.state.display = this._formatNumber(value)
    } else {
      this.state.display = this._formatNumber(this.state.augment.base)
    }
    const augment = this.state.augment
    this.state.augment = null
    this.state.accumulator = null
    this.state.operator = null
    this.state.expression = ''
    this.state.preview = null
    this.state.shouldResetDisplay = true
    this._emit()
    return augment
  }

  _currentValue () {
    const parsed = parseFloat(String(this.state.display).replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : 0
  }

  _commitPending () {
    if (this.state.operator && this.state.accumulator != null) {
      const current = this._currentValue()
      const op = OPERATIONS[this.state.operator]
      const result = op(this.state.accumulator, current)
      if (!Number.isFinite(result)) {
        this._setError('Fejl')
        return
      }
      this.state.display = this._formatNumber(result)
      this.state.accumulator = result
      this.state.previousValue = current
    } else {
      this.state.accumulator = this._currentValue()
    }
    this.state.operator = null
    this.state.shouldResetDisplay = true
    this.state.expression = this._buildExpression({ reset: true })
    this.state.preview = this._currentValue()
  }

  _refreshPreview () {
    if (this.state.augment && this.state.operator && this.state.accumulator != null) {
      const op = OPERATIONS[this.state.operator]
      const current = this._currentValue()
      const result = op(this.state.accumulator, current)
      this.state.preview = Number.isFinite(result) ? result : null
      this.state.expression = this._buildExpression()
    } else {
      this.state.preview = null
      this.state.expression = this._buildExpression()
    }
  }

  _buildExpression ({ includeCurrent = true, reset = false } = {}) {
    if (this.state.augment) {
      const base = this._formatNumber(this.state.augment.base)
      const operator = this.state.operator || this.state.augment.operator
      const current = includeCurrent ? this.state.display : ''
      return `${base} ${operator}${current ? ' ' + current : ''}`.trim()
    }
    if (reset) return ''
    if (this.state.operator && includeCurrent) {
      return `${this._formatNumber(this.state.accumulator)} ${this.state.operator} ${this.state.display}`
    }
    if (this.state.operator) {
      return `${this._formatNumber(this.state.accumulator)} ${this.state.operator}`
    }
    return this.state.display
  }

  _formatNumber (value) {
    if (typeof value === 'string') return value
    if (!Number.isFinite(value)) return 'Fejl'
    const result = parseFloat(Number(value).toFixed(12))
    return String(result)
  }

  _setError (message) {
    this.state.error = message
    this.state.display = message
    this.state.shouldResetDisplay = true
    this._emit()
  }

  _emit () {
    if (typeof this.onChange === 'function') {
      this.onChange({ ...this.state })
    }
  }
}

export function createCalcCore (opts) {
  return new CalcCore(opts)
}
