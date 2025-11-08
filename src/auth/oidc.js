/**
 * @purpose Minimal OIDC PKCE client for authenticating against E-Komplet without third-party deps.
 * @inputs None directly – expects window.__CONFIG__.auth.oidc to hold client metadata.
 * @outputs startLogin, handleCallback and logout helpers controlling auth redirects and session persistence.
 */

import { saveSession, clearSession } from '../lib/storage.js';

function base64UrlEncode(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);
  let str = '';
  for (const byte of view) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return hash;
}

function ensureConfig() {
  const cfg = globalThis?.window?.__CONFIG__?.auth?.oidc ?? globalThis?.__CONFIG__?.auth?.oidc;
  if (!cfg) throw new Error('OIDC configuration missing.');
  return cfg;
}

function decodeJwtPayload(token) {
  if (typeof token !== 'string') return {};
  const parts = token.split('.');
  if (parts.length < 2) return {};
  const payload = parts[1];
  const normalised = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalised.padEnd(Math.ceil(normalised.length / 4) * 4, '=');
  try {
    if (typeof atob === 'function') {
      const json = atob(padded);
      return JSON.parse(json);
    }
    if (typeof Buffer !== 'undefined') {
      const json = Buffer.from(padded, 'base64').toString('utf8');
      return JSON.parse(json);
    }
  } catch {
    return {};
  }
  return {};
}

function setSessionVerifier(value) {
  try {
    sessionStorage.setItem('pkce_verifier', value);
  } catch {}
}

function popSessionVerifier() {
  try {
    const value = sessionStorage.getItem('pkce_verifier');
    sessionStorage.removeItem('pkce_verifier');
    return value;
  } catch {
    return null;
  }
}

function cleanupCallbackUrl(rawUrl) {
  if (typeof history === 'undefined' || typeof history.replaceState !== 'function') return;
  try {
    const url = new URL(rawUrl, globalThis.location?.origin ?? 'http://localhost');
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    const next = `${url.pathname}${url.search}${url.hash}`;
    history.replaceState(null, '', next || '/');
  } catch {}
}

export async function startLogin() {
  const oidc = ensureConfig();
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64UrlEncode(await sha256(verifier));
  setSessionVerifier(verifier);

  const params = new URLSearchParams({
    client_id: oidc.clientId,
    response_type: 'code',
    redirect_uri: oidc.redirectUri,
    scope: oidc.scopes,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  if (oidc.audience) {
    params.set('audience', oidc.audience);
  }

  const authorizeUrl = `${oidc.authority.replace(/\/?$/, '')}/authorize?${params.toString()}`;
  globalThis.location.href = authorizeUrl;
}

export async function handleCallback() {
  const oidc = ensureConfig();
  const url = new URL(globalThis.location.href);
  const code = url.searchParams.get('code');
  const verifier = popSessionVerifier();
  if (!code || !verifier) {
    return false;
  }

  const tokenUrl = `${oidc.authority.replace(/\/?$/, '')}/oauth/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: oidc.clientId,
    code_verifier: verifier,
    code,
    redirect_uri: oidc.redirectUri
  });

  if (oidc.audience) {
    body.set('audience', oidc.audience);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    throw new Error('Token exchange failed');
  }

  const tokens = await response.json();
  const idToken = tokens?.id_token;
  if (!idToken) {
    throw new Error('ID token missing from token response');
  }
  const idClaims = decodeJwtPayload(idToken);

  const session = {
    user: {
      sub: idClaims.sub ?? null,
      email: idClaims.email ?? null,
      username: idClaims.preferred_username ?? idClaims.email ?? idClaims.sub ?? null,
      name: idClaims.name ?? idClaims.given_name ?? idClaims.family_name ?? ''
    },
    idToken,
    accessToken: tokens.access_token ?? null,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: Date.now() + ((tokens.expires_in ?? 0) * 1000)
  };

  saveSession(session);
  cleanupCallbackUrl(globalThis.location.href);
  return session;
}

export function logout() {
  clearSession();
  sessionStorage.removeItem('pkce_verifier');
  const oidc = ensureConfig();
  const redirect = encodeURIComponent(oidc.postLogoutRedirectUri);
  const url = `${oidc.authority.replace(/\/?$/, '')}/logout?post_logout_redirect_uri=${redirect}`;
  globalThis.location.href = url;
}
