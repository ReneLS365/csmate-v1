const MAX_ERROR_ENTRIES = 10

const ACCESS_ROLES = new Set(['owner', 'admin', 'tenantadmin', 'tenant_admin'])

let swVersionCache = null
let swVersionPromise = null

function getWindow () {
  return typeof window !== 'undefined' ? window : undefined
}

function ensureGlobalState () {
  const win = getWindow()
  if (!win) return
  win.csmate = win.csmate || {}
  const buffer = Array.isArray(win.csmate.errors) ? [...win.csmate.errors] : []
  win.csmate.errors = buffer.slice(-MAX_ERROR_ENTRIES)
  if (!win.csmate.__devPanelListenersAttached) {
    const record = entry => {
      try {
        const target = win.csmate.errors
        target.push(entry)
        if (target.length > MAX_ERROR_ENTRIES) {
          target.splice(0, target.length - MAX_ERROR_ENTRIES)
        }
      } catch (error) {
        console.warn('Dev panel kunne ikke registrere fejl', error)
      }
    }

    win.addEventListener('error', event => {
      if (!event) return
      const stack = event?.error?.stack || ''
      const message = event?.message || event?.error?.message || 'Ukendt fejl'
      record({
        ts: Date.now(),
        msg: message,
        stack: typeof stack === 'string' ? stack : ''
      })
    })

    win.addEventListener('unhandledrejection', event => {
      if (!event) return
      const reason = event.reason
      const message = typeof reason === 'string' ? reason : reason?.message || 'Unhandled rejection'
      const stack = reason instanceof Error ? reason.stack : ''
      record({
        ts: Date.now(),
        msg: message,
        stack: typeof stack === 'string' ? stack : ''
      })
    })

    win.csmate.__devPanelListenersAttached = true
  }
}

ensureGlobalState()

function extractVersionFromString (value) {
  if (!value || typeof value !== 'string') return ''
  const match = value.match(/v\d{8}T\d{6}/i)
  return match ? match[0] : ''
}

function parseVersionFromSwSource (text) {
  if (!text || typeof text !== 'string') return ''
  const swMatch = text.match(/SW_VERSION\s*=\s*['"]([^'\"]+)['"]/)
  if (swMatch?.[1]) return swMatch[1]
  const versionMatch = text.match(/const\s+VERSION\s*=\s*['"]([^'\"]+)['"]/)
  return versionMatch?.[1] || ''
}

async function resolveServiceWorkerVersion () {
  if (swVersionCache) return swVersionCache
  if (swVersionPromise) return swVersionPromise

  const win = getWindow()
  const initial = win?.csmate?.swVersion
  if (typeof initial === 'string' && initial) {
    swVersionCache = initial
    return swVersionCache
  }

  const fromController = win?.navigator?.serviceWorker?.controller?.scriptURL || win?.navigator?.serviceWorker?.controller?.scriptUrl
  const fromRegistration = win?.navigator?.serviceWorker?.ready?.then?.(registration => registration?.active?.scriptURL || registration?.active?.scriptUrl)
  const immediateVersion = extractVersionFromString(fromController)
  if (immediateVersion) {
    swVersionCache = immediateVersion
    win.csmate.swVersion = swVersionCache
    return swVersionCache
  }

  if (fromRegistration && typeof fromRegistration.then === 'function') {
    try {
      const scriptURL = await fromRegistration
      const regVersion = extractVersionFromString(scriptURL)
      if (regVersion) {
        swVersionCache = regVersion
        win.csmate.swVersion = swVersionCache
        return swVersionCache
      }
    } catch {}
  }

  swVersionPromise = (win?.fetch ? win.fetch('service-worker.js', { cache: 'no-store' }) : Promise.reject(new Error('fetch unavailable')))
    .then(response => (response?.ok ? response.text() : ''))
    .then(text => {
      const parsed = parseVersionFromSwSource(text)
      swVersionCache = parsed || ''
      if (win) {
        win.csmate = win.csmate || {}
        win.csmate.swVersion = swVersionCache
      }
      return swVersionCache
    })
    .catch(() => '')
    .finally(() => {
      swVersionPromise = null
    })

  return swVersionPromise
}

