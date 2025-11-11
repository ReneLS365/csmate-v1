import { pendingCount } from './sync.js'

const DEV_HASHES = new Set(['#dev', '#devpanel'])
const DEV_PARAM_KEYS = new Set(['dev', 'devpanel'])
const INTENT_KEY = 'csmate:devpanel:intent'
const LAST_SYNC_KEY = 'csmate.sync.last'

const state = {
  options: {
    getActiveUser: () => null,
    getAuthSnapshot: () => null
  },
  host: null,
  section: null,
  mounted: false,
  listenersAttached: false,
  swVersion: null,
  swPromise: null,
  lastAuditSignature: ''
}

function normalizeRole (value) {
  if (!value) return ''
  return String(value).trim().toLowerCase()
}

function isAuthorized (user) {
  if (!user || typeof user !== 'object') return false
  const roles = Array.isArray(user.roles) ? user.roles.map(normalizeRole) : []
  const primary = normalizeRole(user.role)
  if (roles.includes('owner') || primary === 'owner') return true
  if (roles.includes('tenantadmin') || roles.includes('tenant_admin')) return true
  if (primary === 'tenantadmin' || primary === 'tenant_admin') return true
  return false
}

function persistIntent (value) {
  try {
    if (value) {
      sessionStorage.setItem(INTENT_KEY, '1')
    } else {
      sessionStorage.removeItem(INTENT_KEY)
    }
  } catch (error) {
    console.warn('Dev panel could not persist intent', error)
  }
}

function hasPersistedIntent () {
  try {
    return sessionStorage.getItem(INTENT_KEY) === '1'
  } catch {
    return false
  }
}

function hasHashIntent (hash = window.location.hash) {
  if (!hash) return false
  return DEV_HASHES.has(hash.toLowerCase())
}

function hasQueryIntent (search = window.location.search) {
  if (!search) return false
  let params
  try {
    params = new URLSearchParams(search)
  } catch {
    return false
  }
  for (const key of DEV_PARAM_KEYS) {
    if (!params.has(key)) continue
    const value = params.get(key)
    if (value === null) return true
    const trimmed = value.trim().toLowerCase()
    if (trimmed === '' || trimmed === '1' || trimmed === 'true' || trimmed === 'yes') return true
  }
  return false
}

function hasDevIntent (locationLike = window.location) {
  if (!locationLike) return false
  return hasHashIntent(locationLike.hash) || hasQueryIntent(locationLike.search) || hasPersistedIntent()
}

function clearHashIntent () {
  if (!hasHashIntent()) return
  try {
    const { origin, pathname, search } = window.location
    const next = `${origin}${pathname}${search}`
    window.history.replaceState({}, document.title, next)
  } catch (error) {
    console.warn('Could not clear dev hash', error)
  }
}

function ensureHelpTabVisible () {
  const helpButton = document.getElementById('tab-btn-help')
  if (helpButton && !helpButton.classList.contains('active')) {
    helpButton.click()
  }
}

function ensureHost () {
  if (state.host && document.body.contains(state.host)) return state.host
  const host = document.getElementById('tab-help')
  if (!host) return null
  state.host = host
  return host
}

function readBackupTimestamp () {
  try {
    return localStorage.getItem('csmate.backup.ts') || '-'
  } catch {
    return '-'
  }
}

function readLastSyncTimestamp () {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY)
    if (!raw) return null
    const num = Number(raw)
    if (!Number.isFinite(num)) return null
    return num
  } catch {
    return null
  }
}

