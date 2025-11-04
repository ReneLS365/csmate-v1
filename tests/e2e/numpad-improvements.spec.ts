import { test, expect } from '@playwright/test'

test.describe('Numpad improvements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#npOverlay')

    // Prepare sections
    await page.evaluate(() => {
      document.querySelectorAll('.sektion').forEach(section => {
        section.hidden = false
        section.setAttribute('aria-hidden', 'false')
        section instanceof HTMLElement && (section.style.display = 'flex')
      })
      document.getElementById('btnLon')?.click()
      document.getElementById('btnAddWorker')?.click()
    })

    await page.waitForFunction(() => {
      const fields = Array.from(document.querySelectorAll('input[data-numpad="true"]'))
      return fields.length > 0 && fields.every(field => field.dataset.npBound === 'true')
    })
  })

  test('red cross button closes numpad without focus jump', async ({ page }) => {
    const field1 = page.locator('input[data-numpad-field]').nth(0)
    const field2 = page.locator('input[data-numpad-field]').nth(1)

    await field1.scrollIntoViewIfNeeded()
    await field1.click()

    const overlay = page.locator('#npOverlay')
    await overlay.waitFor({ state: 'visible' })

    // Click the red cross button
    await page.getByTestId('numpad-close').click()
    await expect(overlay).toBeHidden()

    // Verify focus stays on field1, doesn't jump to field2
    await expect(field1).toBeFocused()

    // Verify field2 is not focused
    const field2IsFocused = await field2.evaluate(el => el === document.activeElement)
    expect(field2IsFocused).toBe(false)
  })

  test('enter key commits value and closes numpad', async ({ page }) => {
    const field = page.locator('input[data-numpad-field]').first()
    await field.scrollIntoViewIfNeeded()

    const overlay = page.locator('#npOverlay')
    await field.click()
    await overlay.waitFor({ state: 'visible' })

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

  test('mobile fullscreen layout on small viewport', async ({ page, context }) => {
    // Set mobile viewport size
    await page.setViewportSize({ width: 390, height: 800 })

    const field = page.locator('input[data-numpad-field]').first()
    await field.scrollIntoViewIfNeeded()
    await field.click()

    const overlay = page.locator('#npOverlay')
    await overlay.waitFor({ state: 'visible' })

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

    const field = page.locator('input[data-numpad-field]').first()
    await field.scrollIntoViewIfNeeded()
    await field.click()

    const overlay = page.locator('#npOverlay')
    await overlay.waitFor({ state: 'visible' })

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
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('admin code unlocks non-input interactions', async ({ page }) => {
    // Navigate to the admin section
    await page.click('#btnOptaelling')

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
