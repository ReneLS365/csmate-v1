import { isOwnerEmail } from '../auth0-config.js'

/**
 * @typedef {Object} TenantMembership
 * @property {string} id - Globally unique identifier for the tenant (UUID).
 * @property {string | null} slug - Human friendly slug for the tenant when available.
 * @property {string} role - Canonical role for the tenant scope (owner, tenantAdmin, worker, ...).
 */

/**
 * @typedef {Object} AppUser
 * @property {string} id - Persistent identifier (Auth0 sub or generated ID).
 * @property {string | null} email - Primary email for the user when known.
 * @property {string} displayName - Preferred name for UI display.
 * @property {string[]} roles - Canonical global roles (owner, tenantAdmin, worker, ...).
 * @property {TenantMembership[]} tenants - Active tenant memberships for the user.
 * @property {Record<string, any>} [metadata] - Additional metadata persisted locally.
 * @property {number} [createdAt]
 * @property {number} [updatedAt]
 * @property {number | null} [lastLoginAt]
 */

const STORAGE_KEY = 'csmate.users.state.v1'
const LEGACY_STORAGE_KEY = 'csmate.user.v1'
const STORAGE_VERSION = 1
const DEFAULT_GLOBAL_ROLE = 'worker'
const DEFAULT_OFFLINE_ROLE = 'formand'
const ELEVATED_ROLES = new Set(['owner'])

const GLOBAL_ROLE_ALIASES = new Map([
  ['owner', 'owner'],
  ['superadmin', 'owner'],
  ['tenant_admin', 'tenantAdmin'],
  ['tenantadmin', 'tenantAdmin'],
  ['tenant-admin', 'tenantAdmin'],
  ['firmadmin', 'tenantAdmin'],
  ['firma-admin', 'tenantAdmin'],
  ['formand', 'tenantAdmin'],
  ['foreman', 'tenantAdmin'],
  ['admin', 'tenantAdmin'],
  ['worker', 'worker'],
  ['montør', 'worker'],
  ['montor', 'worker'],
  ['user', 'worker'],
  ['guest', 'guest']
])

const TENANT_ROLE_ALIASES = new Map([
  ['owner', 'owner'],
  ['superadmin', 'owner'],
  ['tenant_admin', 'tenantAdmin'],
  ['tenantadmin', 'tenantAdmin'],
  ['tenant-admin', 'tenantAdmin'],
  ['firmadmin', 'tenantAdmin'],
  ['firma-admin', 'tenantAdmin'],
  ['formand', 'tenantAdmin'],
  ['foreman', 'tenantAdmin'],
  ['admin', 'tenantAdmin'],
  ['worker', 'worker'],
  ['montør', 'worker'],
  ['montor', 'worker'],
  ['user', 'worker'],
  ['guest', 'guest']
])

function canonicalize (role) {
  if (typeof role !== 'string') return ''
  const trimmed = role.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  return lower
}

function canonicalizeGlobalRole (role) {
  const key = canonicalize(role)
  return GLOBAL_ROLE_ALIASES.get(key) || (key || DEFAULT_GLOBAL_ROLE)
}

function canonicalizeTenantRole (role) {
  const key = canonicalize(role)
  return TENANT_ROLE_ALIASES.get(key) || (key || 'worker')
}

function normalizeGlobalRoles (roles, fallbackRole = DEFAULT_GLOBAL_ROLE) {
  const unique = new Set()
  if (Array.isArray(roles)) {
    roles.forEach(role => {
      const normalized = canonicalizeGlobalRole(role)
      if (normalized) unique.add(normalized)
    })
  }
  if (unique.size === 0 && fallbackRole) {
    const normalizedFallback = canonicalizeGlobalRole(fallbackRole)
    if (normalizedFallback) {
      unique.add(normalizedFallback)
    }
  }
  return Array.from(unique)
}

