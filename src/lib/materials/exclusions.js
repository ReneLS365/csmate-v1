import { normalizeKey } from '../string-utils.js'

export const EXCLUDED_MATERIAL_NAMES = [
  'Luk af hul',
  'Opskydeligt rækværk',
  'Borring i beton',
  'Huller',
  'Km.',
  'Udd. tillæg 1',
  'Udd. tillæg 2',
  'Mentortillæg'
]

export const EXCLUDED_MATERIAL_KEYS = EXCLUDED_MATERIAL_NAMES.map(name => normalizeKey(name))

export function shouldExcludeMaterialEntry (entry) {
  if (!entry) return false
  const { id, name } = entry
  const candidateKeys = [normalizeKey(name), normalizeKey(id)]
  return candidateKeys.some(key => key && EXCLUDED_MATERIAL_KEYS.includes(key))
}
