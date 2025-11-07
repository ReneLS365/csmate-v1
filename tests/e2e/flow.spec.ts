import { test, expect } from '@playwright/test';

test('CSMate hovedflow: job → system → materialer → løn → eksport → lås', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /opret nyt job/i }).click();

  await page.getByRole('button', { name: /sagsinfo/i }).click();
  await page.getByLabel(/sagsnummer/i).fill('E2E-001');
  await page.getByLabel(/navn\/opgave/i).fill('E2E testjob');
  await page.getByLabel(/adresse/i).fill('Testvej 1');
  await page.getByLabel(/kunde/i).fill('Test Kunde');
  await page.locator('#sagsdato').fill('2024-01-01');
  await page.getByLabel(/montørnavne/i).fill('Tester');

  await page.getByRole('button', { name: /skift bruger/i }).click();
  const overlay = page.locator('#userOverlay');
  await overlay.waitFor({ state: 'visible' });
  await overlay.getByLabel(/navn/i).fill('E2E Tester');
  await overlay.getByLabel(/rolle/i).selectOption('formand');
  await overlay.getByRole('button', { name: /gem/i }).click();
  await expect(overlay).toBeHidden();

  await page.getByRole('button', { name: /optælling/i }).click();
  const qtyInput = page.locator('#optaellingContainer .mat-row input.csm-qty').first();
  await qtyInput.waitFor({ state: 'visible' });
  await qtyInput.fill('10');

  await page.getByRole('button', { name: /løn/i }).click();
  const hoursInput = page.locator('.worker-hours').first();
  await hoursInput.waitFor({ state: 'visible' });
  await hoursInput.fill('8');

  await page.getByRole('button', { name: /sagsinfo/i }).click();
  await expect(page.locator('#btnExportAll')).toBeEnabled();

  const lockButton = page.locator('#btnLockJob');
  await expect(lockButton).toBeEnabled();
  await lockButton.click();

  await page.getByRole('button', { name: /løn/i }).click();
  await expect(page.locator('.worker-hours').first()).toBeDisabled();
});
