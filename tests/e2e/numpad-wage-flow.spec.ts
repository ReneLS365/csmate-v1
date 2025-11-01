import { test, expect } from '@playwright/test'

test.describe('Wage numpad interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#btnLon', { state: 'visible' })
    await page.evaluate(() => {
      document.getElementById('btnLon')?.click()
      const section = document.getElementById('lonSection')
      if (section) {
        section.hidden = false
        section.style.display = 'flex'
        section.setAttribute('aria-hidden', 'false')
      }
      const firstHours = document.querySelector('.worker-hours')
      if (firstHours instanceof HTMLElement) {
        firstHours.style.removeProperty('display')
        firstHours.style.visibility = 'visible'
        firstHours.removeAttribute('hidden')
      }
    })
    await page.waitForTimeout(400)
  })

  test('Enter commits value and closes overlay', async ({ page }) => {
    const hoursField = page.locator('.worker-hours').first()
    await page.evaluate(() => {
      const input = document.querySelector('.worker-hours')
      if (input instanceof HTMLElement) {
        input.focus()
        input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      }
    })

    const overlay = page.locator('#npOverlay')
    await expect(overlay).toBeVisible()

    await page.keyboard.type('21')
    await page.keyboard.press('Enter')

    await expect(overlay).toBeHidden()
    await expect(hoursField).toHaveValue('21')
  })

  test('Escape closes overlay without committing', async ({ page }) => {
    const hoursField = page.locator('.worker-hours').first()
    const initialValue = await hoursField.inputValue()

    await page.evaluate(() => {
      const input = document.querySelector('.worker-hours')
      if (input instanceof HTMLElement) {
        input.focus()
        input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      }
    })
    const overlay = page.locator('#npOverlay')
    await expect(overlay).toBeVisible()

    await page.keyboard.type('999')
    await page.keyboard.press('Escape')

    await expect(overlay).toBeHidden()
    await expect(hoursField).toHaveValue(initialValue)
  })

  test('no page errors during numpad interaction', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error))

    const hoursField = page.locator('.worker-hours').first()
    await page.evaluate(() => {
      const input = document.querySelector('.worker-hours')
      if (input instanceof HTMLElement) {
        input.focus()
        input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      }
    })

    const overlay = page.locator('#npOverlay')
    await expect(overlay).toBeVisible()

    await page.keyboard.type('5')
    await page.keyboard.press('Enter')

    await expect(overlay).toBeHidden()
    expect(errors).toHaveLength(0)
  })
})
