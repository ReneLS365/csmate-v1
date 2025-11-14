import { normalizeKey } from '../string-utils.js'

const EXCLUDED_MATERIAL_NAMES = [
  'udd. tillæg 1',
  'udd. tillæg 2',
  'mentortillæg',
  'km.',
  'kilometer',
  'huller',
  'luk af hul',
  'boring i beton'
]

export const EXCLUDED_MATERIAL_KEYS = EXCLUDED_MATERIAL_NAMES
  .map(name => normalizeKey(name))
  .filter(Boolean)

export function shouldExcludeMaterialEntry (entry) {
  if (!entry) return false

  const resolveKey = value => normalizeKey(String(value ?? '').trim())

  const rawName = entry.beskrivelse ?? entry.navn ?? entry.name ?? ''
  const nameKey = resolveKey(rawName)
  if (nameKey && EXCLUDED_MATERIAL_KEYS.includes(nameKey)) {
    return true
  }

  const rawId = entry.varenr ?? entry.id ?? ''
  const idKey = resolveKey(rawId)
  if (idKey && EXCLUDED_MATERIAL_KEYS.includes(idKey)) {
    return true
  }

  return false
}
