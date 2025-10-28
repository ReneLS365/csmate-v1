import { expect, test } from '@playwright/test';

test.describe('CSMate release smoke', () => {
  async function readDownload(download: import('@playwright/test').Download) {
    const stream = await download.createReadStream();
    if (!stream) return Buffer.alloc(0);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async function waitForServiceWorker(page: import('@playwright/test').Page) {
    await page.waitForFunction(() => !!navigator.serviceWorker, null, { timeout: 15000 });
    await page.evaluate(async () => {
      await navigator.serviceWorker?.ready;
    });
  }

  async function fillSagsinfo(page: import('@playwright/test').Page, index: number) {
    await page.click('button[data-section="sagsinfo"]');
    await page.fill('#sagsnummer', `Sag ${index}`);
    await page.fill('#sagsnavn', `Projekt ${index}`);
    await page.fill('#sagsadresse', `Adresse ${index}`);
    await page.fill('#sagskunde', `Kunde ${index}`);
    await page.fill('#sagsdato', '2025-01-01');
    await page.fill('#sagsmontoer', `Sjak ${index}`);
  }

  test('full release workflow', async ({ page }) => {
    await page.goto('about:blank');
    await page.evaluate(() => {
      try {
        indexedDB.deleteDatabase('csmate');
      } catch (error) {
        console.warn('Unable to reset IndexedDB', error);
      }
    });
    await page.goto('/', { waitUntil: 'networkidle' });

    const materialsNav = page.locator('header nav button[data-section="optaelling"]');
    if (await materialsNav.isVisible()) {
      await materialsNav.click();
    }

    const materialsSection = page.locator('#optaellingSection');
    await expect(materialsSection).toBeVisible();

    await expect(page.locator('#app header .ttl')).toHaveText(/akkordseddel/i);

    const manifestOK = await page.evaluate(async () => {
      const response = await fetch('/manifest.json', { cache: 'no-store' });
      return response.ok;
    });
    expect(manifestOK).toBe(true);

    await waitForServiceWorker(page);

    const firstRow = page.locator('.materials-scroll .material-row').first();
    await expect(firstRow).toBeVisible();
    const childClasses = await firstRow.evaluate((row) => Array.from(row.children).map((node) => node.className));
    expect(childClasses[0]).toContain('mat-name');
    expect(childClasses[1]).toContain('mat-qty');
    expect(childClasses[2]).toContain('mat-price');
    expect(childClasses[3]).toContain('mat-sum');

    const nameBox = await firstRow.locator('.mat-name').boundingBox();
    const qtyBox = await firstRow.locator('.mat-qty').boundingBox();
    const priceBox = await firstRow.locator('.mat-price').boundingBox();
    if (!nameBox || !qtyBox || !priceBox) {
      throw new Error('Material layout bounding boxes missing');
    }
    expect(qtyBox.x).toBeGreaterThan(nameBox.x + 10);
    expect(priceBox.x).toBeGreaterThan(qtyBox.x + 10);
    expect(qtyBox.width).toBeGreaterThan(40);

    const manualRows = page.locator('.material-row.manual');
    await expect(manualRows).toHaveCount(3);
    const manualLayout = await manualRows.evaluateAll((rows) =>
      rows.every((row) => {
        const children = Array.from(row.children);
        return (
          children.length === 4 &&
          children[0].classList.contains('mat-name') &&
          children[1].classList.contains('mat-qty') &&
          children[2].classList.contains('mat-price') &&
          children[3].classList.contains('mat-sum')
        );
      })
    );
    expect(manualLayout).toBe(true);

    const overscroll = await page.evaluate(() => {
      const el = document.querySelector('.materials-scroll');
      if (!el) return false;
      const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 0);
      el.scrollTop = el.scrollHeight * 2;
      return el.scrollTop > maxScroll + 1;
    });
    expect(overscroll).toBe(false);

    await fillSagsinfo(page, 1);

    await page.selectOption('#sagStatus', 'afventer');
    await expect(page.locator('#statusIndicator')).toHaveAttribute('data-status', 'afventer');
    await page.selectOption('#sagStatus', 'godkendt');
    await expect(page.locator('#statusIndicator')).not.toHaveAttribute('data-status', 'godkendt');

    await page.fill('#adminCode', 'StilAce');
    await page.click('#btnAdminLogin');
    await expect(page.locator('#adminFeedback')).toContainText('Admin-tilstand');
    await page.selectOption('#sagStatus', 'godkendt');
    await expect(page.locator('#statusIndicator')).toHaveAttribute('data-status', 'godkendt');

    const priceField = page.locator('.material-row .mat-price').first();
    const priceEditable = await priceField.evaluate((input: HTMLInputElement) => !input.readOnly);
    expect(priceEditable).toBe(true);

    const qtyField = page.locator('.material-row .mat-qty').first();
    await qtyField.fill('5');

    await page.click('button[data-section="lon"]');
    await page.fill('#km', '12');
    await page.fill('#traelleloeft35', '2');
    await page.fill('#traelleloeft50', '1');
    await page.selectOption('#jobType', 'demontage');
    await page.selectOption('#jobType', 'montage');

    const hoursInput = page.locator('.worker-row .worker-hours').first();
    await hoursInput.fill('10');

    await page.click('#btnBeregnLon');
    await page.waitForTimeout(400);

    const resultPanel = page.locator('#lonResult');
    await expect(resultPanel).toContainText('Tralleløft');
    await expect(resultPanel).toContainText('Materialesum');

    await expect(page.locator('#btnExportCSV')).toBeEnabled();
    await expect(page.locator('#btnExportAll')).toBeEnabled();
    await expect(page.locator('#btnExportZip')).toBeEnabled();

    const csvDownloadPromise = page.waitForEvent('download');
    await page.click('#btnExportCSV');
    const csvDownload = await csvDownloadPromise;
    const csvContent = await readDownload(csvDownload);
    const csvText = csvContent.toString('utf8');
    expect(csvText).toContain('Sagsinfo;Status;Godkendt');
    expect(csvText).toContain('Materiale;TL35;Tralleløft 0,35 m');
    expect(csvText).toContain('Total;Projektsum;');

    const downloads: import('@playwright/test').Download[] = [];
    const onDownload = (download: import('@playwright/test').Download) => downloads.push(download);
    page.on('download', onDownload);
    await page.click('#btnExportAll');
    await page.waitForTimeout(2000);
    page.off('download', onDownload);
    const pdfDownload = downloads.find((d) => d.suggestedFilename().toLowerCase().endsWith('.pdf'));
    expect(pdfDownload).toBeTruthy();
    if (pdfDownload) {
      const pdfBuffer = await readDownload(pdfDownload);
      expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
    }

    const zipDownloadPromise = page.waitForEvent('download');
    await page.click('#btnExportZip');
    const zipDownload = await zipDownloadPromise;
    expect(zipDownload.suggestedFilename().toLowerCase()).toContain('.zip');

    await page.click('button[data-section="sagsinfo"]');
    for (let index = 2; index <= 22; index += 1) {
      await fillSagsinfo(page, index);
      await page.click('button[data-section="lon"]');
      await hoursInput.fill('10');
      await page.click('#btnBeregnLon');
      await page.waitForTimeout(200);
      await page.click('button[data-section="sagsinfo"]');
    }

    const summary = await page.evaluate(async () => {
      const DB_NAME = 'csmate';
      const STORE = 'projects';
      function openDB() {
        return new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, 1);
          request.onerror = () => reject(request.error);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
              db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            }
          };
          request.onsuccess = () => resolve(request.result);
        });
      }
      const db = await openDB();
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const items = await new Promise<any[]>((resolve, reject) => {
        const getAll = store.getAll();
        getAll.onsuccess = () => resolve(getAll.result || []);
        getAll.onerror = () => reject(getAll.error);
      });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      const sorted = items
        .filter((entry) => entry && typeof entry.ts === 'number')
        .sort((a, b) => b.ts - a.ts);
      return {
        count: sorted.length,
        latest: sorted[0]?.data?.sagsinfo?.sagsnummer || null,
        oldest: sorted[sorted.length - 1]?.data?.sagsinfo?.sagsnummer || null,
      };
    });

    expect(summary.count).toBeLessThanOrEqual(20);
    expect(summary.latest).toBe('Sag 22');
    if (summary.count === 20) {
      expect(summary.oldest).toBe('Sag 3');
    }
  });
});