function normalizeTenantMemberships (memberships) {
  if (!Array.isArray(memberships)) return []
  const normalized = []
  memberships.forEach(entry => {
    if (!entry || typeof entry !== 'object') return
    const idCandidate =
      (typeof entry.id === 'string' && entry.id.trim()) ||
      (typeof entry.tenantId === 'string' && entry.tenantId.trim())
    const slugCandidate =
      (typeof entry.slug === 'string' && entry.slug.trim()) ||
      (typeof entry.tenantSlug === 'string' && entry.tenantSlug.trim())
    const roleCandidate = canonicalizeTenantRole(entry.role)
    if (!idCandidate || !roleCandidate) return
    normalized.push({
      id: idCandidate,
      slug: slugCandidate || null,
      role: roleCandidate
    })
  })
  return normalized
}

function derivePrimaryRole (user) {
  if (!user) return ''
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles[0]
  }
  if (typeof user.role === 'string' && user.role.trim()) {
    return canonicalizeGlobalRole(user.role)
  }
  return DEFAULT_GLOBAL_ROLE
}

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
  const tenantRole = canonicalizeTenantRole(trimmed)
  if (tenantRole === 'owner') return 'owner'
  if (tenantRole === 'tenantAdmin') return 'tenantAdmin'
  if (tenantRole === 'worker') return 'worker'
  if (tenantRole === 'guest') return 'guest'
  return tenantRole || DEFAULT_OFFLINE_ROLE
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
  if (Array.isArray(user.roles)) {
    copy.roles = user.roles.slice()
  }
  if (Array.isArray(user.tenants)) {
    copy.tenants = user.tenants.map(entry => ({ ...entry }))
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

  const displayName =
    typeof entry.displayName === 'string' && entry.displayName.trim()
      ? entry.displayName.trim()
      : typeof entry.name === 'string'
        ? entry.name
        : ''

  const tenantMemberships = normalizeTenantMemberships(entry.tenants)
  const globalRoles = normalizeGlobalRoles(entry.roles || [entry.role])
  const primaryRole = globalRoles.length > 0 ? globalRoles[0] : canonicalizeGlobalRole(entry.role)

  return {
    id,
    email,
    emailKey,
    role: primaryRole,
    roles: globalRoles,
    tenants: tenantMemberships,
    name: displayName,
    displayName,
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
        roles: Array.isArray(user.roles) ? user.roles.slice() : [],
        tenants: Array.isArray(user.tenants) ? user.tenants.map(entry => ({ ...entry })) : [],
        name: user.name,
        displayName: user.displayName,
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

function resolveUserByCandidates (candidates) {
  if (!Array.isArray(candidates)) return null
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const resolved = resolveUser(candidate)
    if (resolved) return resolved
  }
  return null
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
      roles: ['owner', 'tenantAdmin'],
      tenants: Array.isArray(defaults.tenants) ? normalizeTenantMemberships(defaults.tenants) : [],
      name: typeof defaults.name === 'string' && defaults.name.trim() ? defaults.name.trim() : email,
      displayName: typeof defaults.name === 'string' && defaults.name.trim() ? defaults.name.trim() : email,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: Number.isFinite(defaults.lastLoginAt) ? defaults.lastLoginAt : null,
      metadata: cloneMetadata(defaults.metadata)
    }
    state.users.push(user)
  } else {
    user.role = 'owner'
    user.roles = normalizeGlobalRoles(['owner', ...(user.roles || [])])
    user.updatedAt = now
  }

  if (!Array.isArray(user.roles) || user.roles.length === 0) {
    user.roles = ['owner', 'tenantAdmin']
  } else if (!user.roles.includes('owner')) {
    user.roles.unshift('owner')
  }
  if (!user.roles.includes('tenantAdmin')) {
    user.roles.push('tenantAdmin')
  }
  user.displayName = typeof user.displayName === 'string' && user.displayName.trim()
    ? user.displayName.trim()
    : (typeof user.name === 'string' && user.name.trim() ? user.name.trim() : (user.email || user.emailKey || ''))

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
    const fallbackName = displayName || email || id
    user = {
      id,
      email,
      emailKey,
      role: canonicalizeGlobalRole(DEFAULT_GLOBAL_ROLE),
      roles: ['worker'],
      tenants: [],
      name: fallbackName,
      displayName: fallbackName,
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
      user.displayName = displayName
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

  if (!Array.isArray(user.roles) || user.roles.length === 0) {
    user.roles = ['worker']
  } else {
    user.roles = normalizeGlobalRoles(user.roles)
  }

  if (!Array.isArray(user.tenants)) {
    user.tenants = []
  } else {
    user.tenants = normalizeTenantMemberships(user.tenants)
  }

  if (email && isOwnerEmail(email)) {
    const ensured = ensureOwnerUser(email, {
      id: user.id,
      email,
      name: user.displayName || user.name,
      lastLoginAt: user.lastLoginAt,
      metadata: user.metadata,
      tenants: user.tenants
    })
    if (ensured) {
      user = resolveUser(ensured.id) || user
    }
  }

  user.role = derivePrimaryRole(user)
  if (!user.displayName) {
    user.displayName = user.name || user.email || user.emailKey || user.id
  }

  touchUserTimestamps(user, { login: true })
  state.currentUserId = user.id
  persistState()
  return cloneUser(user)
}

