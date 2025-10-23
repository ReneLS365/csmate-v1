const DIACRITIC_REGEX = /[\u0300-\u036f]/g
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9]/g

export function normalizeKey (value) {
  if (value == null) return ''
  const lower = String(value).toLowerCase()
  const canNormalize = typeof String.prototype.normalize === 'function'
  const normalized = canNormalize ? lower.normalize('NFD') : lower
  const stripped = canNormalize ? normalized.replace(DIACRITIC_REGEX, '') : normalized
  return stripped.replace(NON_ALPHANUMERIC_REGEX, '')
}

export function normalizeKeys (values) {
  if (!Array.isArray(values)) return []
  return values.map(value => normalizeKey(value))
}

export const __PRIVATE_STRING_UTILS__ = {
  DIACRITIC_REGEX,
  NON_ALPHANUMERIC_REGEX
}
