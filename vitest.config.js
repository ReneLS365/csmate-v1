import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['tests/e2e.spec.ts', 'tests/e2e/**'],
    include: ['tests/**/*.{test,spec}.{js,ts}']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