function formatTimestamp (value) {
  if (!value) return '-'
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '-'
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

function formatTenant (user) {
  if (!user || typeof user !== 'object') return 'Ingen aktiv bruger'
  const tenants = Array.isArray(user.tenants) ? user.tenants : []
  if (!tenants.length) return 'Ingen tilknyttede tenants'
  const preferred = tenants.find(entry => normalizeRole(entry?.role) === 'owner' || normalizeRole(entry?.role) === 'tenantadmin') || tenants[0]
  const parts = []
  if (preferred?.name) parts.push(String(preferred.name))
  if (preferred?.slug) parts.push(String(preferred.slug))
  if (preferred?.id) parts.push(`#${preferred.id}`)
  return parts.join(' · ') || 'Ukendt tenant'
}

function formatUser (user) {
  if (!user || typeof user !== 'object') return 'Ingen bruger'
  const name = (user.displayName && String(user.displayName).trim()) || (user.name && String(user.name).trim()) || user.email || user.emailKey || 'Ukendt'
  const role = Array.isArray(user.roles) && user.roles.length ? user.roles[0] : (user.role || 'ukendt')
  return `${name} (${role})`
}

function formatAuthState (auth) {
  if (!auth || typeof auth !== 'object') return 'Offline (ingen Auth0 session)'
  const parts = []
  parts.push(auth.isAuthenticated ? 'Auth0: aktiv session' : 'Auth0: ikke logget ind')
  if (auth.offline) parts.push('Offline-mode')
  if (auth.lastSyncError) parts.push(`Seneste sync-fejl: ${auth.lastSyncError}`)
  return parts.join(' · ')
}

function getMetaNode (name) {
  if (!state.section) return null
  return state.section.querySelector(`[data-dev-meta="${name}"]`)
}

function updateMetaValue (name, value) {
  const node = getMetaNode(name)
  if (!node) return
  node.textContent = value == null || value === '' ? '-' : String(value)
}

function runHealthChecks () {
  if (!state.section) return
  const list = state.section.querySelector('[data-dev-health-list]')
  if (!list) return
  list.innerHTML = ''
  const add = (label, ok) => {
    const li = document.createElement('li')
    li.textContent = `${ok ? '✅' : '❌'} ${label}`
    list.append(li)
  }

  try {
    const id = window.JobStore?.create?.({ navn: '_dev_test' })
    if (id) {
      window.JobStore?.delete?.(id)
      add('JobStore write', true)
    } else {
      add('JobStore write', false)
    }
  } catch (error) {
    console.warn('Dev panel JobStore test failed', error)
    add('JobStore write', false)
  }

  try {
    const templateMeta = window.TemplateStore?.activeMeta?.()
    add('Template load', Boolean(templateMeta))
  } catch (error) {
    console.warn('Dev panel template test failed', error)
    add('Template load', false)
  }

  try {
    add('Beregning baseline', window.Calc?.test?.() === true)
  } catch (error) {
    console.warn('Dev panel calc test failed', error)
    add('Beregning baseline', false)
  }
}

function ensureSwVersion () {
  if (state.swVersion) return Promise.resolve(state.swVersion)
  if (state.swPromise) return state.swPromise
  state.swPromise = fetch('service-worker.js', { cache: 'no-store' })
    .then(response => response.ok ? response.text() : '')
    .then(text => {
      const match = text.match(/SW_VERSION\s*=\s*['"]([^'"]+)['"]/)
      state.swVersion = match?.[1] || 'ukendt'
      return state.swVersion
    })
    .catch(error => {
      console.warn('Dev panel could not read SW version', error)
      state.swVersion = 'ukendt'
      return state.swVersion
    })
    .finally(() => {
      state.swPromise = null
    })
  return state.swPromise
}

function updateAudit () {
  if (!state.section) return
  const auditNode = state.section.querySelector('[data-dev-audit]')
  if (!auditNode) return
  const tail = window.AuditLog?.tail?.(50) || []
  const text = JSON.stringify(tail, null, 2)
  if (text === state.lastAuditSignature) return
  auditNode.textContent = text
  state.lastAuditSignature = text
}

function updatePanel () {
  if (!state.section) return
  const user = state.options.getActiveUser?.() ?? null
  const auth = state.options.getAuthSnapshot?.() ?? null

  updateMetaValue('app', window.APP_VERSION || '0.0.0')
  updateMetaValue('template', window.TemplateStore?.activeMeta?.()?.name || 'ukendt')
  updateMetaValue('ua', navigator.userAgent)
  updateMetaValue('viewport', `${window.innerWidth}x${window.innerHeight}`)
  updateMetaValue('storage', `jobs=${window.JobStore?.count?.() || 0}, backup=${readBackupTimestamp()}`)
  updateMetaValue('tenant', formatTenant(user))
  updateMetaValue('user', formatUser(user))
  updateMetaValue('auth', formatAuthState(auth))
  updateMetaValue('pending', `${pendingCount()} ændring${pendingCount() === 1 ? '' : 'er'}`)
  updateMetaValue('sync', formatTimestamp(readLastSyncTimestamp()))
  updateMetaValue('connection', navigator.onLine ? 'Online' : 'Offline')

  updateAudit()

  ensureSwVersion().then(version => {
    updateMetaValue('sw', version || 'ukendt')
  })
}

function createSection () {
  const host = ensureHost()
  if (!host) return null
  const existing = host.querySelector('#dev')
  if (existing) {
    state.section = existing
    state.mounted = true
    return existing
  }

  const section = document.createElement('section')
  section.id = 'dev'
  section.className = 'dev-panel'
  section.setAttribute('role', 'region')
  section.setAttribute('aria-labelledby', 'devPanelHeading')
  section.setAttribute('tabindex', '-1')
  section.innerHTML = `
    <header class="dev-panel__header">
      <div>
        <h3 id="devPanelHeading">Developer panel</h3>
        <p class="muted">Diagnoseværktøj for ejere og admins</p>
      </div>
      <button type="button" class="btn small" data-dev-close>Skjul</button>
    </header>
    <div class="dev-panel__grid">
      <section class="dev-panel__card" aria-label="Meta information">
        <h4>Meta &amp; miljø</h4>
        <dl class="dev-panel__meta">
          <div><dt>App-version</dt><dd data-dev-meta="app">-</dd></div>
          <div><dt>SW-version</dt><dd data-dev-meta="sw">-</dd></div>
          <div><dt>Template</dt><dd data-dev-meta="template">-</dd></div>
          <div><dt>Viewport</dt><dd data-dev-meta="viewport">-</dd></div>
          <div><dt>User-agent</dt><dd data-dev-meta="ua">-</dd></div>
          <div><dt>Lokal storage</dt><dd data-dev-meta="storage">-</dd></div>
        </dl>
      </section>
      <section class="dev-panel__card" aria-label="Bruger og sync">
        <h4>Bruger &amp; synk</h4>
        <dl class="dev-panel__meta">
          <div><dt>Bruger</dt><dd data-dev-meta="user">-</dd></div>
          <div><dt>Tenant</dt><dd data-dev-meta="tenant">-</dd></div>
          <div><dt>Auth-status</dt><dd data-dev-meta="auth">-</dd></div>
          <div><dt>Sidste synk</dt><dd data-dev-meta="sync">-</dd></div>
          <div><dt>Pending ændringer</dt><dd data-dev-meta="pending">-</dd></div>
          <div><dt>Forbindelse</dt><dd data-dev-meta="connection">-</dd></div>
        </dl>
        <button type="button" class="btn small" data-dev-health>Kør health-check</button>
        <ul class="dev-panel__health" data-dev-health-list></ul>
      </section>
    </div>
    <section class="dev-panel__card" aria-label="Seneste handlinger">
      <h4>Seneste handlinger</h4>
      <pre data-dev-audit aria-live="polite"></pre>
    </section>
  `

  host.append(section)
  state.section = section
  state.mounted = true

  const closeBtn = section.querySelector('[data-dev-close]')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      persistIntent(false)
      clearHashIntent()
      teardownPanel()
    })
  }

  const healthBtn = section.querySelector('[data-dev-health]')
  if (healthBtn) {
    healthBtn.addEventListener('click', () => runHealthChecks())
  }

  return section
}

