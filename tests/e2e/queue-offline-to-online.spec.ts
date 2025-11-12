import { test, expect } from '@playwright/test'

test.describe('net queue offline behaviour', () => {
  test('queued writes drain after manual trigger', async ({ page }) => {
    await page.goto('/')
    const offlineButton = page.locator('#offline, [data-action="offline"], [data-auth="offline"]')
    if (await offlineButton.count()) {
      await offlineButton.first().click()
      await page.waitForLoadState('domcontentloaded')
    }

    await page.evaluate(async () => {
      await window.csmate.queue.enqueue({
        url: '/.netlify/functions/projects',
        method: 'POST',
        body: JSON.stringify({ name: 'Playwright job' })
      })
    })

    const pendingBefore = await page.evaluate(() => window.csmate.queue.allOps().then(items => items.length))
    expect(pendingBefore).toBeGreaterThan(0)

    await page.evaluate(async () => {
      await window.csmate.queue.drain({ fetchImpl: () => Promise.resolve({ ok: true }) })
    })

    const pendingAfter = await page.evaluate(() => window.csmate.queue.allOps().then(items => items.length))
    expect(pendingAfter).toBe(0)
  })
})
