import { test, expect } from '@playwright/test';

test('export preview modal opens and closes', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="export-csv"]').click();
  await expect(page.locator('#export-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Annuller' }).click();
  await expect(page.locator('#export-preview')).toBeHidden({ timeout: 2000 });
});
