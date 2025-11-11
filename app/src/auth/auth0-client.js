import {
  ensureUserFromAuth0,
  getCurrentUser,
  setCurrentUser,
  mergeRemoteUserProfile
} from '../state/users.js'

const defaultState = Object.freeze({
  isReady: false,
  isAuthenticated: false,
  user: null,
  profile: null,
  lastSyncError: null
})

let auth0Client = null
let authState = { ...defaultState }

function cloneProfile (profile) {
  if (!profile || typeof profile !== 'object') return null
  const copy = { ...profile }
  if (Array.isArray(copy.roles)) {
    copy.roles = copy.roles.slice()
  }
  if (Array.isArray(copy.tenants)) {
    copy.tenants = copy.tenants.map(entry => ({ ...entry }))
  }
  if (copy.metadata && typeof copy.metadata === 'object') {
    copy.metadata = { ...copy.metadata }
  }
  return copy
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
  authState.profile = fallbackUser ? cloneProfile(fallbackUser) : null
  if (typeof window !== 'undefined' && window.CSMATE_AUTH) {
    window.CSMATE_AUTH.profile = authState.profile
  }
}

function getWindowAuthSnapshot () {
  if (typeof window === 'undefined') return null
  const snapshot = window.CSMATE_AUTH
  if (!snapshot || typeof snapshot !== 'object') return null
  const user = snapshot.user && typeof snapshot.user === 'object' ? { ...snapshot.user } : null
  const profile = cloneProfile(snapshot.profile)
  return {
    isAuthenticated: Boolean(snapshot.isAuthenticated),
    user,
    profile,
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
      authState.profile = cloneProfile(storedUser)
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
    profile: null
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
    profile: cloneProfile(state?.profile)
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
    profile: cloneProfile(state?.profile),
    lastSyncError: state?.lastSyncError || null
  }
}

async function syncUserWithBackend () {
  if (!authState.isAuthenticated || !authState.user) {
    authState.profile = cloneProfile(getCurrentUser())
    authState.lastSyncError = null
    return null
  }

  authState.lastSyncError = null

  const accessToken = await getAccessToken()
  if (!accessToken) {
    authState.lastSyncError = 'missing_token'
    return null
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
    authState.lastSyncError = 'missing_claims'
    return null
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
      const message = errorMessage || response.statusText
      authState.lastSyncError = message || `HTTP_${response.status}`
      console.error('auth-sync failed', message)
      return null
    }

    let payload = null
    try {
      payload = await response.json()
    } catch (error) {
      authState.lastSyncError = 'invalid_json'
      console.error('auth-sync invalid JSON', error)
      return null
    }

    if (!payload || typeof payload !== 'object') {
      authState.lastSyncError = 'invalid_payload'
      return null
    }

    const profilePayload = payload.user || null
    if (!profilePayload || typeof profilePayload !== 'object') {
      authState.lastSyncError = 'missing_user'
      return null
    }

    const merged = mergeRemoteUserProfile({
      ...profilePayload,
      authId: sub,
      email,
      displayName: profilePayload.displayName || name || email
    })

    if (merged) {
      authState.profile = cloneProfile(merged)
      setWindowActiveUser(merged)
      authState.lastSyncError = null
      return merged
    }

    authState.lastSyncError = 'merge_failed'
    return null
  } catch (error) {
    authState.lastSyncError = error?.message || 'fetch_failed'
    console.error('auth-sync fetch error', error)
    return null
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
        profile: snapshot.profile || cloneProfile(getCurrentUser()),
        lastSyncError: null
      }
      if (snapshot.isAuthenticated && snapshot.user) {
        const stored = applyStoredUserFromAuth0(snapshot.user)
        if (stored) {
          authState.profile = cloneProfile(stored)
        }
      } else {
        const fallback = getCurrentUser()
        setWindowActiveUser(fallback)
        authState.profile = cloneProfile(fallback)
      }
    } else {
      const fallback = getCurrentUser()
      authState = { ...defaultState, isReady: true, profile: cloneProfile(fallback) }
      setWindowActiveUser(fallback)
    }
    publishState(authState)
    return cloneAuthState()
  }

  await handleRedirectCallback(client)

  try {
    const isAuthenticated = await client.isAuthenticated()
    const user = isAuthenticated ? await client.getUser() : null
    let profile = null
    if (isAuthenticated && user) {
      const stored = applyStoredUserFromAuth0(user)
      profile = stored ? cloneProfile(stored) : cloneProfile(getCurrentUser())
    } else {
      clearStoredUser()
      profile = cloneProfile(getCurrentUser())
    }
    authState = {
      isReady: true,
      isAuthenticated,
      user,
      profile,
      lastSyncError: null
    }
    if (isAuthenticated && user) {
      const merged = await syncUserWithBackend()
      if (merged) {
        authState.profile = cloneProfile(merged)
      } else if (!authState.profile) {
        authState.profile = cloneProfile(getCurrentUser())
      }
    }
  } catch (error) {
    console.error('Kunne ikke læse Auth0-status', error)
    clearStoredUser()
    authState = {
      ...defaultState,
      isReady: true,
      profile: cloneProfile(getCurrentUser()),
      lastSyncError: error?.message || null
    }
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

export function getUserProfileSnapshot () {
  const profile = authState.profile || getCurrentUser()
  return cloneProfile(profile)
}