function formatBuildTime (version) {
  if (!version) return 'Ukendt'
  const match = version.match(/v(\d{8})T(\d{6})/i)
  if (!match) return 'Ukendt'
  const [, datePart, timePart] = match
  const iso = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}T${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}Z`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Ukendt'
  try {
    return date.toLocaleString('da-DK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return date.toISOString()
  }
}

function ensureDialog () {
  if (typeof document === 'undefined') return null
  return document.getElementById('dev-panel')
}

function hasAccess () {
  const win = getWindow()
  const user = win?.csmate?.currentUser
  if (!user || typeof user !== 'object') return false
  const collected = []
  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      if (typeof role === 'string') collected.push(role.toLowerCase())
    }
  }
  if (typeof user.role === 'string') {
    collected.push(user.role.toLowerCase())
  }
  return collected.some(role => ACCESS_ROLES.has(role))
}

function renderErrorLog (dialog) {
  const list = dialog.querySelector('.error-log')
  if (!list) return
  list.innerHTML = ''
  const win = getWindow()
  const errors = Array.isArray(win?.csmate?.errors) ? win.csmate.errors : []
  if (!errors.length) {
    const empty = document.createElement('li')
    empty.textContent = 'Ingen fejl registreret'
    list.append(empty)
    return
  }
  for (const entry of errors) {
    const li = document.createElement('li')
    li.className = 'error-entry'

    const heading = document.createElement('div')
    heading.className = 'error-entry__heading'

    const time = document.createElement('time')
    time.className = 'error-entry__time'
    const date = new Date(Number(entry?.ts) || Date.now())
    time.dateTime = date.toISOString()
    try {
      time.textContent = date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      time.textContent = date.toISOString()
    }

    const message = document.createElement('span')
    message.className = 'error-entry__message'
    message.textContent = entry?.msg || 'Ukendt fejl'

    heading.append(time)
    heading.append(document.createTextNode(' – '))
    heading.append(message)
    li.append(heading)

    if (entry?.stack) {
      const stack = document.createElement('pre')
      stack.className = 'error-entry__stack'
      stack.textContent = entry.stack
      li.append(stack)
    }

    list.append(li)
  }
}

function updateMetaSection (dialog, { version, buildTime, tenant, email }) {
  const swNode = dialog.querySelector('.swver')
  if (swNode) swNode.textContent = version || 'N/A'
  const buildNode = dialog.querySelector('.build-time')
  if (buildNode) buildNode.textContent = buildTime || 'Ukendt'
  const tenantNode = dialog.querySelector('.tenant')
  if (tenantNode) tenantNode.textContent = tenant || '–'
  const userNode = dialog.querySelector('.tenant-user')
  if (userNode) userNode.textContent = email || '–'
}

export async function openDevPanel () {
  const dialog = ensureDialog()
  if (!dialog) return null

  if (!hasAccess()) {
    const win = getWindow()
    if (win?.alert) win.alert('Kun admin adgang')
    return null
  }

  if (typeof dialog.showModal === 'function') {
    try {
      dialog.showModal()
    } catch (error) {
      console.warn('Kunne ikke åbne dev-panel', error)
      dialog.setAttribute('open', '')
    }
  } else {
    dialog.setAttribute('open', '')
  }

  renderErrorLog(dialog)

  const win = getWindow()
  const user = win?.csmate?.currentUser
  const tenantId = Array.isArray(user?.tenants)
    ? (user.tenants.find(entry => entry?.id)?.id ?? user.tenants[0]?.slug ?? user.tenants[0]?.name)
    : undefined
  const email = typeof user?.email === 'string' ? user.email : (typeof user?.user?.email === 'string' ? user.user.email : '')

  let version = ''
  try {
    version = await resolveServiceWorkerVersion()
  } catch {
    version = ''
  }
  const buildTime = formatBuildTime(version)

  updateMetaSection(dialog, { version: version || 'N/A', buildTime, tenant: tenantId || '–', email: email || '–' })

  return dialog
}

export default openDevPanel
