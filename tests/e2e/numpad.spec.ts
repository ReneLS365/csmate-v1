import { test, expect } from '@playwright/test'

async function prepareAllSections (page) {
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
}

async function getVisibleFieldIndices (page, limit = Infinity) {
  const fields = page.locator('input[data-numpad-field]')
  const indices = []
  const count = await fields.count()
  for (let index = 0; index < count; index += 1) {
    const field = fields.nth(index)
    if (await field.isVisible()) {
      indices.push(index)
      if (indices.length >= limit) break
    }
  }
  return { fields, indices }
}

test.describe('Numpad keyboard interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#npOverlay')
    await prepareAllSections(page)
  })

  test('Enter commits and closes for every visible numpad field', async ({ page }) => {
    const { fields, indices } = await getVisibleFieldIndices(page)
    expect(indices.length).toBeGreaterThan(0)

    for (const index of indices) {
      const field = fields.nth(index)
      await field.scrollIntoViewIfNeeded()
      const overlay = page.locator('#npOverlay')

      await field.click()
      await overlay.waitFor({ state: 'visible' })
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
    const { fields, indices } = await getVisibleFieldIndices(page, 1)
    expect(indices.length).toBeGreaterThan(0)
    const field = fields.nth(indices[0])
    await field.scrollIntoViewIfNeeded()
    const original = await field.inputValue()
    const overlay = page.locator('#npOverlay')

    await field.click()
    await overlay.waitFor({ state: 'visible' })
    await page.keyboard.type('999')
    await page.keyboard.press('Escape')
    await expect(overlay).toBeHidden()

    await expect(field).toHaveValue(original)
  })

  test('Backdrop click closes without committing changes', async ({ page }) => {
    const { fields, indices } = await getVisibleFieldIndices(page, 1)
    expect(indices.length).toBeGreaterThan(0)
    const field = fields.nth(indices[0])
    await field.scrollIntoViewIfNeeded()
    const original = await field.inputValue()

    await field.click()
    await expect(page.locator('#npOverlay')).toBeVisible()
    await page.keyboard.type('42')
    await page.getByTestId('numpad-backdrop').click({ position: { x: 12, y: 12 } })
    await expect(page.locator('#npOverlay')).toBeHidden()
    await expect(field).toHaveValue(original)
  })

  test('Tab commits and focuses the next field', async ({ page }) => {
    const { fields, indices } = await getVisibleFieldIndices(page, 2)
    expect(indices.length).toBeGreaterThanOrEqual(2)
    const first = fields.nth(indices[0])
    const second = fields.nth(indices[1])

    await first.scrollIntoViewIfNeeded()
    await first.click()
    await expect(page.locator('#npOverlay')).toBeVisible()
    await page.keyboard.type('5')
    await page.keyboard.press('Tab')
    await expect(page.locator('#npOverlay')).toBeHidden()
    await expect(second).toBeFocused()

    const committed = await first.inputValue()
    const numeric = Number.parseFloat(committed.replace(',', '.'))
    expect(Number.isFinite(numeric)).toBe(true)
    expect(Math.abs(numeric - 5)).toBeLessThan(0.01)
  })
})
