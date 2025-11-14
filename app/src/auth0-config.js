const PUBLIC_CONFIG_KEY = '__CSMATE_PUBLIC_CONFIG__'
const FALLBACK_AUTH0_DOMAIN = 'dev-3xcigxvdwlymo1k6.eu.auth0.com'
const FALLBACK_AUTH0_CLIENT_ID = 'REPLACE_WITH_AUTH0_CLIENT_ID'

function readRuntimeAuth0Value (key) {
  if (typeof window === 'undefined') return undefined

  const runtimeConfig = window.CSMATE_AUTH0_CONFIG && typeof window.CSMATE_AUTH0_CONFIG === 'object'
    ? window.CSMATE_AUTH0_CONFIG
    : null

  if (!runtimeConfig) return undefined

  const trim = (value) => typeof value === 'string' ? value.trim() : ''

  if (key === 'AUTH0_DOMAIN') {
    const domain = trim(runtimeConfig.domain)
    if (domain) return domain
  }

  if (key === 'AUTH0_CLIENT_ID') {
    const clientId = trim(runtimeConfig.clientId)
    if (clientId) return clientId
  }

  if (key === 'AUTH0_REDIRECT_URI') {
    const fromDirect = trim(runtimeConfig.redirectUri)
    if (fromDirect) return fromDirect
    const fromAuthParams = trim(runtimeConfig.authorizationParams?.redirect_uri)
    if (fromAuthParams) return fromAuthParams
  }

  if (key === 'AUTH0_AUDIENCE') {
    const fromAuthParams = trim(runtimeConfig.authorizationParams?.audience)
    if (fromAuthParams) return fromAuthParams
  }

  return undefined
}

function readConfigValue (key) {
  if (!key) return undefined

  if (typeof window !== 'undefined') {
    const runtimeValue = readRuntimeAuth0Value(key)
    if (runtimeValue) return runtimeValue

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

const defaultRedirect = typeof window !== 'undefined' ? `${window.location.origin}/` : ''

export const AUTH0_DOMAIN = readConfigValue('AUTH0_DOMAIN') || FALLBACK_AUTH0_DOMAIN
export const AUTH0_CLIENT_ID = readConfigValue('AUTH0_CLIENT_ID') || FALLBACK_AUTH0_CLIENT_ID
export const AUTH0_REDIRECT_URI = readConfigValue('AUTH0_REDIRECT_URI') || defaultRedirect

const ownerEmails = readConfigList('OWNER_EMAILS').map(email => email.toLowerCase())

export const OWNER_EMAILS = Object.freeze(ownerEmails)

export function isOwnerEmail (email) {
  if (typeof email !== 'string' || email.trim().length === 0) return false
  return OWNER_EMAILS.includes(email.trim().toLowerCase())
}
