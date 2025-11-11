import { expect, test } from '@playwright/test'
import { mockAuthState } from './utils/auth-mock'

test.describe('Hjælp-fane og dev-panel', () => {
  test('åbner hjælp-fanen via tastaturgenvej', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Job', { exact: true }).first().waitFor()

    const helpTab = page.locator('#tab-help')
    await expect(helpTab).toBeHidden()

    await page.keyboard.press('Shift+?')

    await expect(helpTab).toBeVisible()
    await expect(helpTab.locator('#help-quickstart')).toBeVisible()
    await expect(helpTab.locator('#help-shortcuts')).toContainText('Shift')
  })

  test('dev-panel ignorerer shortcut for almindelig bruger', async ({ page }) => {
    await mockAuthState(page, {
      isAuthenticated: true,
      email: 'worker@example.com',
      roles: [{ tenantId: 'default', role: 'worker' }]
    })

    await page.goto('/')
    await page.getByText('Job', { exact: true }).first().waitFor()

    await page.keyboard.press('Shift+D')
    await page.waitForTimeout(150)

    await expect(page.locator('#dev')).toHaveCount(0)
  })

  test('dev-panel åbnes for owner via shortcut og viser meta', async ({ page }) => {
    await mockAuthState(page, {
      isAuthenticated: true,
      email: 'owner@example.com',
      roles: [{ tenantId: 'default', role: 'superadmin' }]
    })

    await page.goto('/')
    await page.getByText('Job', { exact: true }).first().waitFor()

    await page.keyboard.press('Shift+D')

    const devPanel = page.locator('#dev')
    await expect(devPanel).toBeVisible()
    await expect(page.locator('#tab-help')).toBeVisible()
    await expect(devPanel.locator('[data-dev-meta="app"]')).not.toHaveText('-')
    await expect(devPanel.locator('[data-dev-meta="auth"]')).toContainText('Auth0')
  })
})
