import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_REDIRECT_URI } from './auth0-config.js'

let auth0Client = null
let authState = {
  isAuthenticated: false,
  user: null
}
const authStateListeners = new Set()
let labelResolver = null

function cloneAuthState (state) {
  if (!state) return { isAuthenticated: false, user: null }
  const { isAuthenticated, user } = state
  return {
    isAuthenticated: Boolean(isAuthenticated),
    user: user ? { ...user } : null
  }
}

function notifyAuthStateListeners () {
  const snapshot = cloneAuthState(authState)
  authStateListeners.forEach(listener => {
    try {
      listener(snapshot)
    } catch (error) {
      console.error('Auth listener failed', error)
    }
  })
}

function getRedirectUri () {
  if (typeof AUTH0_REDIRECT_URI === 'string' && AUTH0_REDIRECT_URI.trim().length > 0) {
    return AUTH0_REDIRECT_URI
  }
  return typeof window !== 'undefined' ? window.location.origin : undefined
}

function getCreateClientFn () {
  if (typeof window === 'undefined') return null
  if (window.auth0 && typeof window.auth0.createAuth0Client === 'function') {
    return window.auth0.createAuth0Client.bind(window.auth0)
  }
  if (typeof window.createAuth0Client === 'function') {
    return window.createAuth0Client
  }
  return null
}

async function createClient () {
  const createFn = getCreateClientFn()
  if (!createFn) {
    console.error('Auth0 SPA JS is not loaded correctly')
    return null
  }

  try {
    const client = await createFn({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      authorizationParams: {
        redirect_uri: getRedirectUri()
      }
    })
    return client
  } catch (error) {
    console.error('Failed to create Auth0 client', error)
    return null
  }
}

async function refreshAuthState () {
  if (!auth0Client) {
    authState = { isAuthenticated: false, user: null }
    updateAuthUI()
    notifyAuthStateListeners()
    return authState
  }

  try {
    const isAuthenticated = await auth0Client.isAuthenticated()
    const user = isAuthenticated ? await auth0Client.getUser() : null
    authState = { isAuthenticated, user }
  } catch (error) {
    console.error('Failed to refresh Auth0 state', error)
    authState = { isAuthenticated: false, user: null }
  }

  updateAuthUI()
  notifyAuthStateListeners()
  return authState
}

async function handleRedirectIfPresent () {
  if (typeof window === 'undefined') return
  const query = window.location.search || ''
  if (!query.includes('code=') || !query.includes('state=')) return

  try {
    await auth0Client.handleRedirectCallback()
    const url = new URL(window.location.href)
    url.search = ''
    window.history.replaceState({}, document.title, url.toString())
  } catch (error) {
    console.error('Auth0 redirect error', error)
  }
}

export async function initAuth () {
  if (auth0Client) return auth0Client

  auth0Client = await createClient()
  if (!auth0Client) {
    await refreshAuthState()
    return null
  }

  await handleRedirectIfPresent()
  await refreshAuthState()
  return auth0Client
}

export function getAuthState () {
  return cloneAuthState(authState)
}

export function onAuthStateChange (listener) {
  if (typeof listener !== 'function') return () => {}
  authStateListeners.add(listener)
  try {
    listener(cloneAuthState(authState))
  } catch (error) {
    console.error('Auth listener failed', error)
  }
  return () => {
    authStateListeners.delete(listener)
  }
}

function resolveDefaultLabel (state) {
  if (!state?.isAuthenticated || !state.user) return 'Ingen bruger'
  const { name, nickname, email } = state.user
  return name || nickname || email || 'Bruger'
}

function updateAuthUI () {
  if (typeof document === 'undefined') return

  const loginBtn = document.getElementById('btn-login')
  const logoutBtn = document.getElementById('btn-logout')
  const switchUserBtn = document.getElementById('btn-switch-user')
  const userLabel = document.getElementById('current-user-label')

  const isAuthenticated = authState.isAuthenticated

  if (loginBtn) {
    loginBtn.style.display = isAuthenticated ? 'none' : 'inline-flex'
    loginBtn.toggleAttribute('hidden', isAuthenticated)
  }

  if (logoutBtn) {
    logoutBtn.style.display = isAuthenticated ? 'inline-flex' : 'none'
    logoutBtn.toggleAttribute('hidden', !isAuthenticated)
  }

  if (switchUserBtn) {
    switchUserBtn.style.display = isAuthenticated ? 'inline-flex' : 'none'
    switchUserBtn.toggleAttribute('hidden', !isAuthenticated)
  }

  if (userLabel) {
    const labelText = labelResolver
      ? labelResolver(cloneAuthState(authState))
      : resolveDefaultLabel(authState)
    userLabel.textContent = labelText
  }
}

export function setAuthLabelResolver (resolver) {
  if (typeof resolver === 'function') {
    labelResolver = resolver
  } else {
    labelResolver = null
  }
  updateAuthUI()
}

export function refreshAuthUi () {
  updateAuthUI()
}

async function ensureClient () {
  if (auth0Client) return auth0Client
  return initAuth()
}

export async function login () {
  const client = await ensureClient()
  if (!client) return

  try {
    await client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: getRedirectUri()
      }
    })
  } catch (error) {
    console.error('Auth0 login failed', error)
  }
}

export async function logout () {
  const client = await ensureClient()
  if (!client) return

  try {
    await client.logout({
      logoutParams: {
        returnTo: getRedirectUri()
      }
    })
  } catch (error) {
    console.error('Auth0 logout failed', error)
  }
}

export async function switchUser () {
  const client = await ensureClient()
  if (!client) return

  try {
    await client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: getRedirectUri(),
        prompt: 'login'
      }
    })
  } catch (error) {
    console.error('Auth0 switch user failed', error)
  }
}

export function setupAuthUI () {
  if (typeof document === 'undefined') return

  const loginBtn = document.getElementById('btn-login')
  const logoutBtn = document.getElementById('btn-logout')
  const switchUserBtn = document.getElementById('btn-switch-user')

  loginBtn?.addEventListener('click', event => {
    event.preventDefault()
    login()
  })

  logoutBtn?.addEventListener('click', event => {
    event.preventDefault()
    logout()
  })

  switchUserBtn?.addEventListener('click', event => {
    event.preventDefault()
    switchUser()
  })

  initAuth().catch(error => {
    console.error('initAuth failed', error)
  })
}
