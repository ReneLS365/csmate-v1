#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const swPath = resolve(projectRoot, 'service-worker.js');

const source = readFileSync(swPath, 'utf8');
const versionPattern = /const VERSION = ['"].+?['"];?/;

if (!versionPattern.test(source)) {
  console.error('Could not find VERSION constant in service worker.');
  process.exit(1);
}

const commitRef = (process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 8);
const isoStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
const version = `v${isoStamp}${commitRef ? `-${commitRef}` : ''}`;
const updated = source.replace(versionPattern, `const VERSION = '${version}';`);

if (updated === source) {
  console.warn('Service worker version already up to date.');
} else {
  writeFileSync(swPath, updated);
  console.log(`Service worker version bumped to ${version}`);
}
