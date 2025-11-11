import { isOwnerEmail } from '../auth0-config.js'

const STORAGE_KEY = 'csmate.users.state.v1'
const LEGACY_STORAGE_KEY = 'csmate.user.v1'
const STORAGE_VERSION = 1
const DEFAULT_ROLE = 'user'
const DEFAULT_OFFLINE_ROLE = 'formand'
const ELEVATED_ROLES = new Set(['owner', 'firmAdmin'])

function hasStorage () {
  return typeof localStorage !== 'undefined'
}

function normalizeEmail (email) {
  if (typeof email !== 'string') return null
  const trimmed = email.trim()
  return trimmed ? trimmed.toLowerCase() : null
}

function normalizeLegacyRole (role) {
  if (typeof role !== 'string') return DEFAULT_OFFLINE_ROLE
  const trimmed = role.trim()
  if (!trimmed) return DEFAULT_OFFLINE_ROLE
  const lower = trimmed.toLowerCase()
  if (lower === 'firma-admin' || lower === 'firmadmin' || lower === 'firma admin') return 'firmAdmin'
  if (lower === 'admin' || lower === 'superadmin') return 'firmAdmin'
  if (lower === 'owner' || lower === 'ejer') return 'owner'
  if (lower === 'formand' || lower === 'foreman') return 'formand'
  if (lower === 'montør' || lower === 'montor') return 'montor'
  if (lower === 'worker' || lower === 'bruger' || lower === 'user') return 'user'
  if (lower === 'guest' || lower === 'gæst' || lower === 'gaest') return 'guest'
  return trimmed
}

function generateUniqueId (state, base) {
  const users = Array.isArray(state?.users) ? state.users : []
  let id = base
  let counter = 1
  while (users.some(user => user?.id === id)) {
    counter += 1
    id = `${base}:${counter}`
  }
  return id
}

function cloneMetadata (metadata) {
  if (!metadata || typeof metadata !== 'object') return {}
  return { ...metadata }
}

function cloneUser (user) {
  if (!user) return null
  const copy = { ...user }
  if (user.metadata && typeof user.metadata === 'object') {
    copy.metadata = { ...user.metadata }
  }
  return copy
}

function normalizeStoredUser (entry) {
  if (!entry || typeof entry !== 'object') return null

  const email = typeof entry.email === 'string' ? entry.email : null
  const emailKey = normalizeEmail(entry.emailKey || email)
  const id = typeof entry.id === 'string' && entry.id.trim()
    ? entry.id.trim()
    : (emailKey ? `email:${emailKey}` : null)

  if (!id) return null

  const now = Date.now()

  return {
    id,
    email,
    emailKey,
    role: typeof entry.role === 'string' && entry.role.trim() ? entry.role.trim() : DEFAULT_ROLE,
    name: typeof entry.name === 'string' ? entry.name : '',
    createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : now,
    updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : now,
    lastLoginAt: Number.isFinite(entry.lastLoginAt) ? entry.lastLoginAt : null,
    metadata: cloneMetadata(entry.metadata)
  }
}

function normalizeState (raw) {
  const base = {
    version: STORAGE_VERSION,
    currentUserId: null,
    users: []
  }

  if (!raw || typeof raw !== 'object') return base

  const users = Array.isArray(raw.users)
    ? raw.users.map(normalizeStoredUser).filter(Boolean)
    : []

  const state = {
    version: STORAGE_VERSION,
    currentUserId: typeof raw.currentUserId === 'string' && raw.currentUserId.trim()
      ? raw.currentUserId.trim()
      : null,
    users
  }

  if (!state.users.some(user => user.id === state.currentUserId)) {
    state.currentUserId = null
  }

  return state
}

function loadState () {
  if (!hasStorage()) return normalizeState(null)

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return normalizeState(null)
    const parsed = JSON.parse(raw)
    return normalizeState(parsed)
  } catch (error) {
    console.warn('User state load failed', error)
    return normalizeState(null)
  }
}

