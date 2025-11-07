import {
  createJob,
  updateJob,
  deleteJob,
  findJobById,
  getJobs,
  loadJobs
} from '../jobs.js'
import { CalcCore } from './lib/calc-core.js'
import {
  requireSagsinfo,
  exportAll,
  exportSingleSheet,
  registerPDFEngine,
  registerEkompletEngine
} from './exports.js'

const globalScope = typeof window !== 'undefined' ? window : globalThis

let jobStoreActiveResolver = null
let jobStoreActiveSetter = null
let jobStoreSaveHook = null
let fallbackActiveId = null
const jobStoreListeners = new Set()

function hasStorage () {
  return typeof localStorage !== 'undefined'
}

function cloneJob (job) {
  if (!job || typeof job !== 'object') return null
  try {
    return JSON.parse(JSON.stringify(job))
  } catch {
    return { ...job }
  }
}

function notifyJobChange (jobId, change) {
  if (!jobStoreListeners.size) return
  jobStoreListeners.forEach(listener => {
    try {
      const payload = change && typeof change === 'object'
        ? { ...change, job: change.job ? cloneJob(change.job) : change.job }
        : change
      listener(jobId, payload)
    } catch (error) {
      console.warn('JobStore listener failed', error)
    }
  })
}

function resolveActiveFromHook () {
  if (typeof jobStoreActiveResolver === 'function') {
    try {
      const result = jobStoreActiveResolver()
      if (result && typeof result === 'object') {
        if (result.id) fallbackActiveId = result.id
        return cloneJob(result)
      }
      if (typeof result === 'string') {
        fallbackActiveId = result
        const job = findJobById(result)
        return job ? cloneJob(job) : null
      }
    } catch (error) {
      console.warn('JobStore active resolver failed', error)
    }
  }
  return null
}

function runActiveSetter (jobId) {
  if (typeof jobStoreActiveSetter === 'function') {
    try {
      jobStoreActiveSetter(jobId)
    } catch (error) {
      console.warn('JobStore setActive hook failed', error)
    }
  }
}

const JobStore = {
  load () {
    return loadJobs()
  },
  list () {
    return getJobs()
  },
  dump () {
    return getJobs()
  },
  create (data = {}) {
    const job = createJob(data)
    fallbackActiveId = job?.id || null
    runActiveSetter(fallbackActiveId)
    notifyJobChange(job?.id, { type: 'create', job })
    return job?.id || null
  },
  update (jobId, patch) {
    if (!jobId) return null
    const updated = updateJob(jobId, patch)
    if (updated) {
      fallbackActiveId = jobId
      notifyJobChange(jobId, { type: 'update', job: updated, patch })
    }
    return updated
  },
  delete (jobId) {
    if (!jobId) return null
    const removed = deleteJob(jobId)
    if (removed && fallbackActiveId === jobId) {
      fallbackActiveId = null
    }
    notifyJobChange(jobId, { type: 'delete', job: removed })
    return removed
  },
  get (jobId) {
    if (!jobId) return null
    const job = findJobById(jobId)
    return job ? cloneJob(job) : null
  },
  getActiveJob () {
    const resolved = resolveActiveFromHook()
    if (resolved) return resolved
    if (fallbackActiveId) {
      const job = findJobById(fallbackActiveId)
      return job ? cloneJob(job) : null
    }
    return null
  },
  setActive (jobId) {
    fallbackActiveId = jobId || null
    runActiveSetter(jobId || null)
    return this.getActiveJob()
  },
  saveActive () {
    if (typeof jobStoreSaveHook === 'function') {
      try {
        return jobStoreSaveHook() || this.getActiveJob()
      } catch (error) {
        console.warn('JobStore save hook failed', error)
      }
    }
    const job = this.getActiveJob()
    if (job?.id) {
      notifyJobChange(job.id, { type: 'save', job })
    }
    return job
  },
  count () {
    return getJobs().length
  },
  onChange (handler) {
    if (typeof handler !== 'function') return () => {}
    jobStoreListeners.add(handler)
    return () => {
      jobStoreListeners.delete(handler)
    }
  }
}

const AUDIT_STORAGE_KEY = 'csmate.audit.log.v1'
let auditCache = []

function loadAuditEntries () {
  if (!hasStorage()) return []
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('AuditLog load failed', error)
    return []
  }
}

auditCache = loadAuditEntries()

function persistAudit (entries) {
  if (!hasStorage()) return
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    console.warn('AuditLog persist failed', error)
  }
}

function normalizeAuditEntry (entry = {}) {
  const ts = Number.isFinite(entry.ts) ? entry.ts : Date.now()
  const normalized = {
    type: typeof entry.type === 'string' && entry.type ? entry.type : 'LOG',
    ts
  }
  if (entry.message != null) {
    normalized.message = String(entry.message)
  }
  if (entry.payload !== undefined) {
    normalized.payload = entry.payload
  }
  if (entry.scope) {
    normalized.scope = entry.scope
  }
  return normalized
}

const AuditLog = {
  append (entry) {
    const normalized = normalizeAuditEntry(entry)
    auditCache = [...auditCache, normalized]
    persistAudit(auditCache)
    return normalized
  },
  tail (count = 10) {
    const size = Number.isFinite(count) && count > 0 ? Math.floor(count) : 10
    return auditCache.slice(-size)
  },
  clear () {
    auditCache = []
    persistAudit(auditCache)
  },
  dump () {
    return auditCache.slice()
  }
}

function calcBaselineTest () {
  try {
    const core = new CalcCore()
    core.inputDigit(4)
    core.inputOperator('+')
    core.inputDigit(6)
    core.inputEquals()
    if (core.getDisplay() !== '10') return false
    core.clearAll()
    core.inputDigit(9)
    core.inputSqrt()
    return core.getDisplay() === '3'
  } catch (error) {
    console.warn('Calc baseline failed', error)
    return false
  }
}

const Calc = {
  test () {
    return calcBaselineTest()
  }
}

const Exports = {
  requireSagsinfo,
  exportAll,
  exportSingleSheet,
  registerPDFEngine,
  registerEkompletEngine
}

if (globalScope) {
  globalScope.JobStore = globalScope.JobStore ? Object.assign(globalScope.JobStore, JobStore) : JobStore
  globalScope.AuditLog = globalScope.AuditLog ? Object.assign(globalScope.AuditLog, AuditLog) : AuditLog
  globalScope.Calc = globalScope.Calc ? Object.assign(globalScope.Calc, Calc) : Calc
  globalScope.Exports = globalScope.Exports ? Object.assign(globalScope.Exports, Exports) : Exports
}

export function registerJobStoreHooks (options = {}) {
  if (typeof options.resolveActiveJob === 'function') {
    jobStoreActiveResolver = options.resolveActiveJob
  }
  if (typeof options.setActiveJob === 'function') {
    jobStoreActiveSetter = options.setActiveJob
  }
  if (typeof options.saveActiveJob === 'function') {
    jobStoreSaveHook = options.saveActiveJob
  }
}

export { JobStore, AuditLog, Calc, Exports }
