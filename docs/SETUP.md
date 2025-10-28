# Setup (lokalt & CI)

## Lokalt
1. Sørg for Node.js 20 og npm.
2. Kør `npm ci` i projektroden.
3. Start den statiske server (uden at ændre appen): `npm run serve`.
4. E2E lokalt: `npx playwright install chromium && npm run e2e`.
5. Lighthouse lokalt (valgfrit):
   - `export CHROME_PATH=$(node -e "console.log(require('playwright-core').chromium.executablePath())")`
   - `npx lhci collect --url=http://127.0.0.1:4173 --numberOfRuns=1 --output-dir=.lighthouse`

## CI (GitHub Actions)
- Workflow: `.github/workflows/ci.yml`
- Jobs:
  - **build-unit**: lint, unit tests, build (ingen app-ændringer)
  - **e2e**: Playwright-container med Chromium
  - **lighthouse**: genererer rapporter via Chromium/`CHROME_PATH`
- Artefakter:
  - `playwright-report/`
  - `.lighthouse/`
  - `CI_SUMMARY.md`

> Alt ovenstående er tooling. Appens eksisterende logik og design forbliver uændret.
