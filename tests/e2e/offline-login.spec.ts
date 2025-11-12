import { test, expect } from '@playwright/test'

test('offline login button works when present', async ({ page }) => {
  await page.goto('/')
  const button = page.locator('#offline, #btn-offline, [data-action="offline"], [data-auth="offline"]')
  if (await button.count() === 0) {
    test.skip()
  }

  await button.first().click()
  await page.waitForFunction(() => Boolean(window.CSMATE_AUTH?.offline))

  const isOffline = await page.evaluate(() => {
    return Boolean(window.CSMATE_AUTH?.offline && window.CSMATE_AUTH?.profile?.displayName)
  })
  expect(isOffline).toBe(true)
})
