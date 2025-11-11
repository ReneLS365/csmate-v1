import { ensureUserFromAuth0, getCurrentUser, setCurrentUser } from '../state/users.js'

const defaultState = Object.freeze({
  isReady: false,
  isAuthenticated: false,
  user: null,
  roles: Object.freeze([])
})

let auth0Client = null
let authState = { ...defaultState, roles: [] }

function normalizeRolesEntries (entries) {
  if (!Array.isArray(entries)) return []
  return entries
    .map(entry => {
      if (!entry || typeof entry !== 'object') return null
      const tenantId = typeof entry.tenantId === 'string' && entry.tenantId.trim()
        ? entry.tenantId.trim()
        : null
      const role = typeof entry.role === 'string' && entry.role.trim()
        ? entry.role.trim()
        : null
      if (!tenantId || !role) return null
      return { tenantId, role }
    })
    .filter(Boolean)
}

function setWindowActiveUser (user) {
  if (typeof window === 'undefined') return
  const target = window.csmate
  if (!target || typeof target.setActiveUser !== 'function') return
  try {
    target.setActiveUser(user || null)
  } catch (error) {
    console.error('setActiveUser failed', error)
  }
}

function clearStoredUser () {
  let fallbackUser = null
  try {
    fallbackUser = setCurrentUser(null)
  } catch (error) {
    console.error('setCurrentUser(null) failed', error)
  }

  if (!fallbackUser) {
    try {
      fallbackUser = getCurrentUser()
    } catch (error) {
      console.error('getCurrentUser failed', error)
    }
  }

  setWindowActiveUser(fallbackUser || null)

  if (Array.isArray(authState.roles) && authState.roles.length) {
    authState.roles = []
  }
  if (typeof window !== 'undefined' && window.CSMATE_AUTH) {
    window.CSMATE_AUTH.roles = []
  }
}

function getWindowAuthSnapshot () {
  if (typeof window === 'undefined') return null
  const snapshot = window.CSMATE_AUTH
  if (!snapshot || typeof snapshot !== 'object') return null
  const roles = normalizeRolesEntries(snapshot.roles)
  const user = snapshot.user && typeof snapshot.user === 'object' ? { ...snapshot.user } : null
  return {
    isAuthenticated: Boolean(snapshot.isAuthenticated),
    user,
    roles,
    offline: Boolean(snapshot.offline)
  }
}

function applyStoredUserFromAuth0 (authUser) {
  if (!authUser) {
    clearStoredUser()
    return null
  }

  try {
    const storedUser = ensureUserFromAuth0(authUser)
    if (storedUser) {
      setWindowActiveUser(storedUser)
      return storedUser
    }
  } catch (error) {
    console.error('ensureUserFromAuth0 failed', error)
  }

  clearStoredUser()
  return null
}

if (typeof window !== 'undefined') {
  window.CSMATE_AUTH = window.CSMATE_AUTH || {
    isAuthenticated: false,
    user: null,
    roles: []
  }
}

function getConfig () {
  if (typeof window === 'undefined') return null
  const config = window.CSMATE_AUTH0_CONFIG
  if (!config || typeof config !== 'object') {
    console.error('CSMATE_AUTH0_CONFIG mangler eller er ugyldig')
    return null
  }
  return config
}

function publishState (state) {
  if (typeof window === 'undefined') return
  const offline = window.CSMATE_AUTH?.offline && !state.isAuthenticated
  const nextState = {
    ...state,
    roles: Array.isArray(state?.roles) ? state.roles.slice() : []
  }
  if (offline) {
    nextState.offline = true
  }
  window.CSMATE_AUTH = nextState
}

function cloneAuthState (state = authState) {
  return {
    isReady: Boolean(state?.isReady),
    isAuthenticated: Boolean(state?.isAuthenticated),
    user: state?.user ? { ...state.user } : null,
    roles: Array.isArray(state?.roles) ? state.roles.slice() : []
  }
}