function migrateLegacyState (state) {
  if (!hasStorage()) return { state, changed: false }

  let raw = null
  try {
    raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  } catch (error) {
    console.warn('Legacy user state read failed', error)
    return { state, changed: false }
  }

  if (!raw) return { state, changed: false }

  let legacy
  try {
    legacy = JSON.parse(raw)
  } catch (error) {
    console.warn('Legacy user state parse failed', error)
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch (cleanupError) {
      console.warn('Legacy user cleanup failed', cleanupError)
    }
    return { state, changed: false }
  }

  if (!legacy || typeof legacy !== 'object') {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch (cleanupError) {
      console.warn('Legacy user cleanup failed', cleanupError)
    }
    return { state, changed: false }
  }

  const email = typeof legacy.email === 'string' ? legacy.email : null
  const emailKey = normalizeEmail(email)

  let id = typeof legacy.id === 'string' && legacy.id.trim() ? legacy.id.trim() : null
  if (!id) {
    const base = emailKey ? `email:${emailKey}` : `legacy:${normalizeLegacyRole(legacy.role || '')}`
    id = generateUniqueId(state, base || 'legacy:offline')
  }

  const now = Date.now()
  const candidate = normalizeStoredUser({
    id,
    email,
    emailKey,
    role: normalizeLegacyRole(legacy.role),
    name: typeof legacy.name === 'string' && legacy.name.trim() ? legacy.name.trim() : (email || 'Offline bruger'),
    createdAt: Number.isFinite(legacy.createdAt) ? legacy.createdAt : now,
    updatedAt: now,
    lastLoginAt: now,
    metadata: {
      ...cloneMetadata(legacy.metadata),
      legacyRole: legacy.role || null,
      legacyMigrated: true
    }
  })

  if (!candidate) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch (cleanupError) {
      console.warn('Legacy user cleanup failed', cleanupError)
    }
    return { state, changed: false }
  }

  const existingIndex = state.users.findIndex(user => user?.id === candidate.id)
  if (existingIndex >= 0) {
    state.users[existingIndex] = candidate
  } else {
    state.users.push(candidate)
  }
  state.currentUserId = candidate.id

  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch (cleanupError) {
    console.warn('Legacy user cleanup failed', cleanupError)
  }

  return { state, changed: true }
}

function ensureDefaultUserState (state) {
  const users = Array.isArray(state.users) ? state.users : []
  if (users.length === 0) {
    const now = Date.now()
    const baseId = 'local:default-user'
    const id = generateUniqueId({ users }, baseId)
    const defaultUser = normalizeStoredUser({
      id,
      role: DEFAULT_OFFLINE_ROLE,
      name: 'Offline montør',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      metadata: { source: 'default-offline' }
    })
    if (defaultUser) {
      users.push(defaultUser)
      state.currentUserId = defaultUser.id
      return { state, changed: true }
    }
  }

  if (!state.currentUserId && users.length > 0) {
    state.currentUserId = users[0].id
    return { state, changed: true }
  }

  return { state, changed: false }
}

function prepareInitialState () {
  let state = loadState()
  let shouldPersist = false

  const migrated = migrateLegacyState(state)
  state = migrated.state
  shouldPersist = shouldPersist || migrated.changed

  const ensured = ensureDefaultUserState(state)
  state = ensured.state
  shouldPersist = shouldPersist || ensured.changed

  return { state, shouldPersist }
}

const preparedState = prepareInitialState()
let state = preparedState.state

