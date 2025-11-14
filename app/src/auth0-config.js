const PUBLIC_CONFIG_KEY = '__CSMATE_PUBLIC_CONFIG__'
const FALLBACK_AUTH0_DOMAIN = ''
const FALLBACK_AUTH0_CLIENT_ID = ''

const ENV_KEY_MAP = Object.freeze({
  AUTH0_DOMAIN: ['VITE_AUTH0_DOMAIN', 'AUTH0_DOMAIN'],
  AUTH0_CLIENT_ID: ['VITE_AUTH0_CLIENT_ID', 'AUTH0_CLIENT_ID'],
  AUTH0_REDIRECT_URI: ['VITE_AUTH0_REDIRECT_URI', 'AUTH0_REDIRECT_URI'],
  AUTH0_AUDIENCE: ['AUTH0_AUDIENCE', 'VITE_AUTH0_AUDIENCE']
})

function readViteEnvValue (envKey) {
  if (!envKey || typeof import.meta === 'undefined' || !import.meta?.env) return undefined
  const raw = import.meta.env[envKey]
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readNodeEnvValue (envKey) {
  if (!envKey || typeof process === 'undefined' || !process?.env) return undefined
  const raw = process.env[envKey]
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readEnvValue (key) {
  const envKeys = ENV_KEY_MAP[key]
  if (!Array.isArray(envKeys) || envKeys.length === 0) return undefined

  for (const envKey of envKeys) {
    const viteValue = readViteEnvValue(envKey)
    if (viteValue) return viteValue
  }

  for (const envKey of envKeys) {
    const nodeValue = readNodeEnvValue(envKey)
    if (nodeValue) return nodeValue
  }

  return undefined
}

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

  const envValue = readEnvValue(key)
  if (envValue) return envValue

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

const defaultRedirect = typeof window !== 'undefined' ? window.location.origin : ''

export const AUTH0_DOMAIN = readConfigValue('AUTH0_DOMAIN') || FALLBACK_AUTH0_DOMAIN
export const AUTH0_CLIENT_ID = readConfigValue('AUTH0_CLIENT_ID') || FALLBACK_AUTH0_CLIENT_ID
export const AUTH0_REDIRECT_URI = readConfigValue('AUTH0_REDIRECT_URI') || defaultRedirect
export const AUTH0_AUDIENCE = readConfigValue('AUTH0_AUDIENCE') || ''

const ownerEmails = readConfigList('OWNER_EMAILS').map(email => email.toLowerCase())

export const OWNER_EMAILS = Object.freeze(ownerEmails)

export function isOwnerEmail (email) {
  if (typeof email !== 'string' || email.trim().length === 0) return false
  return OWNER_EMAILS.includes(email.trim().toLowerCase())
}
