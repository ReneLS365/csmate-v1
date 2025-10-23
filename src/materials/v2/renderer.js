import './styles.css'

const CUSTOM_LINE_IDS = ['CUST_1', 'CUST_2', 'CUST_3']
const NUMBER_FORMAT = new Intl.NumberFormat('da-DK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
const QUANTITY_FORMAT = new Intl.NumberFormat('da-DK', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

function toDecimal (value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value !== 'string') {
    return 0
  }
  const trimmed = value.trim()
  if (!trimmed) return 0
  const normalized = trimmed
    .replace(/\s+/g, '')
    .replace(/,(?=\d{3}(?:\D|$))/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function toCurrency (value) {
  if (!Number.isFinite(value)) return '0,00'
  return NUMBER_FORMAT.format(Math.round(value * 100) / 100)
}

function createInput ({
  type = 'text',
  step,
  readOnly = false,
  value = '',
  name,
  dataset = {},
  className
}) {
  const input = document.createElement('input')
  if (type === 'number') {
    input.type = 'text'
    input.inputMode = 'decimal'
    input.pattern = '[0-9]*[.,]?[0-9]*'
    if (step) {
      input.setAttribute('step', step)
    }
  } else {
    input.type = type
    if (step) {
      input.step = step
    }
  }
  if (name) input.name = name
  input.value = value
  if (readOnly) {
    input.readOnly = true
    input.tabIndex = -1
  }
  Object.entries(dataset).forEach(([key, val]) => {
    input.dataset[key] = String(val)
  })
  const classes = ['materials-v2__input']
  if (className) {
    if (Array.isArray(className)) {
      classes.push(...className)
    } else {
      classes.push(className)
    }
  }
  input.className = classes.join(' ')
  return input
}

function normalizeDecimalInput (input) {
  if (!input) return ''
  const raw = input.value ?? ''
  if (typeof raw !== 'string') {
    return String(raw ?? '')
  }
  const normalized = raw.replace(/,/g, '.')
  if (normalized !== raw) {
    input.value = normalized
  }
  return normalized
}

function createLineRow (line, state, handlers) {
  const row = document.createElement('div')
  row.className = 'materials-v2__row'
  row.dataset.id = line.id
  row.setAttribute('role', 'row')
  row.setAttribute('aria-label', 'Materiale')

  const nameCell = document.createElement('div')
  nameCell.className = 'materials-v2__cell materials-v2__cell--name'
  nameCell.setAttribute('role', 'cell')
  if (line.type === 'base') {
    nameCell.textContent = line.name
    if (line.name) {
      nameCell.title = line.name
    }
  } else {
    const nameInput = createInput({
      value: line.name || '',
      name: `name-${line.id}`
    })
    nameInput.placeholder = 'Tilføj materiale'
    nameInput.setAttribute('aria-labelledby', 'materials-v2__header-name')
    nameInput.setAttribute('aria-label', 'Navn på materiale')
    nameInput.addEventListener('input', () => {
      line.name = nameInput.value
      handlers.onLinesChange()
      updateAccessibleLabels()
    })
    line.nameInput = nameInput
    nameCell.appendChild(nameInput)
  }
  row.appendChild(nameCell)

  const qtyCell = document.createElement('div')
  qtyCell.className = 'materials-v2__cell materials-v2__cell--quantity'
  qtyCell.setAttribute('role', 'cell')
  const qtyInput = createInput({
    type: 'number',
    step: '0.01',
    value: line.quantity ? String(line.quantity) : '',
    name: `qty-${line.id}`,
    dataset: { id: line.id },
    className: 'materials-v2__input--numeric'
  })
  qtyInput.inputMode = 'decimal'
  qtyInput.min = '0'
  qtyInput.setAttribute('aria-labelledby', 'materials-v2__header-quantity')
  qtyInput.addEventListener('input', () => {
    const normalized = normalizeDecimalInput(qtyInput)
    line.quantity = toDecimal(normalized)
    handlers.onQuantityChange(line)
  })
  line.qtyInput = qtyInput
  qtyCell.appendChild(qtyInput)
  row.appendChild(qtyCell)

  const priceCell = document.createElement('div')
  priceCell.className = 'materials-v2__cell materials-v2__cell--price'
  priceCell.setAttribute('role', 'cell')
  const priceInput = createInput({
    type: 'number',
    step: '0.01',
    value: line.price != null ? String(line.price) : '',
    name: `price-${line.id}`,
    readOnly: line.type === 'base' && !state.isAdmin,
    dataset: { id: line.id },
    className: 'materials-v2__input--numeric'
  })
  priceInput.setAttribute('aria-labelledby', 'materials-v2__header-price')
  priceInput.addEventListener('input', () => {
    const normalized = normalizeDecimalInput(priceInput)
    line.price = toDecimal(normalized)
    handlers.onPriceChange(line)
  })
  line.priceInput = priceInput
  priceCell.appendChild(priceInput)
  row.appendChild(priceCell)

  const totalCell = document.createElement('div')
  totalCell.className = 'materials-v2__cell materials-v2__cell--total'
  totalCell.setAttribute('role', 'cell')
  totalCell.setAttribute('aria-labelledby', 'materials-v2__header-total')
  totalCell.textContent = toCurrency(line.total || 0)
  line.totalCell = totalCell
  row.appendChild(totalCell)

  function updateAccessibleLabels () {
    const rawName = typeof line.name === 'string' ? line.name.trim() : ''
    const labelName = rawName || 'materiale'
    row.setAttribute('aria-label', rawName ? `Materiale ${rawName}` : 'Materiale')
    qtyInput.setAttribute('aria-label', `Antal for ${labelName}`)
    priceInput.setAttribute('aria-label', `Pris for ${labelName}`)
    totalCell.setAttribute('aria-label', `Linjetotal for ${labelName}`)
    if (line.type === 'base') {
      nameCell.title = rawName
    }
  }

  updateAccessibleLabels()

  return row
}

function createAdminPanel (state, handlers) {
  const wrapper = document.createElement('div')
  wrapper.className = 'materials-v2__admin'

  const status = document.createElement('span')
  status.className = 'materials-v2__admin-status'
  status.textContent = state.isAdmin ? 'Admin aktiv' : 'Admin låst'
  wrapper.appendChild(status)

  const message = document.createElement('div')
  message.className = 'materials-v2__admin-message'
  wrapper.appendChild(message)

  const form = document.createElement('form')
  form.className = 'materials-v2__admin-form'

  const codeInput = createInput({ type: 'password', name: 'admin-code' })
  codeInput.placeholder = 'Admin-kode'
  form.appendChild(codeInput)

  const verifyBtn = document.createElement('button')
  verifyBtn.type = 'submit'
  verifyBtn.textContent = 'Verificer'
  form.appendChild(verifyBtn)

  const logoutBtn = document.createElement('button')
  logoutBtn.type = 'button'
  logoutBtn.textContent = 'Lås'
  logoutBtn.addEventListener('click', () => {
    handlers.onAdminToggle(false)
    codeInput.value = ''
    message.textContent = ''
  })
  form.appendChild(logoutBtn)

  form.addEventListener('submit', event => {
    event.preventDefault()
    const value = codeInput.value.trim()
    if (!value) {
      message.textContent = 'Indtast kode'
      return
    }
    message.textContent = 'Verificerer…'
    handlers
      .onAdminVerify(value)
      .then(result => {
        if (result) {
          message.textContent = 'Admin åbnet'
          codeInput.value = ''
        } else {
          message.textContent = 'Forkert kode'
        }
      })
      .catch(err => {
        console.error('Admin verify fejlede', err)
        message.textContent = 'Fejl ved verificering'
      })
  })

  function updateStatus (isAdmin) {
    status.textContent = isAdmin ? 'Admin aktiv' : 'Admin låst'
    verifyBtn.disabled = isAdmin
    codeInput.disabled = isAdmin
  }

  wrapper.appendChild(form)

  return { element: wrapper, updateStatus, message }
}

function formatQuantityLabel (line) {
  const rawInput = typeof line.qtyInput?.value === 'string' ? line.qtyInput.value.trim() : ''
  if (rawInput) {
    return rawInput.replace(/\./g, ',')
  }
  if (typeof line.quantity === 'number' && Number.isFinite(line.quantity) && line.quantity !== 0) {
    return QUANTITY_FORMAT.format(Math.round(line.quantity * 100) / 100)
  }
  return '0'
}

function getLineDisplayName (line) {
  if (line.type === 'base') {
    return line.name || 'Materiale'
  }
  const fromInput = typeof line.nameInput?.value === 'string' ? line.nameInput.value.trim() : ''
  if (fromInput) return fromInput
  if (typeof line.name === 'string' && line.name.trim()) {
    return line.name.trim()
  }
  return 'Materiale'
}

export function createMaterialsRenderer ({
  container,
  materials,
  overrides = {},
  firmId,
  availableFirms = [],
  isAdmin = false,
  onAdminVerify = () => Promise.resolve(false),
  onAdminToggle = () => {},
  onSavePrices = () => Promise.resolve(),
  onFirmChange = () => {}
}) {
  if (!container) {
    throw new Error('Container required for materials renderer')
  }

  const state = {
    isAdmin: Boolean(isAdmin),
    firmId,
    lines: [],
    total: 0,
    showOnlySelected: false
  }

  const root = document.createElement('div')
  root.className = 'materials-v2'
  container.appendChild(root)

  const header = document.createElement('div')
  header.className = 'materials-v2__header'
  root.appendChild(header)

  const title = document.createElement('h2')
  title.textContent = 'Materialer v2 (test)'
  header.appendChild(title)

  if (Array.isArray(availableFirms) && availableFirms.length > 0) {
    const firmWrapper = document.createElement('label')
    firmWrapper.className = 'materials-v2__firm-select'
    firmWrapper.textContent = 'Firma'
    const select = document.createElement('select')
    select.name = 'firm'
    availableFirms.forEach(firm => {
      const option = document.createElement('option')
      option.value = firm.id
      option.textContent = firm.label || firm.id
      if (firm.id === state.firmId) {
        option.selected = true
      }
      select.appendChild(option)
    })
    select.addEventListener('change', () => {
      state.firmId = select.value
      onFirmChange(select.value)
    })
    firmWrapper.appendChild(select)
    header.appendChild(firmWrapper)
  }

  const adminPanel = createAdminPanel(state, {
    onAdminVerify: async code => {
      const ok = await onAdminVerify(code)
      if (ok) {
        state.isAdmin = true
        adminPanel.updateStatus(true)
        applyAdminState()
        onAdminToggle(true)
      }
      return ok
    },
    onAdminToggle: enabled => {
      state.isAdmin = Boolean(enabled)
      adminPanel.updateStatus(state.isAdmin)
      applyAdminState()
      onAdminToggle(state.isAdmin)
    }
  })
  root.appendChild(adminPanel.element)

  const toolbar = document.createElement('div')
  toolbar.className = 'materials-v2__toolbar'
  toolbar.setAttribute('role', 'region')
  toolbar.setAttribute('aria-label', 'Materiale filtre')
  root.appendChild(toolbar)

  const toggleLabel = document.createElement('label')
  toggleLabel.className = 'materials-v2__toggle'
  const showOnlySelectedInput = document.createElement('input')
  showOnlySelectedInput.type = 'checkbox'
  showOnlySelectedInput.setAttribute('aria-label', 'Vis kun valgte materialer')
  const toggleText = document.createElement('span')
  toggleText.textContent = 'Vis kun valgte'
  toggleLabel.appendChild(showOnlySelectedInput)
  toggleLabel.appendChild(toggleText)
  toolbar.appendChild(toggleLabel)

  const chipsDetails = document.createElement('details')
  chipsDetails.className = 'materials-v2__chips'
  const chipsSummary = document.createElement('summary')
  chipsSummary.textContent = 'Valgte materialer (0)'
  chipsDetails.appendChild(chipsSummary)
  const chipsContainer = document.createElement('div')
  chipsContainer.className = 'materials-v2__chips-list'
  chipsContainer.setAttribute('aria-label', 'Valgte materialer chips')
  chipsDetails.appendChild(chipsContainer)
  toolbar.appendChild(chipsDetails)

  let chipsManualOpen = false

  const linesWrapper = document.createElement('div')
  linesWrapper.className = 'materials-v2__grid'
  linesWrapper.setAttribute('role', 'table')
  linesWrapper.setAttribute('aria-label', 'Materialeliste')
  root.appendChild(linesWrapper)

  const headerRow = document.createElement('div')
  headerRow.className = 'materials-v2__row materials-v2__row--header'
  headerRow.setAttribute('role', 'row')
  const headerCells = [
    { key: 'name', label: 'Navn' },
    { key: 'quantity', label: 'Antal' },
    { key: 'price', label: 'Pris' },
    { key: 'total', label: 'Linjetotal' }
  ]
  headerCells.forEach(({ key, label }) => {
    const cell = document.createElement('div')
    cell.className = `materials-v2__cell materials-v2__cell--${key} materials-v2__cell--header`
    cell.id = `materials-v2__header-${key}`
    cell.setAttribute('role', 'columnheader')
    cell.textContent = label
    headerRow.appendChild(cell)
  })
  linesWrapper.appendChild(headerRow)

  const body = document.createElement('div')
  body.className = 'materials-v2__body'
  body.setAttribute('role', 'rowgroup')
  linesWrapper.appendChild(body)

  const footer = document.createElement('div')
  footer.className = 'materials-v2__footer'
  const totalLabel = document.createElement('span')
  totalLabel.textContent = 'Materialesum'
  const totalValue = document.createElement('strong')
  totalValue.textContent = '0,00'
  footer.appendChild(totalLabel)
  footer.appendChild(totalValue)
  root.appendChild(footer)

  const saveButton = document.createElement('button')
  saveButton.type = 'button'
  saveButton.textContent = 'Gem priser'
  saveButton.className = 'materials-v2__save'
  saveButton.disabled = !state.isAdmin
  saveButton.addEventListener('click', async () => {
    if (!state.isAdmin) return
    const diff = collectPriceDiff()
    saveButton.disabled = true
    saveButton.textContent = 'Gemmer…'
    try {
      await onSavePrices(diff)
      adminPanel.message.textContent = 'Priser gemt'
    } catch (error) {
      console.error('Kunne ikke gemme priser', error)
      adminPanel.message.textContent = 'Fejl ved gemning'
    } finally {
      saveButton.textContent = 'Gem priser'
      saveButton.disabled = !state.isAdmin
    }
  })
  root.appendChild(saveButton)

  function collectPriceDiff () {
    const updates = {}
    const removals = []
    state.lines.forEach(line => {
      if (line.type !== 'base') return
      const current = toDecimal(line.priceInput.value)
      const basePrice = line.basePrice
      const overridePrice = line.overridePrice
      const changedFromBase = Math.abs(current - basePrice) > 0.000001
      if (changedFromBase) {
        updates[line.id] = Math.round(current * 100) / 100
      } else if (typeof overridePrice === 'number') {
        removals.push(line.id)
      }
    })
    return { updates, removals }
  }

  function applyAdminState () {
    state.lines.forEach(line => {
      if (line.type === 'base' && line.priceInput) {
        line.priceInput.readOnly = !state.isAdmin
        line.priceInput.tabIndex = state.isAdmin ? 0 : -1
      }
    })
    saveButton.disabled = !state.isAdmin
  }

  function updateLineTotal (line) {
    const quantity = typeof line.quantity === 'number' ? line.quantity : 0
    const price = typeof line.price === 'number' ? line.price : 0
    const total = Math.round(quantity * price * 100) / 100
    line.total = total
    if (line.totalCell) {
      line.totalCell.textContent = toCurrency(total)
    }
  }

  function updateTotals () {
    let sum = 0
    state.lines.forEach(line => {
      if (line.total) {
        sum += line.total
      }
    })
    state.total = Math.round(sum * 100) / 100
    totalValue.textContent = toCurrency(state.total)
  }

  const handlers = {
    onLinesChange: () => {
      updateTotals()
      updateSelectedUI()
    },
    onQuantityChange: line => {
      line.quantity = toDecimal(line.qtyInput.value)
      updateLineTotal(line)
      updateTotals()
      updateSelectedUI()
      applyFilter()
    },
    onPriceChange: line => {
      line.price = toDecimal(line.priceInput.value)
      updateLineTotal(line)
      updateTotals()
    }
  }

  function getSelectedLines () {
    return state.lines.filter(line => {
      const quantity = typeof line.quantity === 'number' ? line.quantity : toDecimal(line.qtyInput?.value ?? 0)
      return quantity > 0
    })
  }

  function renderSelectedChips (selected) {
    chipsContainer.innerHTML = ''
    selected.forEach(line => {
      const chip = document.createElement('span')
      chip.className = 'materials-v2__chip'
      const name = getLineDisplayName(line)
      const qtyLabel = formatQuantityLabel(line)
      const text = `${name} — ${qtyLabel}`
      chip.textContent = text
      chip.title = text
      chipsContainer.appendChild(chip)
    })
  }

  function updateSelectedUI () {
    const selected = getSelectedLines()
    chipsSummary.textContent = `Valgte materialer (${selected.length})`
    if (chipsDetails.open || state.showOnlySelected) {
      renderSelectedChips(selected)
    } else {
      chipsContainer.innerHTML = ''
    }
  }

  function applyFilter () {
    state.lines.forEach(line => {
      if (!line.element) return
      const shouldShow = !state.showOnlySelected || (typeof line.quantity === 'number' ? line.quantity : 0) > 0
      if (shouldShow) {
        line.element.hidden = false
        line.element.removeAttribute('aria-hidden')
      } else {
        line.element.hidden = true
        line.element.setAttribute('aria-hidden', 'true')
      }
    })
  }

  showOnlySelectedInput.addEventListener('change', () => {
    state.showOnlySelected = showOnlySelectedInput.checked
    if (state.showOnlySelected) {
      chipsDetails.open = true
    } else {
      chipsDetails.open = chipsManualOpen
    }
    updateSelectedUI()
    applyFilter()
  })

  chipsDetails.addEventListener('toggle', () => {
    if (state.showOnlySelected && !chipsDetails.open) {
      chipsDetails.open = true
      updateSelectedUI()
      return
    }
    if (!state.showOnlySelected) {
      chipsManualOpen = chipsDetails.open
    }
    updateSelectedUI()
  })

  function addLine (lineData) {
    const line = {
      ...lineData,
      quantity: typeof lineData.quantity === 'number' ? lineData.quantity : 0,
      price: typeof lineData.price === 'number' ? lineData.price : 0,
      total: 0
    }
    const row = createLineRow(line, state, handlers)
    body.appendChild(row)
    line.element = row
    updateLineTotal(line)
    state.lines.push(line)
  }

  materials.forEach(item => {
    const overridePrice = Object.prototype.hasOwnProperty.call(overrides, item.id)
      ? overrides[item.id]
      : undefined
    const price = typeof overridePrice === 'number' ? overridePrice : item.price
    addLine({
      id: item.id,
      name: item.name,
      type: 'base',
      basePrice: item.price,
      overridePrice,
      price
    })
  })

  CUSTOM_LINE_IDS.forEach((id, index) => {
    addLine({
      id,
      name: `Brugerlinje ${index + 1}`,
      type: 'custom',
      price: 0,
      quantity: 0
    })
  })

  updateTotals()
  applyAdminState()
  updateSelectedUI()
  applyFilter()

  return {
    getLines () {
      return state.lines.map(line => ({
        id: line.id,
        name: line.type === 'base' ? line.name : (line.nameInput?.value || line.name || ''),
        quantity: toDecimal(line.qtyInput?.value ?? line.quantity ?? 0),
        price: toDecimal(line.priceInput?.value ?? line.price ?? 0),
        total: line.total || 0,
        type: line.type
      }))
    },
    getMaterialSum () {
      return state.total
    }
  }
}
