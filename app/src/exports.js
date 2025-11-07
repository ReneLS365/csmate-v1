// app/src/exports.js
export function requireSagsinfo(job) {
  const s = job?.sagsinfo || {}
  return !!(s.kunde && s.adresse && (s.sagsnr || s.sagsnummer || job?.sagsnr || job?.sagsnummer))
}

export function ts(fmt = 'YYYYMMDD-HHmm') {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return fmt
    .replace('YYYY', d.getFullYear())
    .replace('MM', p(d.getMonth() + 1))
    .replace('DD', p(d.getDate()))
    .replace('HH', p(d.getHours()))
    .replace('mm', p(d.getMinutes()))
}

export function downloadBlob(name, blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export function toCSV(rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  return rows.map(r => r.map(esc).join(',')).join('\n')
}

// Hook til eksisterende PDF-generator i appen:
// Forventede helpers: window.PDF.exportJobPDF(job, {allSystems:true|false})
export async function buildPDF(job, opts = { allSystems: true }) {
  if (!window.PDF || !window.PDF.exportJobPDF) {
    throw new Error('PDF engine missing: window.PDF.exportJobPDF')
  }
  return await window.PDF.exportJobPDF(job, opts)
}

export function buildMaterialCSV(job) {
  const rows = [['System', 'Vare', 'Antal', 'Pris', 'Linjetotal']]
  for (const sys of job.systems || []) {
    const systemName = sys?.name || sys?.systemName || sys?.id || 'Ukendt system'
    const materials = sys?.materialer || sys?.materials || []
    for (const line of materials) {
      const qty = Number(line?.antal ?? line?.quantity ?? 0)
      const price = Number(line?.pris ?? line?.price ?? 0)
      const total = Number.isFinite(qty * price) ? (qty * price).toFixed(2) : '0.00'
      rows.push([systemName, line?.navn ?? line?.name ?? '', qty, price, total])
    }
  }
  return new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' })
}

export function buildLønCSV(job) {
  const rows = [['System', 'Timer', 'Km', 'Tillæg%', 'Montage', 'Demontage', 'Sum']]
  for (const sys of job.systems || []) {
    const systemName = sys?.name || sys?.systemName || sys?.id || 'Ukendt system'
    const l = sys.loen || sys.løn || sys.labor || {}
    rows.push([
      systemName,
      l.timer ?? l.hours ?? 0,
      l.km ?? l.distance ?? 0,
      l.tillaegPct ?? l.tillægPct ?? l.extraPct ?? 0,
      l.montage ?? l.montagePris ?? l.montagePrice ?? 0,
      l.demontage ?? l.demontagePris ?? l.demontagePrice ?? 0,
      l.sum ?? l.total ?? 0
    ])
  }
  return new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' })
}

// Genbrug eksisterende E-komplet generator: window.EKOMPLET.exportCSV(job)
export function buildEkompletCSV(job) {
  if (!window.EKOMPLET || !window.EKOMPLET.exportCSV) {
    throw new Error('E-komplet engine missing: window.EKOMPLET.exportCSV')
  }
  const csv = window.EKOMPLET.exportCSV(job)
  return new Blob([csv], { type: 'text/csv;charset=utf-8' })
}

export async function exportAll(job) {
  if (!requireSagsinfo(job)) throw new Error('Mangler sagsinfo')
  const stamp = ts()
  const base = `job-${job.id || 'ukendt'}-${stamp}`

  const pdfBlob = await buildPDF(job, { allSystems: true })
  const matCSV = buildMaterialCSV(job)
  const lonCSV = buildLønCSV(job)
  const ekCSV = buildEkompletCSV(job)

  if (window.JSZip) {
    const zip = new window.JSZip()
    zip.file(`${base}.pdf`, pdfBlob)
    zip.file(`${base}-materialer.csv`, matCSV)
    zip.file(`${base}-løn.csv`, lonCSV)
    zip.file(`${base}-ekomplet.csv`, ekCSV)
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(`${base}.zip`, blob)
  } else {
    downloadBlob(`${base}.pdf`, pdfBlob)
    downloadBlob(`${base}-materialer.csv`, matCSV)
    downloadBlob(`${base}-løn.csv`, lonCSV)
    downloadBlob(`${base}-ekomplet.csv`, ekCSV)
  }
}

export async function exportSingleSheet(job, systemName) {
  const systems = job.systems || []
  const sys = systems.find(s => (s?.name || s?.systemName || s?.id) === systemName)
  if (!sys) throw new Error('System ikke fundet')
  const stamp = ts()
  const base = `job-${job.id || 'ukendt'}-${systemName}-${stamp}`

  const pdf = await buildPDF({ ...job, systems: [sys] }, { allSystems: false })
  const matRows = [['Vare', 'Antal', 'Pris', 'Linjetotal']]
  for (const l of sys.materialer || sys.materials || []) {
    const qty = Number(l?.antal ?? l?.quantity ?? 0)
    const price = Number(l?.pris ?? l?.price ?? 0)
    const total = Number.isFinite(qty * price) ? (qty * price).toFixed(2) : '0.00'
    matRows.push([l?.navn ?? l?.name ?? '', qty, price, total])
  }
  const mat = new Blob([toCSV(matRows)], { type: 'text/csv;charset=utf-8' })

  downloadBlob(`${base}.pdf`, pdf)
  downloadBlob(`${base}-materialer.csv`, mat)
  return { base }
}