export function mergeRemoteUserProfile (profile, { setCurrent = true } = {}) {
  if (!profile || typeof profile !== 'object') return null

  const email = typeof profile.email === 'string' && profile.email.trim() ? profile.email.trim() : null
  const emailKey = normalizeEmail(email)
  const displayName =
    typeof profile.displayName === 'string' && profile.displayName.trim()
      ? profile.displayName.trim()
      : typeof profile.name === 'string' && profile.name.trim()
        ? profile.name.trim()
        : email || ''
  const authId =
    (typeof profile.authId === 'string' && profile.authId.trim()) ||
    (typeof profile.auth0Sub === 'string' && profile.auth0Sub.trim()) ||
    (typeof profile.sub === 'string' && profile.sub.trim()) ||
    null

  const canonicalRoles = normalizeGlobalRoles(profile.roles)
  const tenantMemberships = normalizeTenantMemberships(profile.tenants)

  const candidates = []
  if (typeof profile.id === 'string' && profile.id.trim()) {
    candidates.push(profile.id.trim())
  }
  if (authId) {
    candidates.push(authId)
  }
  if (email) {
    candidates.push(email)
  }
  if (emailKey) {
    candidates.push(emailKey)
    candidates.push(`email:${emailKey}`)
  }

  let user = resolveUserByCandidates(candidates)
  const now = Date.now()

  if (!user) {
    const id = (typeof profile.id === 'string' && profile.id.trim()) || authId || (emailKey ? `email:${emailKey}` : null)
    if (!id) return null
    user = normalizeStoredUser({
      id,
      email,
      emailKey,
      role: canonicalRoles[0] || DEFAULT_GLOBAL_ROLE,
      roles: canonicalRoles.length ? canonicalRoles : [DEFAULT_GLOBAL_ROLE],
      tenants: tenantMemberships,
      name: displayName || email || id,
      displayName: displayName || email || id,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      metadata: {
        remoteCreated: true,
        remoteAuthId: authId || null
      }
    })
    if (!user) return null
    state.users.push(user)
  } else {
    if (typeof profile.id === 'string' && profile.id.trim() && user.id !== profile.id.trim()) {
      user.id = profile.id.trim()
    }
    if (authId) {
      user.metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {}
      user.metadata.remoteAuthId = authId
    }
    if (email) {
      user.email = email
      user.emailKey = emailKey
    }
    if (displayName) {
      user.name = displayName
      user.displayName = displayName
    }
    if (canonicalRoles.length > 0) {
      user.roles = canonicalRoles
    } else if (!Array.isArray(user.roles) || user.roles.length === 0) {
      user.roles = [DEFAULT_GLOBAL_ROLE]
    } else {
      user.roles = normalizeGlobalRoles(user.roles)
    }
    user.tenants = tenantMemberships
    user.role = derivePrimaryRole(user)
    user.updatedAt = now
  }

  if (!Array.isArray(user.roles) || user.roles.length === 0) {
    user.roles = [DEFAULT_GLOBAL_ROLE]
  }
  user.role = derivePrimaryRole(user)
  user.displayName = user.displayName || user.name || user.email || user.emailKey || user.id
  user.metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {}
  user.metadata.remoteSyncedAt = now

  touchUserTimestamps(user)

  if (setCurrent) {
    state.currentUserId = user.id
  }

  persistState()
  return cloneUser(user)
}

