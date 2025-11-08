/**
 * @purpose Provide a lightweight permission check helper for UI gating based on admin role definitions.
 * @inputs Action identifier string looked up in the configuration role map.
 * @outputs Boolean indicating whether the active session is allowed to perform the action.
 */

import { loadSession } from './storage.js';

export function can(action) {
  const cfg = globalThis?.window?.__CONFIG__ ?? globalThis?.__CONFIG__ ?? {};
  const session = loadSession();
  const role = session?.role || 'guest';
  const rules = Array.isArray(cfg?.admin?.roles?.[role]) ? cfg.admin.roles[role] : [];
  const permissions = new Set(
    (Array.isArray(session?.permissions) ? session.permissions : [])
      .map((entry) => String(entry).toLowerCase())
  );
  const key = String(action).toLowerCase();
  if (permissions.has('*') || permissions.has(key) || permissions.has(`csmate:${key}`)) {
    return true;
  }
  if (rules.includes('*') || rules.includes(action)) return true;
  if (role === 'admin') return true;
  return false;
}
