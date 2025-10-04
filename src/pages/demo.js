import { Numpad } from '../ui/numpad.js'
import { EKompletPanel } from '../ui/e-komplet-panel.js'
import { initialiseDiagnostics } from '../ui/diagnostics.js'
import { loadSagsinfo, saveSagsinfo, loadTimeRows, saveTimeRows, loadPriceBreakdown, savePriceBreakdown } from '../lib/e-komplet/storage.js'

const form = document.getElementById('sagsinfoForm')
const fields = {
  sagsnummer: document.getElementById('sagsnummer'),
  opgave: document.getElementById('opgave'),
  adresse: document.getElementById('adresse'),
  kunde: document.getElementById('kunde'),
  dato: document.getElementById('dato'),
  montoer: document.getElementById('montoer')
}

const buttons = {
  eksport: document.getElementById('btn-export-e-komplet'),
  csv: document.getElementById('btn-export-pdf-csv'),
  print: document.getElementById('btn-print')
}

const timeTableBody = document.querySelector('#timeTable tbody')
const addTimeBtn = document.getElementById('addTimeRow')
const akkordInput = document.getElementById('akkordAmount')

const numpad = new Numpad({ root: document.body })
const calc = numpad.calc
let panel = null

let timeRows = loadTimeRows() || []
let priceBreakdown = loadPriceBreakdown() || { akkordAmount: 0 }

if (!Array.isArray(timeRows)) timeRows = []
if (typeof priceBreakdown !== 'object' || priceBreakdown === null) priceBreakdown = { akkordAmount: 0 }
if (priceBreakdown.akkordAmount != null) {
  akkordInput.value = Number(priceBreakdown.akkordAmount) || 0
}

const savedSagsinfo = loadSagsinfo()
if (savedSagsinfo) {
  Object.entries(fields).forEach(([key, input]) => {
    if (savedSagsinfo[key]) input.value = savedSagsinfo[key]
  })
}

function getSag () {
  return {
    sagsnummer: fields.sagsnummer.value.trim(),
    opgave: fields.opgave.value.trim(),
    adresse: fields.adresse.value.trim(),
    kunde: fields.kunde.value.trim(),
    dato: fields.dato.value,
    montoer: fields.montoer.value.trim()
  }
}

function allSagsinfoFilled () {
  return Object.values(fields).every(input => input.value && input.value.trim() !== '')
}

function updateButtons () {
  const ready = allSagsinfoFilled()
  Object.values(buttons).forEach(btn => {
    btn.disabled = !ready
  })
}

function refreshPanel () {
  if (panel) panel.refresh()
}

function persistSagsinfo () {
  const sag = getSag()
  saveSagsinfo(sag)
  updateButtons()
  refreshPanel()
}

function formatNumber (value) {
  const num = Number.parseFloat(value)
  if (!Number.isFinite(num)) return '0'
  return String(Math.round(num * 100) / 100)
}

function renderTimeRows () {
  timeTableBody.innerHTML = ''
  timeRows.forEach((row, index) => {
    const tr = document.createElement('tr')

    const nameTd = document.createElement('td')
    const nameInput = document.createElement('input')
    nameInput.type = 'text'
    nameInput.value = row.employeeName || ''
    nameInput.addEventListener('input', () => {
      row.employeeName = nameInput.value
      saveTimeRows(timeRows)
      refreshPanel()
    })
    nameTd.append(nameInput)

    const dateTd = document.createElement('td')
    const dateInput = document.createElement('input')
    dateInput.type = 'date'
    dateInput.value = row.date || ''
    dateInput.addEventListener('input', () => {
      row.date = dateInput.value
      saveTimeRows(timeRows)
      refreshPanel()
    })
    dateTd.append(dateInput)

    const hoursTd = document.createElement('td')
    const hoursInput = document.createElement('input')
    hoursInput.type = 'text'
    hoursInput.inputMode = 'decimal'
    hoursInput.className = 'qty-input'
    hoursInput.value = row.hours != null ? formatNumber(row.hours) : '0'
    hoursInput.addEventListener('focus', () => {
      numpad.enterAugmentMode({
        base: Number(hoursInput.value) || 0,
        targetEl: hoursInput,
        onCommit: value => {
          row.hours = Number(value)
          hoursInput.value = formatNumber(row.hours)
          saveTimeRows(timeRows)
          refreshPanel()
        }
      })
    })
    hoursInput.addEventListener('input', () => {
      row.hours = Number(hoursInput.value)
      saveTimeRows(timeRows)
      refreshPanel()
    })
    hoursTd.append(hoursInput)

    const wageTd = document.createElement('td')
    const wageSelect = document.createElement('select')
    ;['Normal', 'OT50', 'OT100'].forEach(option => {
      const opt = document.createElement('option')
      opt.value = option
      opt.textContent = option
      wageSelect.append(opt)
    })
    wageSelect.value = row.wageType || 'Normal'
    wageSelect.addEventListener('change', () => {
      row.wageType = wageSelect.value
      saveTimeRows(timeRows)
      refreshPanel()
    })
    wageTd.append(wageSelect)

    const removeTd = document.createElement('td')
    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.textContent = '✕'
    removeBtn.setAttribute('aria-label', 'Fjern linje')
    removeBtn.addEventListener('click', () => {
      timeRows.splice(index, 1)
      saveTimeRows(timeRows)
      renderTimeRows()
      refreshPanel()
    })
    removeTd.append(removeBtn)

    tr.append(nameTd, dateTd, hoursTd, wageTd, removeTd)
    timeTableBody.append(tr)
  })
}

addTimeBtn.addEventListener('click', () => {
  timeRows.push({ employeeName: '', date: fields.dato.value || '', hours: 0, wageType: 'Normal' })
  saveTimeRows(timeRows)
  renderTimeRows()
  refreshPanel()
})

akkordInput.addEventListener('focus', () => {
  numpad.enterAugmentMode({
    base: Number(akkordInput.value) || 0,
    targetEl: akkordInput,
    onCommit: value => {
      priceBreakdown.akkordAmount = Number(value)
      akkordInput.value = formatNumber(priceBreakdown.akkordAmount)
      savePriceBreakdown(priceBreakdown)
      refreshPanel()
    }
  })
})

akkordInput.addEventListener('input', () => {
  priceBreakdown.akkordAmount = Number(akkordInput.value)
  savePriceBreakdown(priceBreakdown)
  refreshPanel()
})

form.addEventListener('input', persistSagsinfo)
fields.montoer.addEventListener('blur', () => {
  const names = fields.montoer.value.split(/[,;\n]+/).map(name => name.trim()).filter(Boolean)
  if (names.length) {
    names.forEach(name => {
      if (!timeRows.find(row => row.employeeName === name)) {
        timeRows.push({ employeeName: name, date: fields.dato.value || '', hours: 0, wageType: 'Normal' })
      }
    })
    saveTimeRows(timeRows)
    renderTimeRows()
    refreshPanel()
  }
})

buttons.eksport.addEventListener('click', () => {
  refreshPanel()
  document.getElementById('eKompletPanel').scrollIntoView({ behavior: 'smooth', block: 'start' })
})

buttons.csv.addEventListener('click', () => {
  refreshPanel()
  panel.downloadCsv()
})

buttons.print.addEventListener('click', () => {
  window.print()
})

renderTimeRows()
updateButtons()

panel = new EKompletPanel({
  container: document.getElementById('eKompletPanel'),
  getSag,
  getPriceBreakdown: () => priceBreakdown,
  getTimeRows: () => timeRows
})

persistSagsinfo()
initialiseDiagnostics({ calc, panel, numpad, root: document.body }).catch(() => {})
