import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /e2e\.spec\.(ts|js)/,
  retries: process.env.CI ? 2 : 0,
  timeout: 90_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '.artifacts/playwright-report' }]
  ],
  outputDir: '.artifacts/playwright-results'
});
