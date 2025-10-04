import { buildEKompletRows, rowsToCsv, rowsToJson, rowsToZipBlob } from '../lib/e-komplet/export.js'
import { parseCsv, inferMapping, needsMapping, applyMapping, loadSavedMapping, persistMapping, mergeRowsWithSag } from '../lib/e-komplet/import.js'
import { validateRows } from '../lib/e-komplet/validate.js'
import { CSV_HEADERS } from '../lib/e-komplet/schema.js'
import { saveTimeRows, loadTimeRows, savePriceBreakdown, loadPriceBreakdown, saveSagsinfo, loadSagsinfo, exportProject, importProject, saveBackup } from '../lib/e-komplet/storage.js'

export class EKompletPanel {
  constructor ({ container, getSag, getPriceBreakdown, getTimeRows }) {
    this.container = container
    this.getSag = getSag
    this.getPriceBreakdown = getPriceBreakdown
    this.getTimeRows = getTimeRows
    this.state = {
      rows: [],
      validation: { ok: true, errors: [] },
      mapping: loadSavedMapping()
    }
    this.pendingImport = null
    this._build()
    this.refresh()
    this._startBackup()
  }

  _build () {
    this.container.classList.add('csmate-e-komplet')
    this.container.innerHTML = ''

    const header = document.createElement('header')
    header.innerHTML = '<h2>Del til E-Komplet</h2>'
    this.container.append(header)

    const actions = document.createElement('div')
    actions.className = 'csmate-ek-actions'

    this.downloadCsvBtn = createButton('Download CSV', () => this._downloadCsv())
    this.downloadJsonBtn = createButton('Download JSON', () => this._downloadJson())
    this.downloadZipBtn = createButton('Download ZIP', () => this._downloadZip())
    this.copyCsvBtn = createButton('Kopiér CSV', () => this._copyCsv())

    actions.append(this.downloadCsvBtn, this.downloadJsonBtn, this.downloadZipBtn, this.copyCsvBtn)
    this.container.append(actions)

    this.preview = document.createElement('div')
    this.preview.className = 'csmate-ek-preview'
    this.container.append(this.preview)

    this.validationEl = document.createElement('div')
    this.validationEl.className = 'csmate-ek-validation'
    this.container.append(this.validationEl)

    const importSection = document.createElement('section')
    importSection.className = 'csmate-ek-import'
    importSection.innerHTML = `
      <h3>Hent fra E-Komplet</h3>
      <input type="file" accept=".csv" class="csmate-ek-file" hidden>
      <button type="button" class="csmate-ek-upload">Vælg CSV</button>
      <div class="csmate-ek-mapping"></div>
      <div class="csmate-ek-import-status" aria-live="polite"></div>
      <div class="csmate-ek-project">
        <button type="button" class="csmate-ek-export-project">Download projekt (.csmate.json)</button>
        <label class="csmate-ek-import-project">
          <span>Importer projekt</span>
          <input type="file" accept=".json" hidden>
        </label>
      </div>
    `
    this.container.append(importSection)
    this.fileInput = importSection.querySelector('.csmate-ek-file')
    this.mappingEl = importSection.querySelector('.csmate-ek-mapping')
    this.statusEl = importSection.querySelector('.csmate-ek-import-status')

    importSection.querySelector('.csmate-ek-upload').addEventListener('click', () => this.fileInput.click())
    this.fileInput.addEventListener('change', event => {
      const file = event.target.files[0]
      if (file) this._handleImport(file)
    })

    importSection.querySelector('.csmate-ek-export-project').addEventListener('click', () => this._downloadProject())
    importSection.querySelector('.csmate-ek-import-project input').addEventListener('change', event => {
      const file = event.target.files[0]
      if (file) this._handleProjectImport(file)
    })
  }

  refresh () {
    const sag = this.getSag()
    if (sag) saveSagsinfo(sag)
    const price = this.getPriceBreakdown()
    if (price) savePriceBreakdown(price)
    const timeRows = this.getTimeRows() || []
    if (timeRows.length) saveTimeRows(timeRows)

    const rows = buildEKompletRows(sag, price, timeRows.length ? timeRows : loadTimeRows())
    this.state.rows = rows
    this.state.validation = validateRows(rows)
    this._renderPreview()
    this._renderValidation()
  }

  _renderPreview () {
    const rows = this.state.rows
    if (!rows.length) {
      this.preview.innerHTML = '<p>Ingen data endnu.</p>'
      return
    }
    const table = document.createElement('table')
    table.innerHTML = `
      <thead>
        <tr>${rows.length ? Object.keys(rows[0]).map(h => `<th>${h}</th>`).join('') : ''}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `<tr>${Object.keys(row).map(h => `<td>${escapeHtml(row[h])}</td>`).join('')}</tr>`).join('')}
      </tbody>
    `
    this.preview.innerHTML = ''
    this.preview.append(table)
  }

