# Manual Test Report (Autosave & Retention)

## Vitest Coverage Checks
- `npx vitest tests/db.test.js` → pass (confirms IndexedDB persistence and retention helpers). 【8ffb2f†L1-L16】
- `npx vitest tests/import.v2.test.js` → pass (confirms import schema fallbacks). 【f2fde5†L1-L13】
- `npm run ci` → lint, unit tests (coverage) and build all succeeded. 【59f439†L1-L23】

## Autosave Debounce Verification
- Launched the built app via `http-server` and exercised UI with Playwright.
- Filled sagsinfo (`#sagsnummer`, `#sagsnavn`, `#sagsmontoer`), switched to **Løn**, injected 7 hours on first worker, then pressed **Beregn løn** once.
- After waiting >2s (covers the 400 ms debounce), queried IndexedDB (`csmate_projects/projects`).
- Result: exactly one record stored (`id: 1`, name `Autosave Project`, one worker entry). 【0139bf†L1-L2】

## Autosave Snapshot Duplication Check
- Repeated the Beregn flow with a name change (`Autosave Project v2`).
- Observed two entries in IndexedDB with incrementing ids (`id: 1` for the first, `id: 2` for the second). This reflects current snapshot-per-run behavior; no duplicate rows were created for the same invocation. 【cc7991†L1-L4】

## 20-Project Retention Policy
- Ran a Playwright script to generate 22 quick snapshots (unique names `Project 0` → `Project 21`).
- After completion, IndexedDB reported only 20 rows remaining. Earliest kept row was `id: 3` (`Project 2`), confirming oldest records were pruned. 【31fc12†L1-L3】

## Offline → Online Resync Smoke Test
- Started a fresh context, created an "Online Project", then toggled Playwright to offline mode.
- While offline, recalculated with new name "Offline Project"; after restoring online mode, ran again with "Back Online Project".
- IndexedDB contained three sequential entries with matching labels across offline/online transitions, and no transaction errors surfaced. 【01296d†L1-L1】【b9f756†L1-L8】
