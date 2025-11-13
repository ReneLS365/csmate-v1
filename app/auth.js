import { AUTH0_DOMAIN as CONFIG_DOMAIN, AUTH0_CLIENT_ID as CONFIG_CLIENT_ID } from './src/auth0-config.js';

const AUTH0_AUDIENCE = 'https://csmate.netlify.app/api';
const ROLE_NAMESPACE = 'https://csmate.app';

let auth0Client = typeof window !== 'undefined' ? window.__CSMATE_AUTH0_CLIENT || null : null;
let auth0ClientFactoryPromise = null;

function resolveConfig() {
  if (typeof window === 'undefined') {
    return {
      domain: CONFIG_DOMAIN || '',
      clientId: CONFIG_CLIENT_ID || '',
      authorizationParams: {
        redirect_uri: '',
        audience: AUTH0_AUDIENCE
      },
      cacheLocation: 'memory',
      useRefreshTokens: true
    };
  }

  const globalConfig = (window.CSMATE_AUTH0_CONFIG && typeof window.CSMATE_AUTH0_CONFIG === 'object')
    ? { ...window.CSMATE_AUTH0_CONFIG }
    : {};

  const domain = CONFIG_DOMAIN || globalConfig.domain || '';
  const clientId = CONFIG_CLIENT_ID || globalConfig.clientId || '';

  const providedAuthorizationParams = globalConfig.authorizationParams || {};
  const authorizationParams = {
    ...providedAuthorizationParams,
    redirect_uri: typeof providedAuthorizationParams.redirect_uri === 'string'
      && providedAuthorizationParams.redirect_uri
      ? providedAuthorizationParams.redirect_uri
      : window.location.origin,
    audience: providedAuthorizationParams.audience || AUTH0_AUDIENCE
  };

  const config = {
    ...globalConfig,
    domain,
    clientId,
    authorizationParams,
    cacheLocation: globalConfig.cacheLocation || 'memory',
    useRefreshTokens: typeof globalConfig.useRefreshTokens === 'boolean'
      ? globalConfig.useRefreshTokens
      : true
  };

  return config;
}

const baseConfig = resolveConfig();

if (typeof window !== 'undefined') {
  window.CSMATE_AUTH0_CONFIG = baseConfig;
}

async function loadAuth0ClientFactory() {
  if (auth0ClientFactoryPromise) return auth0ClientFactoryPromise;
  if (typeof window === 'undefined') return null;

  auth0ClientFactoryPromise = import('https://cdn.jsdelivr.net/npm/@auth0/auth0-spa-js@2.6.0/dist/auth0-spa-js.production.esm.js')
    .then(module => {
      const factory = module?.createAuth0Client;
      if (typeof factory !== 'function') {
        throw new Error('Auth0 SDK kunne ikke indlæses korrekt');
      }
      if (typeof window.createAuth0Client !== 'function') {
        window.createAuth0Client = factory;
      }
      return factory;
    })
    .catch(error => {
      console.error('Kunne ikke indlæse Auth0 SDK', error);
      throw error;
    });

  return auth0ClientFactoryPromise;
}

async function ensureRedirectHandled(client) {
  if (typeof window === 'undefined' || !client) return;
  if (window.__CSMATE_AUTH0_REDIRECT_HANDLED) return;

  const query = window.location.search || '';
  if (query.includes('code=') && query.includes('state=')) {
    try {
      await client.handleRedirectCallback();
    } catch (error) {
      console.error('Auth0 redirect error', error);
    } finally {
      try {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
      } catch (historyError) {
        console.error('History replaceState failed after Auth0 redirect', historyError);
      }
    }
  }

  window.__CSMATE_AUTH0_REDIRECT_HANDLED = true;
}

export async function initAuth() {
  if (auth0Client) {
    await ensureRedirectHandled(auth0Client);
    return auth0Client;
  }

  if (typeof window === 'undefined') return null;

  if (window.__CSMATE_AUTH0_CLIENT) {
    auth0Client = window.__CSMATE_AUTH0_CLIENT;
    await ensureRedirectHandled(auth0Client);
    return auth0Client;
  }

  const createAuth0Client = await loadAuth0ClientFactory().catch(error => {
    console.error('Auth0 SDK kunne ikke indlæses', error);
    return null;
  });

  if (typeof createAuth0Client !== 'function') return null;

  auth0Client = await createAuth0Client(baseConfig).catch(error => {
    console.error('Kunne ikke initialisere Auth0-klient', error);
    return null;
  });

  if (!auth0Client) return null;

  window.__CSMATE_AUTH0_CLIENT = auth0Client;
  await ensureRedirectHandled(auth0Client);
  return auth0Client;
}

export function getAuthClient() {
  return auth0Client;
}

export async function isAuthenticated() {
  const client = await initAuth();
  if (!client) return false;
  return client.isAuthenticated();
}

export async function login(options = {}) {
  const client = await initAuth();
  if (!client) return null;
  return client.loginWithRedirect(options);
}

export async function logout() {
  const client = await initAuth();
  if (!client) return null;
  return client.logout({
    logoutParams: {
      returnTo: typeof window !== 'undefined' ? window.location.origin : undefined
    }
  });
}

export async function getUserProfile() {
  const client = await initAuth();
  if (!client) return null;
  const user = await client.getUser();
  return user || null;
}

export async function getUserRoles() {
  const client = await initAuth();
  if (!client) return [];
  const claims = await client.getIdTokenClaims().catch(error => {
    console.error('Kunne ikke hente ID token claims', error);
    return null;
  });
  if (!claims) return [];
  const roles = claims[`${ROLE_NAMESPACE}/roles`];
  if (Array.isArray(roles)) {
    return roles;
  }
  if (typeof roles === 'string' && roles.trim()) {
    return [roles.trim()];
  }
  return [];
}

export async function isAdmin() {
  const roles = await getUserRoles();
  return roles.includes('csmate-admin');
}
