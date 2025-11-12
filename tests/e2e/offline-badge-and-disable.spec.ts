import { test, expect } from '@playwright/test'

test.describe('offline UI indicators', () => {
  test('badge visible and controls disabled when offline user active', async ({ page }) => {
    await page.goto('/')
    const offlineButton = page.locator('#offline, [data-action="offline"], [data-auth="offline"]')
    if (await offlineButton.count()) {
      await offlineButton.first().click()
      await page.waitForLoadState('domcontentloaded')
    }
    const badge = page.locator('#status-badge')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText(/offline/i)

    const onlineOnly = page.locator('[data-online-only]')
    const count = await onlineOnly.count()
    if (count > 0) {
      await expect(onlineOnly.first()).toBeDisabled()
    }
  })
})
