import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_REDIRECT_URI } from './auth0-config.js'

let auth0Client = null

export async function initAuth0 () {
  if (typeof window === 'undefined' || typeof window.createAuth0Client !== 'function') {
    console.warn('Auth0 SDK ikke indlæst – springer Auth0-init over')
    return null
  }

  if (auth0Client) return auth0Client

  auth0Client = await window.createAuth0Client({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
    authorizationParams: { redirect_uri: AUTH0_REDIRECT_URI }
  })

  if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
    await auth0Client.handleRedirectCallback()
    window.history.replaceState({}, document.title, window.location.origin)
  }

  return auth0Client
}

export async function getAuthState () {
  if (!auth0Client) return { isAuthenticated: false, user: null }

  const isAuthenticated = await auth0Client.isAuthenticated()
  const user = isAuthenticated ? await auth0Client.getUser() : null

  return { isAuthenticated, user }
}

export async function loginWithAuth0 () {
  if (!auth0Client) return
  await auth0Client.loginWithRedirect()
}

export function logoutFromAuth0 () {
  if (!auth0Client) return
  auth0Client.logout({ logoutParams: { returnTo: AUTH0_REDIRECT_URI } })
}
