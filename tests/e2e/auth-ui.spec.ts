import { test, expect } from '@playwright/test'
import { mockAuthState } from './utils/auth-mock'

test.describe('Auth og Admin UI', () => {
  test('logged-out: viser login-knapper og skjuler admin-fanen', async ({ page }) => {
    await page.goto('/')

    await page.getByText('Job', { exact: true }).first().waitFor()

    const loginBtn = page.locator('[data-auth="login"]')
    const signupBtn = page.locator('[data-auth="signup"]')
    const offlineBtn = page.locator('[data-auth="offline"]')
    const logoutBtn = page.locator('[data-auth="logout"]')
    const adminTab = page.locator('[data-tab="admin"]')

    await expect(loginBtn).toBeVisible()
    await expect(signupBtn).toBeVisible()
    await expect(offlineBtn).toBeVisible()
    await expect(logoutBtn).toBeHidden()

    await expect(adminTab).toHaveClass(/hidden/)
  })

  test('admin-bruger: ser admin-fanen og kan åbne admin-view', async ({ page }) => {
    await mockAuthState(page, {
      isAuthenticated: true,
      email: 'admin@example.com',
      roles: [{ tenantId: 'default', role: 'superadmin' }]
    })

    await page.route('**/.netlify/functions/admin-users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            {
              id: 'auth0|test-user',
              email: 'admin@example.com',
              displayName: 'Test Admin',
              roles: ['tenantAdmin'],
              tenants: [
                {
                  id: 'default',
                  role: 'tenantAdmin'
                }
              ]
            }
          ]
        })
      })
    })

    await page.goto('/')

    await page.getByText('Job', { exact: true }).first().waitFor()

    const adminTabBtn = page.locator('[data-tab="admin"]')
    await expect(adminTabBtn).toBeVisible()

    await adminTabBtn.click()

    const adminView = page.locator('[data-view="admin"]')
    await expect(adminView).toBeVisible()
  })

  test('almindelig bruger: ser ikke admin-fanen', async ({ page }) => {
    await mockAuthState(page, {
      isAuthenticated: true,
      email: 'worker@example.com',
      roles: [{ tenantId: 'default', role: 'worker' }]
    })

    await page.goto('/')

    await page.getByText('Job', { exact: true }).first().waitFor()

    const adminTabBtn = page.locator('[data-tab="admin"]')

    await expect(adminTabBtn).toHaveClass(/hidden/)
  })
})
