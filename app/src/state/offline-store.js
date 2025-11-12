import { ensureOfflineUserProfile, getCurrentUser, setCurrentUser } from './users.js'

const STORAGE_KEYS = Object.freeze({
  offlineUser: 'csmate.offline.user.v1',
  jobs: 'csmate.offline.jobs.v1'
})

function hasStorage () {
  try {
    return typeof localStorage !== 'undefined'
  } catch (error) {
    return false
  }
}

function readKey (key, fallback) {
  if (!hasStorage()) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    console.warn('Offline store læsning fejlede', error)
    return fallback
  }
}

function writeKey (key, value) {
  if (!hasStorage()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Offline store skrivning fejlede', error)
  }
}

function removeKey (key) {
  if (!hasStorage()) return
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn('Offline store sletning fejlede', error)
  }
}

function isObject (value) {
  return value && typeof value === 'object'
}

function mergeOfflineProfile (cached, profile) {
  if (!isObject(cached)) return { ...profile }
  const merged = { ...cached, ...profile }
  if (!('roles' in profile) && Array.isArray(cached.roles)) {
    merged.roles = cached.roles.slice()
  }
  if (!('tenants' in profile) && Array.isArray(cached.tenants)) {
    merged.tenants = cached.tenants.map(entry => ({ ...entry }))
  }
  if (!('metadata' in profile) && isObject(cached.metadata)) {
    merged.metadata = { ...cached.metadata }
  }
  return merged
}

function isEmptyProfile (profile) {
  if (!isObject(profile)) return true
  return Object.keys(profile).length === 0
}

export function ensureOfflineUser (profile = {}) {
  const cached = getCachedOfflineUser()
  const baseProfile = isEmptyProfile(profile)
    ? (cached || profile)
    : mergeOfflineProfile(cached, profile)

  const ensured = ensureOfflineUserProfile(baseProfile)
  if (!ensured) return null
  const offlineSnapshot = {
    ...ensured,
    offline: true
  }
  writeKey(STORAGE_KEYS.offlineUser, offlineSnapshot)
  try {
    setCurrentUser(ensured.id || ensured)
  } catch (error) {
    console.warn('Kunne ikke aktivere offline-bruger', error)
  }
  return offlineSnapshot
}

export function cacheOfflineProfile (profile = {}) {
  const cached = ensureOfflineUserProfile(profile)
  if (!cached) return null
  const offlineSnapshot = {
    ...cached,
    offline: true
  }
  writeKey(STORAGE_KEYS.offlineUser, offlineSnapshot)
  return offlineSnapshot
}

export function clearOfflineUser () {
  removeKey(STORAGE_KEYS.offlineUser)
}

export function getCachedOfflineUser () {
  return readKey(STORAGE_KEYS.offlineUser, null)
}

export function getCurrentUserOrOffline () {
  const active = getCurrentUser()
  if (active) return active
  return getCachedOfflineUser()
}

function cloneJob (job) {
  if (!job || typeof job !== 'object') return null
  const copy = { ...job }
  if (Array.isArray(copy.materials)) {
    copy.materials = copy.materials.map(entry => ({ ...entry }))
  }
  return copy
}

export function listJobs () {
  const jobs = readKey(STORAGE_KEYS.jobs, [])
  if (!Array.isArray(jobs)) return []
  return jobs.map(job => cloneJob(job)).filter(Boolean)
}

export function replaceJobsCache (jobs) {
  const safeJobs = Array.isArray(jobs) ? jobs.map(job => cloneJob(job)).filter(Boolean) : []
  writeKey(STORAGE_KEYS.jobs, safeJobs)
  return safeJobs
}

export function upsertJob (job) {
  const entry = cloneJob(job)
  if (!entry || !entry.id) return listJobs()
  const jobs = listJobs()
  const index = jobs.findIndex(candidate => candidate.id === entry.id)
  if (index >= 0) {
    jobs[index] = { ...jobs[index], ...entry }
  } else {
    jobs.push(entry)
  }
  writeKey(STORAGE_KEYS.jobs, jobs)
  return entry
}

export function cacheMaterialsForJob (jobId, materials) {
  if (!jobId) return null
  const jobs = listJobs()
  const index = jobs.findIndex(candidate => candidate.id === jobId)
  const base = index >= 0 ? jobs[index] : { id: jobId }
  base.materials = Array.isArray(materials) ? materials.map(entry => ({ ...entry })) : []
  if (!base.name) {
    base.name = base.title || `Job ${jobId}`
  }
  if (index >= 0) {
    jobs[index] = base
  } else {
    jobs.push(base)
  }
  writeKey(STORAGE_KEYS.jobs, jobs)
  return base
}