  _renderValidation () {
    const { ok, errors } = this.state.validation
    if (ok) {
      this.validationEl.innerHTML = '<p class="ok">✅ Klar til eksport</p>'
    } else {
      const items = errors.map(err => `<li>Linje ${err.index + 2}: ${err.message} (${err.field})</li>`).join('')
      this.validationEl.innerHTML = `<div class="errors"><p>❌ Fejl fundet:</p><ul>${items}</ul></div>`
    }
  }

  async _downloadCsv () {
    await this._download(rowsToCsv(this.state.rows), 'text/csv;charset=utf-8', 'csmate-e-komplet.csv')
  }

  async _downloadJson () {
    await this._download(rowsToJson(this.state.rows), 'application/json', 'csmate-e-komplet.json')
  }

  async _downloadZip () {
    const blob = rowsToZipBlob(this.state.rows)
    downloadBlob(blob, 'csmate-e-komplet.zip')
  }

  downloadCsv () {
    return this._downloadCsv()
  }

  downloadJson () {
    return this._downloadJson()
  }

  downloadZip () {
    return this._downloadZip()
  }

  async _copyCsv () {
    const csv = rowsToCsv(this.state.rows)
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(csv)
        this.statusEl.textContent = 'CSV kopieret til udklipsholder.'
      } else {
        throw new Error('Clipboard ikke understøttet')
      }
    } catch (err) {
      this.statusEl.textContent = 'Kunne ikke kopiere automatisk. Download i stedet.'
    }
  }

  async _download (content, mime, filename) {
    const blob = new Blob([content], { type: mime })
    downloadBlob(blob, filename)
  }

  async _handleImport (file) {
    const { headers, rows } = await parseCsv(file)
    if (!headers.length) {
      this.statusEl.textContent = 'Kunne ikke læse filen.'
      return
    }
    let mapping = this.state.mapping
    if (needsMapping(headers)) {
      mapping = { ...mapping, ...inferMapping(headers) }
      this.pendingImport = { headers, rows }
      this._renderMapping(headers, mapping)
      this.statusEl.textContent = 'Vælg kolonner for at fortsætte.'
      return
    }
    this._applyImportedRows(headers, rows, mapping)
  }

  _renderMapping (headers, mapping) {
    this.mappingEl.innerHTML = ''
    const fragment = document.createDocumentFragment()
    headers.forEach(header => {
      const field = document.createElement('div')
      field.className = 'csmate-ek-map-row'
      const label = document.createElement('label')
      label.textContent = header
      const select = document.createElement('select')
      select.dataset.source = header
      select.innerHTML = '<option value="">–</option>' + CSV_HEADERS.map(h => `<option value="${h}">${h}</option>`).join('')
      if (mapping) {
        const target = Object.keys(mapping).find(key => mapping[key] === header)
        if (target) select.value = target
      }
      select.addEventListener('change', () => {
        const currentMapping = {}
        this.mappingEl.querySelectorAll('select').forEach(sel => {
          if (sel.value) currentMapping[sel.value] = sel.dataset.source
        })
        this.state.mapping = currentMapping
        persistMapping(currentMapping)
        const complete = CSV_HEADERS.every(headerName => currentMapping[headerName])
        if (complete && this.pendingImport) {
          this._applyImportedRows(this.pendingImport.headers, this.pendingImport.rows, currentMapping)
          this.pendingImport = null
          this.mappingEl.innerHTML = ''
        }
      })
      field.append(label, select)
      fragment.append(field)
    })
    this.mappingEl.append(fragment)
  }

  _applyImportedRows (headers, rows, mapping) {
    const applied = applyMapping(rows, mapping)
    const sag = this.getSag() || loadSagsinfo() || {}
    const merged = mergeRowsWithSag(applied, sag)
    saveTimeRows(merged.timeRows)
    if (merged.akkord) {
      savePriceBreakdown({ ...loadPriceBreakdown(), akkordAmount: merged.akkord.AkkordAmount })
    }
    this.statusEl.textContent = 'Importerede ' + applied.length + ' linjer.'
    this.mappingEl.innerHTML = ''
    this.pendingImport = null
    this.refresh()
  }

  async _handleProjectImport (file) {
    const text = await file.text()
    if (importProject(text)) {
      this.statusEl.textContent = 'Projekt importeret.'
      this.refresh()
    } else {
      this.statusEl.textContent = 'Kunne ikke importere projekt.'
    }
  }

  _downloadProject () {
    const content = exportProject()
    this._download(content, 'application/json', 'projekt.csmate.json')
  }

  _startBackup () {
    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        saveBackup()
      }, 30000)
    }
  }
}

function createButton (label, handler) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = label
  btn.addEventListener('click', handler)
  return btn
}

function downloadBlob (blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeHtml (value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char] || char)
}
