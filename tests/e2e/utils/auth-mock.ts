import type { Page } from '@playwright/test'

export async function mockAuthState(
  page: Page,
  options: {
    isAuthenticated: boolean
    email?: string
    roles?: { tenantId: string; role: string }[]
  }
) {
  await page.addInitScript((state) => {
    const canonicalizeTenantRole = (role: string) => {
      if (!role) return 'worker'
      const normalized = role.trim().toLowerCase()
      if (normalized === 'superadmin') return 'owner'
      if (normalized === 'tenant_admin' || normalized === 'tenantadmin' || normalized === 'firma-admin') return 'tenantAdmin'
      if (normalized === 'owner') return 'owner'
      if (normalized === 'tenantadmin') return 'tenantAdmin'
      return normalized || 'worker'
    }

    const tenantMemberships = Array.isArray(state.roles)
      ? state.roles.map(entry => ({
        id: entry?.tenantId ?? '',
        slug: null,
        role: canonicalizeTenantRole(entry?.role ?? 'worker')
      })).filter(entry => entry.id)
      : []

    const globalRoleSet = new Set<string>()
    tenantMemberships.forEach(entry => {
      if (entry.role === 'owner') {
        globalRoleSet.add('owner')
        globalRoleSet.add('tenantAdmin')
      } else if (entry.role === 'tenantAdmin') {
        globalRoleSet.add('tenantAdmin')
      } else {
        globalRoleSet.add('worker')
      }
    })

    if (state.isAuthenticated && globalRoleSet.size === 0) {
      globalRoleSet.add('worker')
    }

    const profile = state.isAuthenticated
      ? {
          id: 'auth0|test-user',
          authId: 'auth0|test-user',
          email: state.email || 'test@example.com',
          displayName: state.email || 'Test Bruger',
          roles: Array.from(globalRoleSet),
          tenants: tenantMemberships,
          metadata: { mocked: true }
        }
      : null

    // @ts-ignore
    window.CSMATE_AUTH = {
      isReady: true,
      isAuthenticated: state.isAuthenticated,
      user: state.isAuthenticated
        ? {
            email: state.email || 'test@example.com',
            sub: 'auth0|test-user'
          }
        : null,
      profile,
      offline: !state.isAuthenticated
    }
  }, options)
}
