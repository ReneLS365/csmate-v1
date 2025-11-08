import process from 'node:process'

const REQUIRED_ENV_KEYS = [
  'STACK_PROJECT_ID',
  'STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY'
]

function readEnv (env, key) {
  const value = env?.[key]
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed
}

export function loadStackConfig (options = {}) {
  const env = options.env ?? process.env
  const missing = []
  const projectId = readEnv(env, 'STACK_PROJECT_ID')
  const publishableClientKey = readEnv(env, 'STACK_PUBLISHABLE_CLIENT_KEY')
  const secretServerKey = readEnv(env, 'STACK_SECRET_SERVER_KEY')

  if (!projectId) missing.push('STACK_PROJECT_ID')
  if (!publishableClientKey) missing.push('STACK_PUBLISHABLE_CLIENT_KEY')
  if (!secretServerKey) missing.push('STACK_SECRET_SERVER_KEY')

  if (missing.length > 0) {
    const detail = missing.join(', ')
    throw new Error(`Missing Neon Auth environment variables: ${detail}`)
  }

  const baseUrl = readEnv(env, 'STACK_BASE_URL') || null
  const tokenStore = readEnv(env, 'STACK_TOKEN_STORE') || 'memory'
  const databaseUrl = readEnv(env, 'DATABASE_URL') || readEnv(env, 'VITE_DATABASE_URL') || null

  return {
    projectId,
    publishableClientKey,
    secretServerKey,
    baseUrl,
    tokenStore,
    databaseUrl
  }
}

export function hasStackConfig (options = {}) {
  const env = options.env ?? process.env
  return REQUIRED_ENV_KEYS.every((key) => Boolean(readEnv(env, key)))
}

export function maskSecret (secret) {
  if (!secret) return ''
  const string = String(secret)
  if (string.length <= 8) return '*'.repeat(string.length)
  return `${string.slice(0, 4)}…${string.slice(-4)}`
}
