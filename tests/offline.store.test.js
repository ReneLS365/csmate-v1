import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

function createLocalStorageStub () {
  const store = new Map()
  return {
    get length () {
      return store.size
    },
    clear: () => {
      store.clear()
    },
    getItem: key => {
      const value = store.get(String(key))
      return value === undefined ? null : value
    },
    setItem: (key, value) => {
      store.set(String(key), String(value))
    },
    removeItem: key => {
      store.delete(String(key))
    }
  }
}

async function loadOfflineStore () {
  vi.resetModules()
  const storage = createLocalStorageStub()
  vi.stubGlobal('localStorage', storage)
  const module = await import('../app/src/state/offline-store.js')
  return { module, storage }
}

describe('offline-store', () => {
  let ensureOfflineUser
  let listJobs
  let upsertJob
  let cacheMaterialsForJob
  let cacheOfflineProfile
  let getCurrentUserOrOffline

  beforeEach(async () => {
    const { module } = await loadOfflineStore()
    ensureOfflineUser = module.ensureOfflineUser
    listJobs = module.listJobs
    upsertJob = module.upsertJob
    cacheMaterialsForJob = module.cacheMaterialsForJob
    cacheOfflineProfile = module.cacheOfflineProfile
    getCurrentUserOrOffline = module.getCurrentUserOrOffline
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates offline user and caches snapshot', () => {
    const offlineUser = ensureOfflineUser({ displayName: 'Test Offline' })
    expect(offlineUser).toBeTruthy()
    expect(offlineUser.offline).toBe(true)
    expect(offlineUser.displayName).toBe('Test Offline')

    const cached = JSON.parse(globalThis.localStorage.getItem('csmate.offline.user.v1'))
    expect(cached.displayName).toBe('Test Offline')
    expect(getCurrentUserOrOffline().displayName).toBe('Test Offline')

    const refreshed = cacheOfflineProfile({ roles: ['tenantAdmin'], tenants: [{ id: 'team-1', role: 'tenantAdmin' }] })
    expect(refreshed.roles).toContain('tenantAdmin')
    expect(refreshed.tenants[0].role).toBe('tenantAdmin')
  })

  it('upserts jobs and caches materials', () => {
    upsertJob({ id: 'job-1', name: 'Job 1' })
    expect(listJobs()).toHaveLength(1)
    cacheMaterialsForJob('job-1', [{ code: 'B-1', qty: 12 }])
    const job = listJobs().find(entry => entry.id === 'job-1')
    expect(job.materials[0].qty).toBe(12)
    cacheMaterialsForJob('job-2', [{ code: 'C-1', qty: 5 }])
    expect(listJobs().find(entry => entry.id === 'job-2')).toBeTruthy()
  })
})
