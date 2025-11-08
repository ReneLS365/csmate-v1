import { test, expect } from '@playwright/test'
import { primeTestUser } from './utils/test-user'
import { prepareJobWithWageSection, openNumpadOverlay } from './utils/numpad'

test.describe('Numpad improvements', () => {
  let workerFields

  test.beforeEach(async ({ page }) => {
    await primeTestUser(page)
    const { workerHours } = await prepareJobWithWageSection(page, { workerCount: 2 })
    workerFields = workerHours
  })

  test('red cross button closes numpad without focus jump', async ({ page }) => {
    const field1 = workerFields.nth(0)
    const field2 = workerFields.nth(1)

    await expect(field1).toBeVisible()
    await expect(field2).toBeVisible()

    const overlay = await openNumpadOverlay(page, field1)

    // Click the red cross button
    await page.getByTestId('numpad-close').click()
    await expect(overlay).toBeHidden()

    // Verify focus stays on field1, doesn't jump to field2
    await expect(field1).toBeFocused()

    // Verify field2 is not focused
    await expect(field2).not.toBeFocused()
  })

  test('enter key commits value and closes numpad', async ({ page }) => {
    const field = workerFields.first()
    await expect(field).toBeVisible()

    const overlay = await openNumpadOverlay(page, field)

    // Type a value
    await page.keyboard.type('456')

    // Press Enter
    await page.keyboard.press('Enter')

    // Verify overlay closes
    await expect(overlay).toBeHidden()

    // Verify value is committed
    const value = await field.inputValue()
    const numeric = Number.parseFloat(value.replace(',', '.'))
    expect(Math.abs(numeric - 456)).toBeLessThan(0.01)
  })

  test('mobile fullscreen layout on small viewport', async ({ page }) => {
    // Set mobile viewport size
    await page.setViewportSize({ width: 390, height: 800 })

    const field = workerFields.first()
    await expect(field).toBeVisible()
    const overlay = await openNumpadOverlay(page, field)

    const numpadSheet = page.locator('.csm-np')

    // Check that numpad is fullscreen
    const boundingBox = await numpadSheet.boundingBox()
    expect(boundingBox).toBeTruthy()
    
    if (boundingBox) {
      // Height should be close to viewport height (allow some tolerance)
      expect(boundingBox.height).toBeGreaterThan(700)
      expect(boundingBox.height).toBeLessThanOrEqual(800)

      // Width should be full width
      expect(boundingBox.width).toBeGreaterThanOrEqual(385)
    }

    // Close numpad
    await page.keyboard.press('Escape')
  })

  test('numpad buttons are responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })

    const field = workerFields.first()
    await expect(field).toBeVisible()
    const overlay = await openNumpadOverlay(page, field)

    // Click on numpad buttons
    const button7 = page.locator('.csm-np button[data-key="7"]')
    await button7.click()

    const button2 = page.locator('.csm-np button[data-key="2"]')
    await button2.click()

    const button3 = page.locator('.csm-np button[data-key="3"]')
    await button3.click()

    // Verify display shows correct value
    const display = page.locator('#npScreen')
    await expect(display).toHaveText('723')

    // Close
    await page.keyboard.press('Escape')
  })
})

test.describe('Admin lock functionality', () => {
  test.beforeEach(async ({ page }) => {
    await primeTestUser(page)
    await page.route('**/data/tenants/hulmose.json', async route => {
      const response = await route.fetch()
      const json = await response.json()
      const patched = {
        ...json,
        _meta: {
          ...json._meta,
          admin_code: 'ff0a69fa196820f9529e3c20cfa809545e6697f5796527f7657a83bb7e6acd0d'
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(patched)
      })
    })
    const tenantConfig = page.waitForResponse(response => response.url().includes('/data/tenants/hulmose.json') && response.ok())
    await page.goto('/')
    await tenantConfig
    await page.waitForLoadState('networkidle')
  })

  test('admin code unlocks non-input interactions', async ({ page }) => {
    await page.getByRole('button', { name: /opret nyt job/i }).click()
    // Navigate to the admin section
    await page.click('#btnOptaelling')
    await expect(page.locator('#adminCode')).toBeEnabled()

    // Try to enter admin code (using the tenant default which is hashed in the app)
    // The actual verification happens via the existing SHA-256 hash system
    await page.fill('#adminCode', 'StilAce')
    await page.click('#btnAdminLogin')

    // Wait for success message
    await page.waitForSelector('#adminFeedback', { state: 'visible' })
    
    const feedbackText = await page.locator('#adminFeedback').textContent()
    expect(feedbackText).toContain('aktiveret')
  })
})
