const JOBS_STORAGE_KEY = 'csmate.jobs.v1';
let jobsCache = null;
let auditUserResolver = null;
let offlineStoreSyncPromise = null;

function ensureOfflineStoreModule() {
  if (offlineStoreSyncPromise) return offlineStoreSyncPromise;
  if (typeof localStorage === 'undefined') return null;
  offlineStoreSyncPromise = import('./src/state/offline-store.js').catch(error => {
    console.warn('Offline store sync fejlede', error);
    return null;
  });
  return offlineStoreSyncPromise;
}

function syncOfflineJobsCache(jobs) {
  const modulePromise = ensureOfflineStoreModule();
  if (!modulePromise || typeof modulePromise.then !== 'function') return;
  modulePromise
    .then(module => {
      if (module && typeof module.replaceJobsCache === 'function') {
        module.replaceJobsCache(jobs);
      }
    })
    .catch(error => {
      console.warn('Offline job-cache sync fejl', error);
    });
}

function readJobsFromStorage() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(job => ({ ...job }));
  } catch (error) {
    console.warn('Kunne ikke læse jobs fra storage', error);
    return [];
  }
}

function writeJobsToStorage(jobs) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
    syncOfflineJobsCache(jobs);
  } catch (error) {
    console.warn('Kunne ikke gemme jobs', error);
  }
}

function ensureJobs() {
  if (!Array.isArray(jobsCache)) {
    jobsCache = readJobsFromStorage();
  }
  return jobsCache;
}

export function loadJobs() {
  jobsCache = readJobsFromStorage();
  return jobsCache.slice();
}

export function getJobs() {
  return ensureJobs().slice();
}

export function saveJobs(nextJobs) {
  const jobs = Array.isArray(nextJobs) ? nextJobs.map(job => ({ ...job })) : [];
  jobsCache = jobs;
  writeJobsToStorage(jobsCache);
  return jobsCache.slice();
}

function generateJobId() {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${now}-${rand}`;
}

function applyPartial(target, partial) {
  if (!target || !partial) return target;
  Object.keys(partial).forEach(key => {
    const value = partial[key];
    if (value !== undefined) {
      target[key] = value;
    }
  });
  return target;
}

export function createJob(data = {}) {
  const jobs = ensureJobs();
  const timestamp = Date.now();
  const job = {
    id: generateJobId(),
    sagsnummer: '',
    navn: '',
    adresse: '',
    kunde: '',
    dato: '',
    montorer: '',
    systems: Array.isArray(data.systems) ? data.systems.slice() : [],
    status: data.status || 'montage',
    sheets: data.sheets ? { ...data.sheets } : {},
    createdAt: timestamp,
    updatedAt: timestamp,
    isLocked: !!data.isLocked,
    sentToOfficeAt: data.sentToOfficeAt || null,
    auditLog: Array.isArray(data.auditLog) ? data.auditLog.slice() : [],
  };

  applyPartial(job, data);
  if (!job.auditLog) job.auditLog = [];
  jobs.push(job);
  saveJobs(jobs);
  return { ...job };
}

export function updateJob(jobId, updater) {
  const jobs = ensureJobs();
  const index = jobs.findIndex(job => job.id === jobId);
  if (index === -1) return null;
  const existing = jobs[index];
  let updated = existing;
  if (typeof updater === 'function') {
    updated = updater({ ...existing });
  } else if (updater && typeof updater === 'object') {
    updated = { ...existing };
    applyPartial(updated, updater);
  }
  if (!updated) return null;
  updated.updatedAt = Date.now();
  jobs[index] = updated;
  saveJobs(jobs);
  return { ...updated };
}

export function deleteJob(jobId) {
  const jobs = ensureJobs();
  const index = jobs.findIndex(job => job.id === jobId);
  if (index === -1) return null;
  const [removed] = jobs.splice(index, 1);
  saveJobs(jobs);
  return removed ? { ...removed } : null;
}

export function findJobById(jobId) {
  return ensureJobs().find(job => job.id === jobId) || null;
}

export function setAuditUserResolver(resolver) {
  if (typeof resolver === 'function') {
    auditUserResolver = resolver;
  } else {
    auditUserResolver = null;
  }
}

export function appendAuditLog(jobId, entry) {
  if (!entry || typeof entry !== 'object') return null;
  return updateJob(jobId, job => {
    const next = { ...job };
    if (!Array.isArray(next.auditLog)) {
      next.auditLog = [];
    }
    next.auditLog = next.auditLog.slice();
    next.auditLog.push({
      timestamp: Date.now(),
      user: typeof auditUserResolver === 'function' ? auditUserResolver() : null,
      scope: entry.scope || 'job',
      message: entry.message || '',
      diff: entry.diff,
    });
    return next;
  });
}

export function lockJob(jobId) {
  let changed = false;
  const job = updateJob(jobId, current => {
    if (!current) return current;
    if (current.isLocked) return current;
    changed = true;
    return { ...current, isLocked: true };
  });
  if (changed) {
    appendAuditLog(jobId, {
      scope: 'status',
      message: 'Job låst (akkordseddel)',
    });
  }
  return job;
}

export function markJobSent(jobId) {
  const job = updateJob(jobId, current => {
    if (!current) return current;
    return { ...current, sentToOfficeAt: Date.now() };
  });
  if (job) {
    appendAuditLog(jobId, {
      scope: 'status',
      message: 'Job markeret som fremsendt til kontor',
    });
  }
  return job;
}

export { JOBS_STORAGE_KEY };