async function syncUserWithBackend () {
  if (!authState.isAuthenticated || !authState.user) {
    authState.roles = []
    return
  }

  authState.roles = []

  const accessToken = await getAccessToken()
  if (!accessToken) {
    return
  }

  const user = authState.user || {}
  const sub = typeof user.sub === 'string' ? user.sub : ''
  const email = typeof user.email === 'string' ? user.email : ''
  const name =
    typeof user.name === 'string' && user.name.trim()
      ? user.name
      : typeof user.nickname === 'string'
        ? user.nickname
        : ''

  if (!sub || !email) {
    return
  }

  try {
    const response = await fetch('/.netlify/functions/auth-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        sub,
        email,
        name
      })
    })

    if (!response.ok) {
      let errorMessage = ''
      try {
        errorMessage = await response.text()
      } catch (error) {
        errorMessage = ''
      }
      console.error('auth-sync failed', errorMessage || response.statusText)
      return
    }

    let payload = null
    try {
      payload = await response.json()
    } catch (error) {
      console.error('auth-sync invalid JSON', error)
      return
    }

    if (!payload || typeof payload !== 'object') {
      return
    }

    authState.roles = normalizeRolesEntries(payload.roles)
  } catch (error) {
    console.error('auth-sync fetch error', error)
  }
}

async function createClient () {
  if (auth0Client) return auth0Client
  if (typeof window === 'undefined') return null
  if (typeof window.createAuth0Client !== 'function') {
    console.error('Auth0 SPA JS ikke indlæst')
    return null
  }

  const config = getConfig()
  if (!config) return null

  auth0Client = await window.createAuth0Client(config).catch(error => {
    console.error('Kunne ikke initialisere Auth0-klient', error)
    return null
  })
  return auth0Client
}

async function handleRedirectCallback (client) {
  if (typeof window === 'undefined') return
  const query = window.location.search || ''
  if (!query.includes('code=') || !query.includes('state=')) return
  try {
    await client.handleRedirectCallback()
    const url = new URL(window.location.href)
    url.search = ''
    window.history.replaceState({}, document.title, url.toString())
  } catch (error) {
    console.error('Auth0 redirect-fejl', error)
  }
}

export async function initAuth () {
  const client = await createClient()
  if (!client) {
    const snapshot = getWindowAuthSnapshot()
    if (snapshot) {
      authState = {
        isReady: true,
        isAuthenticated: snapshot.isAuthenticated,
        user: snapshot.user,
        roles: snapshot.roles
      }
      if (snapshot.isAuthenticated && snapshot.user) {
        applyStoredUserFromAuth0(snapshot.user)
      } else {
        setWindowActiveUser(getCurrentUser())
      }
    } else {
      authState = { ...defaultState, isReady: true, roles: [] }
      setWindowActiveUser(getCurrentUser())
    }
    publishState(authState)
    return cloneAuthState()
  }

  await handleRedirectCallback(client)

  try {
    const isAuthenticated = await client.isAuthenticated()
    const user = isAuthenticated ? await client.getUser() : null
    if (isAuthenticated && user) {
      applyStoredUserFromAuth0(user)
    } else {
      clearStoredUser()
    }
    authState = {
      isReady: true,
      isAuthenticated,
      user,
      roles: []
    }
    if (isAuthenticated && user) {
      await syncUserWithBackend()
    }
  } catch (error) {
    console.error('Kunne ikke læse Auth0-status', error)
    authState = { ...defaultState, isReady: true, roles: [] }
    clearStoredUser()
  }

  publishState(authState)
  return cloneAuthState()
}

export async function loginWithRedirect (options = {}) {
  const client = await createClient()
  if (!client) return
  try {
    await client.loginWithRedirect(options)
  } catch (error) {
    console.error('Auth0 login-fejl', error)
  }
}

export async function signupWithRedirect () {
  const client = await createClient()
  if (!client) return
  const baseParams = getConfig()?.authorizationParams || {}
  try {
    await client.loginWithRedirect({
      authorizationParams: {
        ...baseParams,
        screen_hint: 'signup'
      }
    })
  } catch (error) {
    console.error('Auth0 signup-fejl', error)
  }
}

export async function logout () {
  const client = await createClient()
  if (!client) return
  try {
    await client.logout({
      logoutParams: {
        returnTo: window.location.origin + '/'
      }
    })
  } catch (error) {
    console.error('Auth0 logout-fejl', error)
  }
}

export async function getAccessToken () {
  const client = await createClient()
  if (!client) return null
  try {
    return await client.getTokenSilently()
  } catch (error) {
    console.error('Kunne ikke hente access token', error)
    return null
  }
}

export function getAuthState () {
  return cloneAuthState()
}

export function getRoles () {
  return Array.isArray(authState.roles) ? authState.roles.slice() : []
}

export function isAdmin () {
  const roles = Array.isArray(authState.roles) ? authState.roles : []
  if (roles.some(role => role?.role === 'superadmin' || role?.role === 'tenant_admin')) {
    return true
  }
  const user = getCurrentUser()
  const role = typeof user?.role === 'string' ? user.role.trim() : ''
  return role === 'owner' || role === 'firmAdmin' || role === 'firma-admin'
}