function teardownPanel () {
  if (!state.section) return
  state.section.remove()
  state.section = null
  state.mounted = false
  state.lastAuditSignature = ''
}

function evaluate ({ forceOpen = false, focus = false } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const user = state.options.getActiveUser?.() ?? null
  const allowed = isAuthorized(user)
  const wantsDev = hasDevIntent()

  if (!allowed) {
    if (forceOpen || wantsDev) {
      console.warn('Dev panel kræver owner eller tenant admin')
      persistIntent(false)
      clearHashIntent()
      teardownPanel()
    }
    return
  }

  const shouldOpen = forceOpen || wantsDev
  if (!shouldOpen) {
    if (state.mounted && !hasPersistedIntent()) {
      teardownPanel()
    }
    return
  }

  persistIntent(true)
  ensureHelpTabVisible()
  const section = createSection()
  if (!section) return
  updatePanel()
  if (focus) {
    window.requestAnimationFrame(() => {
      if (!state.section) return
      try {
        state.section.focus()
      } catch {}
    })
  }
}

function handleLocationChange () {
  evaluate({ reason: 'location' })
}

function handleDevRequest (event) {
  const detail = event?.detail || {}
  evaluate({
    reason: detail.reason || 'event',
    forceOpen: true,
    focus: detail.focus !== false
  })
}

function handleStorageEvent (event) {
  if (!event) return
  if (event.key === INTENT_KEY) {
    evaluate({ reason: 'storage' })
    return
  }
  if (event.key === LAST_SYNC_KEY && state.mounted) {
    updatePanel()
  }
}

function attachListeners () {
  if (state.listenersAttached || typeof window === 'undefined') return
  window.addEventListener('hashchange', handleLocationChange)
  window.addEventListener('popstate', handleLocationChange)
  window.addEventListener('csmate:devpanel-request', handleDevRequest)
  window.addEventListener('csmate:pending-change', () => updatePanel())
  window.addEventListener('online', () => updatePanel())
  window.addEventListener('offline', () => updatePanel())
  window.addEventListener('resize', () => updatePanel())
  window.addEventListener('storage', handleStorageEvent)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.mounted) {
      updatePanel()
    }
  })
  state.listenersAttached = true
}

export function mountDevIfHash (options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (options && typeof options.getActiveUser === 'function') {
    state.options.getActiveUser = options.getActiveUser
  }
  if (options && typeof options.getAuthSnapshot === 'function') {
    state.options.getAuthSnapshot = options.getAuthSnapshot
  }

  attachListeners()

  const forceOpen = Boolean(options.forceOpen)
  const focus = options.focus !== false && Boolean(options.forceOpen || hasDevIntent())
  if (forceOpen && options.persist !== false) {
    persistIntent(true)
  }

  evaluate({ reason: options.reason || 'manual', forceOpen, focus })
}

export function teardownDevPanelForTests () {
  teardownPanel()
  persistIntent(false)
  state.swVersion = null
  state.swPromise = null
}
