import { test, expect } from '@playwright/test'

test('numpad opens centered, responds fast, and closes', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Løn', exact: true }).click()
  await expect(page.locator('#lonSection')).toBeVisible()
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="antal-input-1"]')
    return el?.dataset?.npBound === 'true'
  })
  await page.getByTestId('antal-input-1').click()

  const overlay = page.locator('#npOverlay')
  await expect(overlay).toBeVisible()

  const box = await overlay.boundingBox()
  const vw = await page.evaluate(() => window.innerWidth)
  const vh = await page.evaluate(() => window.innerHeight)
  expect(Math.abs((box!.x + box!.width / 2) - vw / 2)).toBeLessThanOrEqual(24)
  expect(Math.abs((box!.y + box!.height / 2) - vh / 2)).toBeLessThanOrEqual(24)

  const seven = page.locator('button[data-key="7"]')
  await seven.click()
  await seven.click()
  const screen = page.locator('#npScreen')
  await expect(screen).toHaveText(/77$/)

  await page.locator('button.csm-np-close').click()
  await expect(overlay).toBeHidden()
})
