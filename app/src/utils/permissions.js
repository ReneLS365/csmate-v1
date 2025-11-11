export const DEFAULT_FALLBACK_ACTIONS = Object.freeze(['canCreateJobs'])

function isFallbackAllowed (action, fallbackAllow) {
  if (!action || !fallbackAllow) return false
  if (fallbackAllow instanceof Set) return fallbackAllow.has(action)
  if (Array.isArray(fallbackAllow)) return fallbackAllow.includes(action)
  if (typeof fallbackAllow === 'string') return fallbackAllow === action
  if (typeof fallbackAllow.has === 'function') {
    try {
      return fallbackAllow.has(action)
    } catch {
      return false
    }
  }
  if (typeof fallbackAllow.includes === 'function') {
    try {
      return fallbackAllow.includes(action)
    } catch {
      return false
    }
  }
  return false
}

export function canPerformAction ({ user, action, rolePermissions, fallbackAllow = DEFAULT_FALLBACK_ACTIONS }) {
  if (!action) return false
  if (!user) {
    return isFallbackAllowed(action, fallbackAllow)
  }
  if (!rolePermissions || typeof rolePermissions !== 'object') return false
  const roles = Array.isArray(user.roles) && user.roles.length
    ? user.roles
    : (typeof user.role === 'string' && user.role ? [user.role] : [])
  if (!roles.length) return false
  return roles.some(roleName => {
    const permissions = rolePermissions[roleName]
    if (!permissions || typeof permissions !== 'object') return false
    return Boolean(permissions[action])
  })
}
