import { test, expect } from '@playwright/test'
import { primeTestUser } from './utils/test-user'
import { prepareJobWithWageSection, openNumpadOverlay } from './utils/numpad'

async function getVisibleFieldIndices (locator, limit = Infinity) {
  const indices = []
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    const field = locator.nth(index)
    if (await field.isVisible()) {
      indices.push(index)
      if (indices.length >= limit) break
    }
  }
  return { fields: locator, indices }
}

test.describe('Numpad keyboard interactions', () => {
  let numpadFields

  test.beforeEach(async ({ page }) => {
    await primeTestUser(page)
    const { lonSection } = await prepareJobWithWageSection(page, { workerCount: 2 })
    numpadFields = lonSection.locator('input.worker-hours')
  })

  test('Enter commits and closes for every visible numpad field', async ({ page }) => {
    const { fields, indices } = await getVisibleFieldIndices(numpadFields)
    expect(indices.length).toBeGreaterThan(0)

    for (const index of indices) {
      const field = fields.nth(index)
      await field.scrollIntoViewIfNeeded()
      const overlay = await openNumpadOverlay(page, field)
      await page.keyboard.type('123')

      const start = Date.now()
      await page.keyboard.press('Enter')
      await expect(overlay).toBeHidden()
      const duration = Date.now() - start
      expect(duration).toBeLessThan(150)

      const committed = await field.inputValue()
      const numeric = Number.parseFloat(committed.replace(',', '.'))
      expect(Number.isFinite(numeric)).toBe(true)
      expect(Math.abs(numeric - 123)).toBeLessThan(0.01)
    }
  })

  test('Escape cancels without mutating the field', async ({ page }) => {
    const { fields, indices } = await getVisibleFieldIndices(numpadFields, 1)
    expect(indices.length).toBeGreaterThan(0)
    const field = fields.nth(indices[0])
    await field.scrollIntoViewIfNeeded()
    const original = await field.inputValue()
    const overlay = await openNumpadOverlay(page, field)
    await page.keyboard.type('999')
    await page.keyboard.press('Escape')
    await expect(overlay).toBeHidden()

    await expect(field).toHaveValue(original)
  })

  test('Backdrop click closes without committing changes', async ({ page }) => {
    const { fields, indices } = await getVisibleFieldIndices(numpadFields, 1)
    expect(indices.length).toBeGreaterThan(0)
    const field = fields.nth(indices[0])
    await field.scrollIntoViewIfNeeded()
    const original = await field.inputValue()

    await openNumpadOverlay(page, field)
    await expect(page.locator('#npOverlay')).toBeVisible()
    await page.keyboard.type('42')
    await page.getByTestId('numpad-backdrop').click({ position: { x: 12, y: 12 } })
    await expect(page.locator('#npOverlay')).toBeHidden()
    await expect(field).toHaveValue(original)
  })

  test('Tab commits and focuses the next field', async ({ page }) => {
    const { fields, indices } = await getVisibleFieldIndices(numpadFields, 2)
    expect(indices.length).toBeGreaterThanOrEqual(2)
    const first = fields.nth(indices[0])
    const second = fields.nth(indices[1])

    await first.scrollIntoViewIfNeeded()
    await openNumpadOverlay(page, first)
    await expect(page.locator('#npOverlay')).toBeVisible()
    await page.keyboard.type('5')
    await page.keyboard.press('Tab')
    await expect(page.locator('#npOverlay')).toBeHidden()

    const committed = await first.inputValue()
    const numeric = Number.parseFloat(committed.replace(',', '.'))
    expect(Number.isFinite(numeric)).toBe(true)
    expect(Math.abs(numeric - 5)).toBeLessThan(0.01)

    await second.click()
    await expect(page.locator('#npOverlay')).toBeVisible()
  })
})
