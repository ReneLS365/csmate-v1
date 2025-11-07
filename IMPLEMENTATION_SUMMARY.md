# Implementation Summary – Hjælp, /dev, genveje, tests

## Nye moduler
- `app/src/dev.js`
  - Mountes når URL har `#dev`.
  - Viser meta-info (app-version, SW-version, template-navn, UA, viewport, localStorage-state).
  - Knap til health-check af `JobStore`, `TemplateStore` og `Calc.test()`.
  - Viser `AuditLog.tail(50)` i et `<pre>`.
- `app/src/keyboard.js`
  - Global keydown-listener.
  - Ignorerer events når numpad-overlay er åbent (`.numpad.open`) eller et input-element har fokus.
  - Genveje:
    - `Ctrl/⌘ + S` → `JobStore.saveActive()`
    - `Ctrl/⌘ + P` → klik på `#btn-export-all`
    - `Enter` → `UI.goNext()`

## Globale forventninger
- `window.JobStore` med mindst:
  - `create`, `update`, `get`, `saveActive`, `count`
- `window.TemplateStore` med:
  - `activeMeta()`
- `window.AuditLog` med:
  - `append`, `tail`
- `window.Calc` med:
  - `test()`
- `window.UI` med:
  - `goNext()`
- `window.APP_VERSION` (fallback `'0.0.0'` hvis ikke sat)

## PWA
- `SW_VERSION` konstant i `app/service-worker.js` styrer cache-nedtagning.
- `PRECACHE_URLS` inkluderer:
  - `app/src/dev.js`
  - `app/src/keyboard.js`
  - `app/src/globals.js`
- `manifest.webmanifest`:
  - `start_url: "/"`, `scope: "/"`, `display: "standalone"`.

## Tests
- Unit-tests i `tests/*.spec.js`.
- E2E-flow i `tests/e2e/flow.spec.ts` via Playwright.
- CI-job kører:
  - `npm test`
  - `npm run e2e`
  - `lhci collect` + `lhci assert`
