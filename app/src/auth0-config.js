const PUBLIC_CONFIG_KEY = '__CSMATE_PUBLIC_CONFIG__'

function readConfigValue (key) {
  if (!key) return undefined

  if (typeof window !== 'undefined') {
    const publicConfig = window[PUBLIC_CONFIG_KEY]
    if (publicConfig && typeof publicConfig[key] === 'string') {
      const trimmed = publicConfig[key].trim()
      if (trimmed) return trimmed
    }
  }

  if (typeof process !== 'undefined' && process?.env && typeof process.env[key] === 'string') {
    const trimmed = process.env[key].trim()
    if (trimmed) return trimmed
  }

  return undefined
}

function readConfigList (key) {
  const value = readConfigValue(key)
  if (typeof value !== 'string' || value.length === 0) return []
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)
}

export const AUTH0_DOMAIN = readConfigValue('AUTH0_DOMAIN') || ''
export const AUTH0_CLIENT_ID = readConfigValue('AUTH0_CLIENT_ID') || ''
export const AUTH0_REDIRECT_URI = readConfigValue('AUTH0_REDIRECT_URI') || (typeof window !== 'undefined' ? window.location.origin : '')

const ownerEmails = readConfigList('OWNER_EMAILS').map(email => email.toLowerCase())

export const OWNER_EMAILS = Object.freeze(ownerEmails)

export function isOwnerEmail (email) {
  if (typeof email !== 'string' || email.trim().length === 0) return false
  return OWNER_EMAILS.includes(email.trim().toLowerCase())
}
