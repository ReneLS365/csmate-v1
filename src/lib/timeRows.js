const KEY_ALIASES = {
  employeeid: 'employeeId',
  medarbejderid: 'employeeId',
  id: 'employeeId',
  employeename: 'employeeName',
  medarbejder: 'employeeName',
  name: 'employeeName',
  dato: 'date',
  date: 'date',
  timer: 'hours',
  hours: 'hours',
  time: 'hours',
  wagetype: 'wageType',
  wage: 'wageType',
  type: 'wageType',
  notes: 'notes',
  bemaerkning: 'notes'
}

const FALLBACK_DIACRITICS = {
  à: 'a',
  á: 'a',
  â: 'a',
  ã: 'a',
  ä: 'a',
  å: 'a',
  ā: 'a',
  ă: 'a',
  ą: 'a',
  æ: 'ae',
  ç: 'c',
  ć: 'c',
  ĉ: 'c',
  ċ: 'c',
  č: 'c',
  ď: 'd',
  đ: 'd',
  ð: 'd',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ē: 'e',
  ė: 'e',
  ę: 'e',
  ĝ: 'g',
  ğ: 'g',
  ġ: 'g',
  ģ: 'g',
  ĥ: 'h',
  ħ: 'h',
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  ĩ: 'i',
  ī: 'i',
  į: 'i',
  ı: 'i',
  ĵ: 'j',
  ķ: 'k',
  ĸ: 'k',
  ĺ: 'l',
  ļ: 'l',
  ľ: 'l',
  ł: 'l',
  ñ: 'n',
  ń: 'n',
  ň: 'n',
  ŉ: 'n',
  ņ: 'n',
  ò: 'o',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ö: 'o',
  ø: 'o',
  ō: 'o',
  ő: 'o',
  œ: 'oe',
  ŕ: 'r',
  ŗ: 'r',
  ř: 'r',
  ś: 's',
  ŝ: 's',
  ş: 's',
  š: 's',
  ß: 'ss',
  ţ: 't',
  ť: 't',
  ŧ: 't',
  ù: 'u',
  ú: 'u',
  û: 'u',
  ü: 'u',
  ũ: 'u',
  ū: 'u',
  ŭ: 'u',
  ů: 'u',
  ű: 'u',
  ų: 'u',
  ŵ: 'w',
  ý: 'y',
  ÿ: 'y',
  ŷ: 'y',
  ź: 'z',
  ż: 'z',
  ž: 'z'
}

const NON_ASCII_CHARS = /[^\0-\x7E]/g

function stripDiacritics (value) {
  if (typeof String.prototype.normalize === 'function') {
    try {
      return value.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    } catch (error) {
      // older engines may expose normalize but not support NFD; fall back to manual map
    }
  }

  return value.replace(NON_ASCII_CHARS, ch => FALLBACK_DIACRITICS[ch] ?? ch)
}

function normaliseKey (name) {
  const lower = String(name ?? '').toLowerCase()
  const stripped = stripDiacritics(lower)
  return stripped.replace(/[^a-z0-9]/g, '')
}

export function toUiTimeRow (row = {}) {
  const normalized = {}

  Object.entries(row).forEach(([key, value]) => {
    const normKey = normaliseKey(key)
    if (!normKey) return

    const targetKey = KEY_ALIASES[normKey] || normKey
    if (!Object.prototype.hasOwnProperty.call(normalized, targetKey)) {
      normalized[targetKey] = value
    }
  })

  return {
    employeeId: normalized.employeeId ?? '',
    employeeName: normalized.employeeName ?? '',
    date: normalized.date ?? '',
    hours: Number.parseFloat(normalized.hours ?? 0) || 0,
    wageType: normalized.wageType && normalized.wageType !== '' ? normalized.wageType : 'Normal',
    notes: normalized.notes ?? ''
  }
}
