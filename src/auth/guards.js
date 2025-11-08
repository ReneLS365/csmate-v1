/**
 * @purpose Resolve user roles from OIDC claims and gate access based on configured permissions.
 * @inputs Persisted session token payloads and configuration schema containing role mapping rules.
 * @outputs Helpers for mapping roles, attaching them to the stored session and verifying permissions.
 */

import { loadSession, saveSession } from '../lib/storage.js';

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

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    return value.split(/[\s,]+/).filter(Boolean);
  }
  return [];
}

function dedupeStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (value == null) continue;
    const str = String(value).trim();
    if (!str) continue;
    const key = str.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(str);
  }
  return result;
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

function normaliseRules(rules) {
  if (!Array.isArray(rules)) return [];
  return rules
    .map((rule) => ({
      claim: rule?.claim,
      contains: rule?.contains,
      to: rule?.to
    }))
    .filter((rule) => typeof rule.claim === 'string' && typeof rule.contains === 'string' && typeof rule.to === 'string');
}

function matchDomainRule(email, config) {
  if (!email || typeof email !== 'string') return null;
  const domain = email.split('@')[1];
  if (!domain) return null;
  const rules = Array.isArray(config?.auth?.domainRules) ? config.auth.domainRules : [];
  const hit = rules.find((rule) => typeof rule?.domain === 'string' && rule.domain.toLowerCase() === domain.toLowerCase());
  return hit?.to ?? null;
}

function permissionClaimKey(config) {
  return config?.auth?.oidc?.permissionClaim || 'permissions';
}

function collectPermissions(session, accessClaims, config) {
  const fromSession = Array.isArray(session?.permissions) ? session.permissions : [];
  const claimNames = new Set([
    ...claimNameVariants(permissionClaimKey(config)),
    ...claimNameVariants('permissions')
  ]);
  const fromClaims = Array.from(claimNames)
    .flatMap((name) => ensureArray(getClaimValue(accessClaims, name)));
  const combined = [...fromSession, ...fromClaims]
    .map((entry) => (entry == null ? '' : String(entry).trim()))
    .filter(Boolean);
  const seen = new Set();
  return combined.filter((entry) => {
    const key = entry.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mapRoleFromClaims(claims, config) {
  const rules = normaliseRules(config?.auth?.roleMapping?.rules);
  for (const rule of rules) {
    const value = getClaimValue(claims, rule.claim);
    const entries = ensureArray(value).map((item) => item.toLowerCase());
    if (entries.includes(String(rule.contains).toLowerCase())) {
      return rule.to;
    }
  }

  const email = getClaimValue(claims, 'email');
  const byDomain = matchDomainRule(email, config);
  if (byDomain) return byDomain;

  return config?.auth?.roleMapping?.fallback || 'worker';
}

export function attachRoleToSession(config) {
  const session = loadSession();
  if (!session?.idToken) return null;
  const idClaims = session.claims?.id || decodeJwtPayload(session.idToken);
  const accessClaims = session.claims?.access || decodeJwtPayload(session.accessToken);
  const role = mapRoleFromClaims({ ...accessClaims, ...idClaims }, config);
  const permissions = collectPermissions(session, accessClaims, config);
  const roleClaimNames = new Set(
    normaliseRules(config?.auth?.roleMapping?.rules).map((rule) => rule.claim).filter(Boolean)
  );
  roleClaimNames.add('roles');
  const roles = dedupeStrings([
    ...(Array.isArray(session?.roles) ? session.roles : []),
    ...Array.from(roleClaimNames)
      .flatMap((claim) => ensureArray(getClaimValue({ ...accessClaims, ...idClaims }, claim)))
  ]);
  const enriched = {
    ...session,
    role,
    permissions,
    roles,
    claims: {
      id: idClaims,
      access: accessClaims
    }
  };
  saveSession(enriched);
  return enriched;
}

export function requireRole(requiredRole, config) {
  if (requiredRole === 'any') return true;
  const session = loadSession();
  if (!session) return false;

  const permissionsSet = new Set(
    (Array.isArray(session.permissions) ? session.permissions : [])
      .map((entry) => String(entry).toLowerCase())
  );
  const roleList = Array.isArray(session?.roles)
    ? session.roles.map((entry) => String(entry).toLowerCase())
    : [];

  if (typeof requiredRole === 'string' && requiredRole.startsWith('permission:')) {
    const permission = requiredRole.slice('permission:'.length).toLowerCase();
    if (permissionsSet.has(permission) || permissionsSet.has(`csmate:${permission}`) || permissionsSet.has('*')) {
      return true;
    }
    return false;
  }

  let role = session.role;
  if (!role) {
    const token = session.idToken;
    if (!token) return false;
    const merged = { ...decodeJwtPayload(session.accessToken), ...decodeJwtPayload(token) };
    role = mapRoleFromClaims(merged, config);
  }

  if (roleList.includes('admin')) return true;
  if (typeof requiredRole === 'string' && roleList.includes(requiredRole.toLowerCase())) return true;
  if (!role) return false;
  if (role === 'admin') return true;
  return role === requiredRole;
}

export function can(action, config) {
  const cfg = config || globalThis?.window?.__CONFIG__;
  const session = loadSession();
  const role = session?.role || 'guest';
  const rules = Array.isArray(cfg?.admin?.roles?.[role]) ? cfg.admin.roles[role] : [];
  const permissions = new Set(
    (Array.isArray(session?.permissions) ? session.permissions : [])
      .map((entry) => String(entry).toLowerCase())
  );
  if (permissions.has('*') || permissions.has(action.toLowerCase()) || permissions.has(`csmate:${action.toLowerCase()}`)) {
    return true;
  }
  if (Array.isArray(rules) && (rules.includes('*') || rules.includes(action))) return true;
  if (role === 'admin') return true;
  return false;
}
