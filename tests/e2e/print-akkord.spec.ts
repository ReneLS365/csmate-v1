import { expect, test } from '@playwright/test';

test('print button renders akkordseddel uden popups', async ({ page }) => {
  await page.goto('/app/');
  const button = page.locator('#btnPrintAkkord');
  await expect(button).toBeVisible();

  await page.evaluate(() => {
    const events = [];
    const outputs = [];
    window.__PRINT_EVENTS__ = events;
    window.__PRINT_OUTPUTS__ = outputs;
    window.open = () => {
      const stub = {
        document: {
          open() {
            events.push('document-open');
          },
          write(content) {
            outputs.push(String(content));
          },
          close() {
            events.push('document-close');
          }
        },
        focus() {},
        print() {
          events.push('print');
        },
      };
      events.push('window-open');
      return stub;
    };

    window.__APP_PRINTER__?.setState({
      firma: 'Stillads ApS',
      projekt: 'Testprojekt',
      adresse: 'Testvej 1',
      sagsnr: 'S-1',
      dagsdato: '2025-01-02',
      includeDemontage: false,
      cart: {
        bosta: [{ varenr: 'B001', navn: 'Test vare', enhed: 'stk', pris: 25, antal: 1 }],
        haki: [],
        modex: [],
        alfix: []
      },
      extras: []
    });
    window.__APP_PRINTER__?.updatePrintButton();
  });

  await expect(button).toBeEnabled();
  await button.click();

  const events = await page.evaluate(() => window.__PRINT_EVENTS__);
  expect(events).toContain('print');
  const outputs = await page.evaluate(() => window.__PRINT_OUTPUTS__);
  expect(outputs.join('')).toContain('Test vare');
});
