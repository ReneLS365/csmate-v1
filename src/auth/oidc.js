/**
 * @purpose Minimal OIDC PKCE client for authenticating against Auth0/E-Komplet without third-party deps.
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

function normaliseClaimArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (entry == null ? null : String(entry)))
      .filter((entry) => entry && entry.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function claimNameVariants(name) {
  const variants = new Set();
  if (typeof name === 'string' && name.length > 0) {
    variants.add(name);
    const suffix = name.includes('://') ? name.slice(name.lastIndexOf('/') + 1) : name;
    if (suffix) {
      variants.add(suffix);
      variants.add(`https://csmate.app/${suffix}`);
    }
  }
  return Array.from(variants);
}

function getClaimValue(claims, name) {
  if (!claims || typeof claims !== 'object') return undefined;
  if (name && Object.prototype.hasOwnProperty.call(claims, name)) {
    return claims[name];
  }
  if (typeof name === 'string' && !name.includes('://')) {
    const suffix = `/${name}`;
    for (const key of Object.keys(claims)) {
      if (key.endsWith(suffix)) return claims[key];
    }
  }
  return undefined;
}

function collectUniqueStrings(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    const key = String(entry).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(String(entry));
  }
  return result;
}

export async function startLogin() {
  const oidc = ensureConfig();
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64UrlEncode(await sha256(verifier));
  sessionStorage.setItem('pkce_verifier', verifier);

  const params = new URLSearchParams({
    client_id: oidc.clientId,
    response_type: 'code',
    redirect_uri: oidc.redirectUri,
    scope: oidc.scopes,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  if (oidc.audience) params.set('audience', oidc.audience);
  if (oidc.organization) params.set('organization', oidc.organization);
  if (oidc.connection) params.set('connection', oidc.connection);

  const authorizeUrl = `${oidc.authority.replace(/\/?$/, '')}/authorize?${params.toString()}`;
  globalThis.location.href = authorizeUrl;
}

export async function handleCallback() {
  const oidc = ensureConfig();
  const fullConfig = globalThis?.window?.__CONFIG__ ?? globalThis?.__CONFIG__ ?? {};
  const roleClaimNames = new Set(
    Array.isArray(fullConfig?.auth?.roleMapping?.rules)
      ? fullConfig.auth.roleMapping.rules
          .map((rule) => (typeof rule?.claim === 'string' ? rule.claim : null))
          .filter(Boolean)
      : []
  );
  roleClaimNames.add('roles');
  const url = new URL(globalThis.location.href);
  const code = url.searchParams.get('code');
  const verifier = sessionStorage.getItem('pkce_verifier');
  if (!code || !verifier) return false;

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
  const idClaims = decodeJwtPayload(tokens.id_token);
  const accessClaims = tokens.access_token ? decodeJwtPayload(tokens.access_token) : {};
  const permissionClaim = oidc.permissionClaim || 'permissions';
  const permissionCandidates = new Set([
    ...claimNameVariants(permissionClaim),
    ...claimNameVariants('permissions')
  ]);
  const permissions = collectUniqueStrings(
    Array.from(permissionCandidates).flatMap((candidate) =>
      normaliseClaimArray(getClaimValue({ ...accessClaims, ...idClaims }, candidate))
    )
  );

  const roles = collectUniqueStrings(
    Array.from(roleClaimNames)
      .flatMap((claim) => claimNameVariants(claim))
      .flatMap((candidate) => normaliseClaimArray(getClaimValue({ ...idClaims, ...accessClaims }, candidate)))
  );

  const orgId =
    getClaimValue(accessClaims, 'org_id') ||
    getClaimValue(idClaims, 'org_id') ||
    getClaimValue(accessClaims, 'tenant') ||
    getClaimValue(idClaims, 'tenant') ||
    null;

  const session = {
    user: {
      sub: idClaims.sub,
      email: idClaims.email ?? null,
      username: idClaims.preferred_username ?? idClaims.email ?? idClaims.sub,
      name: idClaims.name ?? idClaims.given_name ?? idClaims.family_name ?? '',
      orgId: typeof orgId === 'string' ? orgId : null,
      roles
    },
    idToken: tokens.id_token,
    accessToken: tokens.access_token ?? null,
    refreshToken: tokens.refresh_token ?? null,
    tokenType: tokens.token_type ?? 'Bearer',
    expiresAt: Date.now() + ((tokens.expires_in ?? 0) * 1000),
    permissions,
    roles,
    claims: {
      id: idClaims,
      access: accessClaims
    }
  };

  saveSession(session);
  sessionStorage.removeItem('pkce_verifier');
  return session;
}

export function logout() {
  clearSession();
  sessionStorage.removeItem('pkce_verifier');
  const oidc = ensureConfig();
  const base = oidc.authority.replace(/\/?$/, '');
  const path = `/${String(oidc.logoutPath || 'logout').replace(/^\/+/, '')}`;
  const url = new URL(`${base}${path}`);
  if (oidc.logoutUsesReturnTo) {
    url.searchParams.set('returnTo', oidc.postLogoutRedirectUri);
    if (oidc.clientId) {
      url.searchParams.set('client_id', oidc.clientId);
    }
  } else {
    url.searchParams.set('post_logout_redirect_uri', oidc.postLogoutRedirectUri);
  }
  globalThis.location.href = url.toString();
}
