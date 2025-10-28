/**
 * @purpose Evaluate approval permissions for the active role against the template-provided role matrix.
 * @inputs State object containing the current role plus an optional template with normalised role permissions.
 * @outputs Boolean helper returning whether the active role grants the requested permission name.
 */

const DEFAULT_ROLE = 'sjakbajs';

const ROLE_ALIASES = {
  chef: ['chef', 'kontor'],
  kontor: ['kontor', 'chef'],
  formand: ['formand', 'sjakbajs'],
  sjakbajs: ['sjakbajs', 'arbejder', 'formand'],
  arbejder: ['arbejder', 'sjakbajs'],
  admin: ['chef'],
  leder: ['chef']
};

const LEGACY_PERMISSIONS = {
  sjakbajs: new Set(['send']),
  arbejder: new Set(['send']),
  formand: new Set(['send']),
  kontor: new Set(['approve', 'reject']),
  chef: new Set(['approve', 'reject'])
};

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeRoleName(role) {
  if (typeof role === 'string' && role.trim().length > 0) {
    return role.trim();
  }
  return DEFAULT_ROLE;
}

function resolveCandidateRoleKeys(templateRoles, role) {
  const normalizedRole = normalizeRoleName(role).toLowerCase();
  const aliases = ROLE_ALIASES[normalizedRole] ?? [normalizedRole];
  const candidates = new Set(aliases.map((alias) => alias.toLowerCase()));
  candidates.add(normalizedRole);
  candidates.add(DEFAULT_ROLE.toLowerCase());
  return Array.from(candidates).filter((key) => Object.prototype.hasOwnProperty.call(templateRoles, key));
}

function getFallbackPermissions(role) {
  const normalizedRole = normalizeRoleName(role).toLowerCase();
  const aliases = ROLE_ALIASES[normalizedRole] ?? [normalizedRole];
  for (const alias of aliases) {
    const fallback = LEGACY_PERMISSIONS[alias];
    if (fallback) {
      return new Set(fallback);
    }
  }
  return new Set(LEGACY_PERMISSIONS[DEFAULT_ROLE]);
}

function collectTemplatePermissions(state) {
  const rawRoles = ensureObject(state?.template?.roles);
  const templateRoles = Object.fromEntries(
    Object.entries(rawRoles).map(([key, value]) => [String(key).toLowerCase(), value])
  );
  if (Object.keys(templateRoles).length === 0) {
    return { permissions: getFallbackPermissions(state?.role), usedFallback: true };
  }

  const candidates = resolveCandidateRoleKeys(templateRoles, state?.role);
  if (candidates.length === 0) {
    return { permissions: getFallbackPermissions(state?.role), usedFallback: true };
  }

  const permissions = new Set();
  let observedArray = false;
  for (const key of candidates) {
    const perms = templateRoles[key];
    if (!Array.isArray(perms)) continue;
    observedArray = true;
    for (const perm of perms) {
      if (typeof perm === 'string' && perm.trim().length > 0) {
        permissions.add(perm.trim());
      }
    }
  }

  if (!observedArray) {
    return { permissions: getFallbackPermissions(state?.role), usedFallback: true };
  }

  return { permissions, usedFallback: false };
}

export function resolvePermissionContext(state) {
  return collectTemplatePermissions(state);
}

export function hasPerm(state, permission) {
  if (typeof permission !== 'string' || permission.trim().length === 0) {
    return false;
  }

  const requested = permission.trim();
  const { permissions } = collectTemplatePermissions(state);
  return permissions.has(requested);
}
