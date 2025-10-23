import { CSV_HEADERS, normaliseDate, toNumber } from './schema.js'

function baseRowFromSag (sag = {}) {
  return {
    ProjectId: sag.sagsnummer || sag.projectId || '',
    ProjectName: sag.opgave || sag.projectName || '',
    EmployeeId: '',
    EmployeeName: '',
    Date: normaliseDate(sag.dato),
    TaskCode: sag.taskCode || '',
    WageType: 'Normal',
    Hours: 0,
    AkkordAmount: 0,
    Notes: sag.bemaerkning || sag.notes || ''
  }
}

export function buildEKompletRows (sag = {}, priceBreakdown = {}, timeRows = []) {
  const rows = []
  const base = baseRowFromSag(sag)
  const normalizedTimeRows = Array.isArray(timeRows) ? timeRows : []
  normalizedTimeRows.forEach(entry => {
    const row = { ...base }
    row.Type = 'TIME'
    row.EmployeeId = entry.employeeId || entry.id || ''
    row.EmployeeName = entry.employeeName || entry.name || ''
    row.Date = normaliseDate(entry.date || base.Date)
    row.TaskCode = entry.taskCode || base.TaskCode
    row.WageType = entry.wageType && entry.wageType !== '' ? entry.wageType : 'Normal'
    row.Hours = Number.parseFloat(String(entry.hours ?? entry.time ?? 0)) || 0
    row.AkkordAmount = ''
    row.Notes = entry.notes || row.Notes
    rows.push(row)
  })

  const akkordAmount = toNumber(priceBreakdown.akkordAmount ?? priceBreakdown.total ?? priceBreakdown.amount)
  if (akkordAmount !== 0 || !rows.length) {
    const row = { ...base }
    row.Type = 'AKKORD'
    row.EmployeeId = priceBreakdown.employeeId || ''
    row.EmployeeName = priceBreakdown.employeeName || ''
    row.Date = normaliseDate(priceBreakdown.date || base.Date)
    row.AkkordAmount = Number(akkordAmount.toFixed(2))
    row.Hours = ''
    row.TaskCode = priceBreakdown.taskCode || row.TaskCode
    row.Notes = priceBreakdown.notes || row.Notes
    rows.push(row)
  }

  return rows
}

function escapeValue (value) {
  const str = value == null ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

export function rowsToCsv (rows) {
  const head = CSV_HEADERS.join(',')
  const body = rows.map(row => CSV_HEADERS.map(h => escapeValue(row[h])).join(',')).join('\n')
  return `\ufeff${head}\n${body}\n`
}

export function rowsToJson (rows) {
  return JSON.stringify(rows, null, 2)
}

function encodeUtf8 (str) {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

// Minimal ZIP writer (stored entries only)
function buildZipEntries (files) {
  const entries = []
  let offset = 0
  files.forEach((file, index) => {
    const data = encodeUtf8(file.content)
    const nameBytes = encodeUtf8(file.name)
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(localHeader.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 10, true)
    view.setUint16(6, 0, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, 0, true)
    const crc = crc32(data)
    view.setUint32(14, crc, true)
    view.setUint32(18, data.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)
    entries.push({ localHeader, data, offset, nameBytes, crc, index })
    offset += localHeader.length + data.length
  })
  return entries
}

function buildCentralDirectory (entries) {
  const chunks = []
  let size = 0
  entries.forEach(entry => {
    const { data, offset, nameBytes, crc } = entry
    const central = new Uint8Array(46 + nameBytes.length)
    const view = new DataView(central.buffer)
    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, 10, true)
    view.setUint16(6, 10, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, 0, true)
    view.setUint16(14, 0, true)
    view.setUint16(16, 0, true)
    view.setUint32(18, crc, true)
    view.setUint32(22, data.length, true)
    view.setUint32(26, data.length, true)
    view.setUint16(30, nameBytes.length, true)
    view.setUint16(32, 0, true)
    view.setUint16(34, 0, true)
    view.setUint16(36, 0, true)
    view.setUint16(38, 0, true)
    view.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    chunks.push(central)
    size += central.length
  })
  return { chunks, size }
}

function buildEndOfCentralDirectory (entries, centralSize, centralOffset) {
  const buffer = new Uint8Array(22)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(4, 0, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, entries.length, true)
  view.setUint16(10, entries.length, true)
  view.setUint32(12, centralSize, true)
  view.setUint32(16, centralOffset, true)
  view.setUint16(20, 0, true)
  return buffer
}

export function rowsToZipBlob (rows, { csvName = 'e-komplet.csv', jsonName = 'e-komplet.json' } = {}) {
  const csv = rowsToCsv(rows)
  const json = rowsToJson(rows)
  const files = [
    { name: csvName, content: csv },
    { name: jsonName, content: json }
  ]
  const entries = buildZipEntries(files)
  const blobs = []
  entries.forEach(entry => {
    blobs.push(entry.localHeader)
    blobs.push(entry.data)
  })
  const central = buildCentralDirectory(entries)
  central.chunks.forEach(chunk => blobs.push(chunk))
  const centralOffset = entries.reduce((acc, entry) => acc + entry.localHeader.length + entry.data.length, 0)
  blobs.push(buildEndOfCentralDirectory(entries, central.size, centralOffset))
  return new Blob(blobs, { type: 'application/zip' })
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32 (bytes) {
  let crc = ~0
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (~crc) >>> 0
}
