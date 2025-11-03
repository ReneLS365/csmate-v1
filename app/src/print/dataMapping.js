const NUMBER_FORMATTER = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const QTY_FORMATTER = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 2 })

function toNumber (value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function formatCurrency (value) {
  return NUMBER_FORMATTER.format(toNumber(value))
}

function formatQty (value) {
  return QTY_FORMATTER.format(toNumber(value))
}

function getState () {
  if (typeof window === 'undefined') return {}
  const state = window.__APP_STATE__
  return state && typeof state === 'object' ? state : {}
}

function ensureLines (raw) {
  if (Array.isArray(raw)) return raw
  if (raw && Array.isArray(raw.lines)) return raw.lines
  return []
}

function normaliseLine (entry) {
  if (!entry || typeof entry !== 'object') return null
  const qty = toNumber(entry.antal ?? entry.qty ?? entry.quantity)
  if (qty <= 0) return null
  const unitPrice = toNumber(entry.pris ?? entry.price ?? entry.unitPrice)
  const total = Number((unitPrice * qty).toFixed(2))
  const varenr = String(entry.varenr ?? entry.code ?? entry.id ?? '')
  if (!varenr) return null
  return {
    varenr,
    navn: entry.navn ?? entry.name ?? '',
    enhed: entry.enhed ?? entry.unit ?? '',
    pris: formatCurrency(unitPrice),
    antal: formatQty(qty),
    sum: formatCurrency(total),
    __unitPrice: unitPrice,
    __quantity: qty,
    __total: total
  }
}

function normaliseExtras (raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map(entry => ({
        label: String(entry?.label ?? entry?.navn ?? 'Ekstra'),
        sum: toNumber(entry?.sum ?? entry?.total)
      }))
      .filter(entry => entry.label)
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([label, value]) => ({
      label,
      sum: toNumber(value?.sum ?? value)
    }))
  }
  return []
}

function shouldIncludeDemontage (state) {
  if (typeof state.includeDemontage === 'boolean') return state.includeDemontage
  const jobType = String(state.jobType || state?.sagsinfo?.jobType || '').toLowerCase()
  return jobType === 'demontage' || jobType === 'montage+demontage'
}

function resolveInfo (state, key) {
  const info = state.sagsinfo || {}
  switch (key) {
    case 'firma':
      return state.firma || info.kunde || state.companyName || ''
    case 'projekt':
      return state.projekt || info.navn || state.projectName || ''
    case 'adresse':
      return state.adresse || info.adresse || state.address || ''
    case 'sagsnr':
      return state.sagsnr || info.sagsnummer || state.caseNumber || ''
    default:
      return ''
  }
}

function resolveDate (state) {
  const source = state.dagsdato || state?.sagsinfo?.dato || state.dato || state.date
  if (source instanceof Date) {
    return new Intl.DateTimeFormat('da-DK').format(source)
  }
  if (typeof source === 'string' && source.trim()) {
    const parsed = new Date(source)
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('da-DK').format(parsed)
    }
    return source
  }
  return new Intl.DateTimeFormat('da-DK').format(new Date())
}

export function buildPrintableDataForSystem (system) {
  const state = getState()
  const cart = ensureLines(state?.cart?.[system])
  const lines = cart
    .map(entry => normaliseLine(entry))
    .filter(entry => Boolean(entry))

  const materialSum = lines.reduce((sum, line) => sum + toNumber(line.__total), 0)
  const montage = materialSum
  const demontage = shouldIncludeDemontage(state) ? materialSum * 0.5 : 0
  const extras = normaliseExtras(state?.extras)
  const extrasTotal = extras.reduce((sum, entry) => sum + toNumber(entry.sum), 0)
  const total = materialSum + montage + demontage + extrasTotal

  const totals = [
    { label: 'Materialer', value: `${formatCurrency(materialSum)} kr` },
    { label: 'Montage', value: `${formatCurrency(montage)} kr` }
  ]
  if (demontage > 0) {
    totals.push({ label: 'Demontage', value: `${formatCurrency(demontage)} kr` })
  }
  totals.push({ label: 'Ekstraarbejde', value: `${formatCurrency(extrasTotal)} kr` })
  totals.push({ label: 'I alt', value: `${formatCurrency(total)} kr` })

  return {
    firma: resolveInfo(state, 'firma'),
    projekt: resolveInfo(state, 'projekt'),
    adresse: resolveInfo(state, 'adresse'),
    sagsnr: resolveInfo(state, 'sagsnr'),
    dagsdato: resolveDate(state),
    system: String(system || '').toUpperCase(),
    linjer: lines.map(({ __total, __quantity, __unitPrice, ...rest }) => rest),
    totaler: totals,
    extras,
    wage: toNumber(state?.wage ?? state?.loensum ?? state?.lonSum, undefined),
    materialSum,
    montage,
    demontage,
    extrasTotal,
    total
  }
}