export function updateUserRole (targetIdentifier, newRole, actorIdentifier = null) {
  if (typeof newRole !== 'string' || !newRole.trim()) return null
  const role = canonicalizeGlobalRole(newRole)

  const target = resolveUser(targetIdentifier)
  if (!target) return null

  if (target.role === 'owner' && role !== 'owner') {
    console.warn('Owners cannot be downgraded')
    return cloneUser(target)
  }

  if (ELEVATED_ROLES.has(role)) {
    const actor = resolveUser(actorIdentifier)
    if (!actor || actor.role !== 'owner') {
      console.warn('Only owners may promote to owner or tenantAdmin roles')
      return cloneUser(target)
    }
  }

  if (target.role === role) {
    return cloneUser(target)
  }

  target.role = role
  target.roles = normalizeGlobalRoles([role])
  target.displayName = typeof target.displayName === 'string' && target.displayName.trim()
    ? target.displayName.trim()
    : (typeof target.name === 'string' && target.name.trim() ? target.name.trim() : target.email || target.emailKey || target.id)
  touchUserTimestamps(target)
  persistState()
  return cloneUser(target)
}

// Expose for tests/debugging
export function __resetUserStateForTests () {
  state = normalizeState(null)
  persistState()
}

export function getUserTenants (user = null) {
  const target = user || getCurrentUser()
  return Array.isArray(target?.tenants) ? target.tenants.map(entry => ({ ...entry })) : []
}

export function getUserRoles (user = null) {
  const target = user || getCurrentUser()
  return Array.isArray(target?.roles) ? target.roles.slice() : []
}

export function isOwner (user = null) {
  const target = user || getCurrentUser()
  if (!target) return false
  if (Array.isArray(target.roles) && target.roles.includes('owner')) {
    return true
  }
  const role = canonicalizeGlobalRole(target.role)
  return role === 'owner'
}

export function isTenantAdmin (user = null, tenantId = null) {
  const target = user || getCurrentUser()
  if (!target) return false
  if (isOwner(target)) return true
  const memberships = Array.isArray(target.tenants) ? target.tenants : []
  if (!tenantId) {
    return memberships.some(entry => entry.role === 'tenantAdmin' || entry.role === 'owner')
  }
  const normalized = typeof tenantId === 'string' ? tenantId.trim().toLowerCase() : ''
  if (!normalized) {
    return memberships.some(entry => entry.role === 'tenantAdmin' || entry.role === 'owner')
  }
  return memberships.some(entry => {
    if (!entry || typeof entry !== 'object') return false
    const idMatch = typeof entry.id === 'string' && entry.id.trim().toLowerCase() === normalized
    const slugMatch = typeof entry.slug === 'string' && entry.slug.trim().toLowerCase() === normalized
    if (!idMatch && !slugMatch) return false
    return entry.role === 'tenantAdmin' || entry.role === 'owner'
  })
}

export function canSeeAdminTab (user = null) {
  const target = user || getCurrentUser()
  if (!target) return false
  if (isOwner(target)) return true
  if (Array.isArray(target.roles) && target.roles.includes('tenantAdmin')) {
    return true
  }
  return Array.isArray(target.tenants) && target.tenants.some(entry => entry.role === 'tenantAdmin' || entry.role === 'owner')
}
