const defaultState = Object.freeze({
  isReady: false,
  isAuthenticated: false,
  user: null
});

let auth0Client = null;
let authState = { ...defaultState };

if (typeof window !== 'undefined') {
  window.CSMATE_AUTH = window.CSMATE_AUTH || { isAuthenticated: false, user: null };
}

function getConfig() {
  if (typeof window === 'undefined') return null;
  const config = window.CSMATE_AUTH0_CONFIG;
  if (!config || typeof config !== 'object') {
    console.error('CSMATE_AUTH0_CONFIG mangler eller er ugyldig');
    return null;
  }
  return config;
}

function publishState(state) {
  if (typeof window === 'undefined') return;
  const offline = window.CSMATE_AUTH?.offline && !state.isAuthenticated;
  const nextState = { ...state };
  if (offline) {
    nextState.offline = true;
  }
  window.CSMATE_AUTH = nextState;
}

function cloneAuthState(state = authState) {
  return {
    isReady: Boolean(state?.isReady),
    isAuthenticated: Boolean(state?.isAuthenticated),
    user: state?.user ? { ...state.user } : null
  };
}

async function createClient() {
  if (auth0Client) return auth0Client;
  if (typeof window === 'undefined') return null;
  if (typeof window.createAuth0Client !== 'function') {
    console.error('Auth0 SPA JS ikke indlæst');
    return null;
  }

  const config = getConfig();
  if (!config) return null;

  auth0Client = await window.createAuth0Client(config).catch(error => {
    console.error('Kunne ikke initialisere Auth0-klient', error);
    return null;
  });
  return auth0Client;
}

async function handleRedirectCallback(client) {
  if (typeof window === 'undefined') return;
  const query = window.location.search || '';
  if (!query.includes('code=') || !query.includes('state=')) return;
  try {
    await client.handleRedirectCallback();
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, document.title, url.toString());
  } catch (error) {
    console.error('Auth0 redirect-fejl', error);
  }
}

export async function initAuth() {
  const client = await createClient();
  if (!client) {
    authState = { ...defaultState, isReady: true };
    publishState(authState);
    return cloneAuthState();
  }

  await handleRedirectCallback(client);

  try {
    const isAuthenticated = await client.isAuthenticated();
    const user = isAuthenticated ? await client.getUser() : null;
    authState = {
      isReady: true,
      isAuthenticated,
      user
    };
  } catch (error) {
    console.error('Kunne ikke læse Auth0-status', error);
    authState = { ...defaultState, isReady: true };
  }

  publishState(authState);
  return cloneAuthState();
}

export async function loginWithRedirect(options = {}) {
  const client = await createClient();
  if (!client) return;
  try {
    await client.loginWithRedirect(options);
  } catch (error) {
    console.error('Auth0 login-fejl', error);
  }
}

export async function signupWithRedirect() {
  const client = await createClient();
  if (!client) return;
  const baseParams = getConfig()?.authorizationParams || {};
  try {
    await client.loginWithRedirect({
      authorizationParams: {
        ...baseParams,
        screen_hint: 'signup'
      }
    });
  } catch (error) {
    console.error('Auth0 signup-fejl', error);
  }
}

export async function logout() {
  const client = await createClient();
  if (!client) return;
  try {
    await client.logout({
      logoutParams: {
        returnTo: window.location.origin + '/'
      }
    });
  } catch (error) {
    console.error('Auth0 logout-fejl', error);
  }
}

export async function getAccessToken() {
  const client = await createClient();
  if (!client) return null;
  try {
    return await client.getTokenSilently();
  } catch (error) {
    console.error('Kunne ikke hente access token', error);
    return null;
  }
}

export function getAuthState() {
  return cloneAuthState();
}
