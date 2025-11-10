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
      roles: state.roles || []
    }
  }, options)
}
