import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_REDIRECT_URI } from './auth0-config.js'
import { ensureUserFromAuth0, setCurrentUser } from './state/users.js'

const defaultState = Object.freeze({ isAuthenticated: false, user: null })

let auth0Client = null
let initPromise = null
let authState = cloneAuthState(defaultState)
const authStateListeners = new Set()
let labelResolver = null
let activeStoredUser = null
let redirectHandled = false

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

function setWindowActiveUser (user) {
  activeStoredUser = user || null
  if (typeof window === 'undefined') return
  const target = window.csmate
  if (!target || typeof target.setActiveUser !== 'function') return

  try {
    target.setActiveUser(activeStoredUser)
  } catch (error) {
    console.error('setActiveUser failed', error)
  }
}

function clearStoredUser () {
  setCurrentUser(null)
  setWindowActiveUser(null)
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

async function synchronizeAuthState (client) {
  if (!client) {
    authState = cloneAuthState(defaultState)
    clearStoredUser()
    updateAuthUi()
    notifyAuthStateListeners()
    return authState
  }

  let isAuthenticated = false
  let user = null

  try {
    isAuthenticated = await client.isAuthenticated()
    user = isAuthenticated ? await client.getUser() : null
    if (isAuthenticated && user) {
      applyStoredUserFromAuth0(user)
    } else {
      clearStoredUser()
    }
  } catch (error) {
    console.error('Failed to synchronize Auth0 state', error)
    isAuthenticated = false
    user = null
    clearStoredUser()
  }

  authState = { isAuthenticated, user }
  updateAuthUi()
  notifyAuthStateListeners()
  return authState
}

async function handleRedirectIfPresent (client) {
  if (redirectHandled || typeof window === 'undefined') return
  const query = window.location.search || ''
  if (!query.includes('code=') || !query.includes('state=')) {
    redirectHandled = true
    return
  }

  try {
    await client.handleRedirectCallback()
  } catch (error) {
    console.error('Auth0 redirect error', error)
  }

  try {
    const url = new URL(window.location.href)
    url.search = ''
    window.history.replaceState({}, document.title, url.toString())
  } catch (error) {
    console.error('Failed to clear Auth0 redirect params', error)
  }

  redirectHandled = true
}

function resolveDefaultLabel (state) {
  if (!state?.isAuthenticated || !state.user) return 'Ingen bruger'
  const { name, nickname, email } = state.user
  return name || nickname || email || 'Bruger'
}

function updateAuthUi () {
  if (typeof document === 'undefined') return

  const loginBtn = document.getElementById('btn-login')
  const logoutBtn = document.getElementById('btn-logout')
  const switchUserBtn = document.getElementById('btn-switch-user')
  const signupBtn = document.getElementById('btn-signup')
  const userLabel = document.getElementById('current-user-label')

  const isAuthenticated = authState.isAuthenticated

  if (loginBtn) {
    loginBtn.style.display = isAuthenticated ? 'none' : 'inline-flex'
    loginBtn.toggleAttribute('hidden', isAuthenticated)
  }

  if (signupBtn) {
    signupBtn.style.display = isAuthenticated ? 'none' : 'inline-flex'
    signupBtn.toggleAttribute('hidden', isAuthenticated)
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

function assignInlineHandlers () {
  if (typeof window === 'undefined') return
  window.csmateAuthLogin = login
  window.csmateAuthSignup = signup
  window.csmateAuthLogout = logout
}

function handleAuthButton (button, handler) {
  if (!button) return
  button.removeEventListener('click', handler)
  button.addEventListener('click', handler)
}

function onLoginButtonClick (event) {
  if (event?.preventDefault) event.preventDefault()
  login()
}

function onSignupButtonClick (event) {
  if (event?.preventDefault) event.preventDefault()
  signup()
}

function onLogoutButtonClick (event) {
  if (event?.preventDefault) event.preventDefault()
  logout()
}

function bindAuthButtonHandlers () {
  if (typeof document === 'undefined') return

  const loginBtn = document.getElementById('btn-login')
  const logoutBtn = document.getElementById('btn-logout')
  const switchUserBtn = document.getElementById('btn-switch-user')
  const signupBtn = document.getElementById('btn-signup')

  handleAuthButton(loginBtn, onLoginButtonClick)
  handleAuthButton(signupBtn, onSignupButtonClick)
  handleAuthButton(switchUserBtn, onLoginButtonClick)
  handleAuthButton(logoutBtn, onLogoutButtonClick)
}

export async function initAuth () {
  if (auth0Client) {
    return auth0Client
  }
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    const client = await createClient()
    if (!client) {
      auth0Client = null
      await synchronizeAuthState(null)
      return null
    }

    auth0Client = client
    await handleRedirectIfPresent(client)
    await synchronizeAuthState(client)
    return client
  })()

  try {
    const client = await initPromise
    return client
  } finally {
    initPromise = null
  }
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

export function setAuthLabelResolver (resolver) {
  if (typeof resolver === 'function') {
    labelResolver = resolver
  } else {
    labelResolver = null
  }
  updateAuthUi()
}

export function refreshAuthUi () {
  updateAuthUi()
}

async function ensureClient () {
  const client = await initAuth()
  assignInlineHandlers()
  return client
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

export async function signup () {
  const client = await ensureClient()
  if (!client) return

  try {
    await client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: getRedirectUri(),
        screen_hint: 'signup'
      }
    })
  } catch (error) {
    console.error('Auth0 signup failed', error)
  }
}

export async function logout () {
  const client = await ensureClient()

  clearStoredUser()
  authState = cloneAuthState(defaultState)
  updateAuthUi()
  notifyAuthStateListeners()

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

export function setupAuthUI () {
  assignInlineHandlers()
  bindAuthButtonHandlers()
  refreshAuthUi()
  initAuth().catch(error => {
    console.error('initAuth failed', error)
  })
}

assignInlineHandlers()

export { cloneAuthState }
