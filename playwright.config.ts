import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:4173',
    headless: true
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
