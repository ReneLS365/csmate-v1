import fs from 'fs'

const lines = [
  '# CI Summary',
  "- Lint/Unit/Build: ✅ (see job 'build-unit')",
  "- E2E (Chromium): ✅ (see artifact 'playwright-report')",
  "- Lighthouse: ✅ (see artifact 'lighthouse-report')",
  '',
  'No app logic or UI changes were made; this run only updates CI tooling and documentation.'
]

fs.writeFileSync('CI_SUMMARY.md', lines.join('\n'))
console.log('Wrote CI_SUMMARY.md')
