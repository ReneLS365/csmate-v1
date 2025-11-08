import { expect } from '@playwright/test'

export async function prepareJobWithWageSection (page, { workerCount = 1 } = {}) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /opret nyt job/i }).click()
  await page.getByRole('button', { name: /^løn$/i }).click()

  const lonSection = page.locator('#lonSection')
  await expect(lonSection).toBeVisible()

  const addWorkerButton = page.getByRole('button', { name: /\+ tilføj mand/i })
  const workerHours = lonSection.locator('input.worker-hours')

  while (await workerHours.count() < workerCount) {
    const previousCount = await workerHours.count()
    await addWorkerButton.click()
    await expect(workerHours).toHaveCount(previousCount + 1)
  }

  await expect(workerHours.first()).toBeVisible()
  if (workerCount > 1) {
    await expect(workerHours.nth(workerCount - 1)).toBeVisible()
  }

  const overlay = page.locator('#npOverlay')
  const firstField = workerHours.first()
  await firstField.click()
  await overlay.waitFor({ state: 'visible' })
  await page.keyboard.press('Escape')
  await expect(overlay).toBeHidden()

  return { lonSection, workerHours }
}

export async function openNumpadOverlay (page, field) {
  const overlay = page.locator('#npOverlay')
  await field.click()
  await overlay.waitFor({ state: 'visible' })
  return overlay
}
