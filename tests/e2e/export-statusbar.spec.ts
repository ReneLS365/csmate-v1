import { expect, test } from '@playwright/test'
import { primeTestUser } from './utils/test-user'

test.describe('Eksport og statusbar', () => {
  test.beforeEach(async ({ page }) => {
    await primeTestUser(page)
    await page.addInitScript(() => {
      class StubZip {
        constructor () {
          this.files = []
        }

        file (name, content) {
          this.files.push({ name, content })
          return this
        }

        async generateAsync () {
          return new Blob(['ZIP'])
        }
      }
      window.JSZip = StubZip
    })
  })

  test('eksport-knap udløser download', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /opret nyt job/i }).click()

    await page.getByRole('button', { name: /sagsinfo/i }).click()
    await page.getByLabel(/sagsnummer/i).fill('EXP-001')
    await page.getByLabel(/navn\/opgave/i).fill('Export test')
    await page.getByLabel(/adresse/i).fill('Testvej 42')
    await page.getByLabel(/kunde/i).fill('Export Kunde')
    await page.locator('#sagsdato').fill('2024-01-01')
    await page.getByLabel(/montørnavne/i).fill('Exportør')

    await page.getByRole('button', { name: /optælling/i }).click()
    const qtyInput = page.locator('#optaellingContainer .mat-row input.csm-qty').first()
    await qtyInput.waitFor({ state: 'visible' })
    await qtyInput.fill('5')

    await page.getByRole('button', { name: /sagsinfo/i }).click()
    const exportButton = page.locator('#btn-export-all')
    await expect(exportButton).toBeEnabled()

    const download = await Promise.all([
      page.waitForEvent('download'),
      exportButton.click()
    ]).then(values => values[0])

    await expect(download.suggestedFilename()).toMatch(/job-.*\.zip$/)
  })

  test('statusbjælke viser pending ændringer og opdaterer efter synk', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => window.JobStore && typeof window.JobStore.create === 'function')

    await page.evaluate(() => {
      window.CSMateSync?.registerSyncHandler(async payload => {
        await new Promise(resolve => setTimeout(resolve, 200))
        return { ok: true, count: payload?.jobChanges?.length || 0 }
      })
    })

    await page.evaluate(() => {
      const id = window.JobStore.create({
        sagsinfo: { kunde: 'Sync Kunde', adresse: 'Syncvej 1', sagsnr: 'SYNC-1' },
        systems: []
      })
      window.JobStore.setActive(id)
      window.JobStore.saveActive()
    })

    const statusText = page.locator('#status-text')
    await expect(statusText).toContainText(/ændring/)

    const syncButton = page.locator('#btn-sync-now')
    await syncButton.click()
    await expect(syncButton).toBeDisabled()

    await expect(statusText).toContainText(/Synkroniseret/)
  })
})