function persistState () {
  if (!hasStorage()) return
  try {
    const payload = {
      version: STORAGE_VERSION,
      currentUserId: state.currentUserId,
      users: state.users.map(user => ({
        id: user.id,
        email: user.email,
        emailKey: user.emailKey,
        role: user.role,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        metadata: cloneMetadata(user.metadata)
      }))
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('User state persist failed', error)
  }
}

if (preparedState.shouldPersist) {
  persistState()
}

function resolveUser (identifier) {
  if (!identifier) return null

  if (typeof identifier === 'object') {
    if (identifier.id) return resolveUser(identifier.id)
    if (identifier.email) return resolveUser(identifier.email)
    if (identifier.emailKey) return resolveUser(identifier.emailKey)
    return null
  }

  if (typeof identifier !== 'string') return null

  const trimmed = identifier.trim()
  if (!trimmed) return null

  let user = state.users.find(candidate => candidate.id === trimmed)
  if (user) return user

  const emailKey = normalizeEmail(trimmed)
  if (!emailKey) return null

  user = state.users.find(candidate => candidate.emailKey === emailKey)
  return user || null
}

function touchUserTimestamps (user, options = {}) {
  const now = Date.now()
  if (!user.createdAt) {
    user.createdAt = now
  }
  user.updatedAt = now
  if (options.login) {
    user.lastLoginAt = now
  }
}

export function getCurrentUser () {
  let user = resolveUser(state.currentUserId)
  if (!user && state.users.length > 0) {
    user = state.users[0]
    state.currentUserId = user.id
    persistState()
  }
  return cloneUser(user)
}

export function getAllUsers () {
  return state.users
    .slice()
    .sort((a, b) => {
      const nameA = a.name?.toLowerCase() || a.emailKey || ''
      const nameB = b.name?.toLowerCase() || b.emailKey || ''
      if (nameA < nameB) return -1
      if (nameA > nameB) return 1
      return 0
    })
    .map(cloneUser)
}

export function setCurrentUser (identifier) {
  let user = resolveUser(identifier)
  if (!user && (!identifier || (typeof identifier === 'string' && !identifier.trim()))) {
    user = state.users[0] || null
  }
  state.currentUserId = user ? user.id : null
  persistState()
  return cloneUser(user)
}

export function ensureOwnerUser (email, defaults = {}) {
  const emailKey = normalizeEmail(email)
  if (!emailKey) return null

  let user = state.users.find(candidate => candidate.emailKey === emailKey)
  const now = Date.now()

  if (!user) {
    user = {
      id: typeof defaults.id === 'string' && defaults.id.trim() ? defaults.id.trim() : `owner:${emailKey}`,
      email: typeof defaults.email === 'string' ? defaults.email : email || emailKey,
      emailKey,
      role: 'owner',
      name: typeof defaults.name === 'string' && defaults.name.trim() ? defaults.name.trim() : email,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: Number.isFinite(defaults.lastLoginAt) ? defaults.lastLoginAt : null,
      metadata: cloneMetadata(defaults.metadata)
    }
    state.users.push(user)
  } else if (user.role !== 'owner') {
    user.role = 'owner'
    user.updatedAt = now
  }

  persistState()
  return cloneUser(user)
}

export function ensureUserFromAuth0 (authUser) {
  if (!authUser || typeof authUser !== 'object') return null

  const email = typeof authUser.email === 'string' ? authUser.email : null
  const emailKey = normalizeEmail(email)
  const idSource = typeof authUser.sub === 'string' && authUser.sub.trim() ? authUser.sub.trim() : null
  const fallbackId = emailKey ? `email:${emailKey}` : null
  const id = idSource || fallbackId

  if (!id) return null

  let user = resolveUser(id)
  if (!user && emailKey) {
    user = resolveUser(emailKey)
  }

  const now = Date.now()
  const displayName = typeof authUser.name === 'string' && authUser.name.trim()
    ? authUser.name.trim()
    : (typeof authUser.nickname === 'string' && authUser.nickname.trim() ? authUser.nickname.trim() : '')

  if (!user) {
    user = {
      id,
      email,
      emailKey,
      role: DEFAULT_ROLE,
      name: displayName || email || id,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      metadata: {}
    }
    if (authUser.nickname) user.metadata.nickname = authUser.nickname
    if (authUser.picture) user.metadata.picture = authUser.picture
    if (authUser.sub) user.metadata.sub = authUser.sub
    state.users.push(user)
  } else {
    if (user.id !== id) {
      user.id = id
    }
    if (email) {
      user.email = email
    }
    if (emailKey) {
      user.emailKey = emailKey
    }
    if (displayName) {
      user.name = displayName
    }
    user.metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {}
    if (authUser.nickname) {
      user.metadata.nickname = authUser.nickname
    }
    if (authUser.picture) {
      user.metadata.picture = authUser.picture
    }
    if (authUser.sub) {
      user.metadata.sub = authUser.sub
    }
  }

  if (email && isOwnerEmail(email)) {
    const ensured = ensureOwnerUser(email, {
      id: user.id,
      email,
      name: user.name,
      lastLoginAt: user.lastLoginAt,
      metadata: user.metadata
    })
    if (ensured) {
      user = resolveUser(ensured.id) || user
    }
  }

  touchUserTimestamps(user, { login: true })
  state.currentUserId = user.id
  persistState()
  return cloneUser(user)
}

export function updateUserRole (targetIdentifier, newRole, actorIdentifier = null) {
  if (typeof newRole !== 'string' || !newRole.trim()) return null
  const role = newRole.trim()

  const target = resolveUser(targetIdentifier)
  if (!target) return null

  if (target.role === 'owner' && role !== 'owner') {
    console.warn('Owners cannot be downgraded')
    return cloneUser(target)
  }

  if (ELEVATED_ROLES.has(role)) {
    const actor = resolveUser(actorIdentifier)
    if (!actor || actor.role !== 'owner') {
      console.warn('Only owners may promote to owner or firmAdmin roles')
      return cloneUser(target)
    }
  }

  if (target.role === role) {
    return cloneUser(target)
  }

  target.role = role
  touchUserTimestamps(target)
  persistState()
  return cloneUser(target)
}

// Expose for tests/debugging
export function __resetUserStateForTests () {
  state = normalizeState(null)
  persistState()
}
