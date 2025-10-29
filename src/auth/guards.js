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

export function mapRoleFromClaims(claims, config) {
  const rules = normaliseRules(config?.auth?.roleMapping?.rules);
  for (const rule of rules) {
    const value = claims?.[rule.claim];
    const entries = ensureArray(value).map((item) => item.toLowerCase());
    if (entries.includes(String(rule.contains).toLowerCase())) {
      return rule.to;
    }
  }

  const byDomain = matchDomainRule(claims?.email, config);
  if (byDomain) return byDomain;

  return config?.auth?.roleMapping?.fallback || 'worker';
}

export function attachRoleToSession(config) {
  const session = loadSession();
  if (!session?.idToken) return null;
  const claims = decodeJwtPayload(session.idToken);
  const role = mapRoleFromClaims(claims, config);
  const enriched = { ...session, role };
  saveSession(enriched);
  return enriched;
}

export function requireRole(requiredRole, config) {
  if (requiredRole === 'any') return true;
  const session = loadSession();
  const role = session?.role || mapRoleFromClaims(decodeJwtPayload(session?.idToken), config);
  if (!role) return false;
  if (role === 'admin') return true;
  return role === requiredRole;
}

export function can(action, config) {
  const cfg = config || globalThis?.window?.__CONFIG__;
  const session = loadSession();
  const role = session?.role || 'guest';
  const rules = cfg?.admin?.roles?.[role] || [];
  if (Array.isArray(rules) && (rules.includes('*') || rules.includes(action))) return true;
  if (role === 'admin') return true;
  return false;
}
