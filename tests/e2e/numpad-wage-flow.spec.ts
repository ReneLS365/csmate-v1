import { test, expect } from '@playwright/test'
import { primeTestUser } from './utils/test-user'
import { prepareJobWithWageSection, openNumpadOverlay } from './utils/numpad'

test.describe('Wage numpad interactions', () => {
  let hoursField

  test.beforeEach(async ({ page }) => {
    await primeTestUser(page)
    const { workerHours } = await prepareJobWithWageSection(page, { workerCount: 1 })
    hoursField = workerHours.first()
    await expect(hoursField).toBeVisible()
  })

  test('Enter commits value and closes overlay', async ({ page }) => {
    const overlay = await openNumpadOverlay(page, hoursField)

    await page.keyboard.type('21')
    await page.keyboard.press('Enter')

    await expect(overlay).toBeHidden()
    const value = await hoursField.inputValue()
    const numeric = Number.parseFloat(value.replace(',', '.'))
    expect(Math.abs(numeric - 21)).toBeLessThan(0.01)
  })

  test('Escape closes overlay without committing', async ({ page }) => {
    const initialValue = await hoursField.inputValue()

    const overlay = await openNumpadOverlay(page, hoursField)

    await page.keyboard.type('999')
    await page.keyboard.press('Escape')

    await expect(overlay).toBeHidden()
    await expect(hoursField).toHaveValue(initialValue)
  })

  test('no page errors during numpad interaction', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error))

    const overlay = await openNumpadOverlay(page, hoursField)

    await page.keyboard.type('5')
    await page.keyboard.press('Enter')

    await expect(overlay).toBeHidden()
    expect(errors).toHaveLength(0)
  })
})
