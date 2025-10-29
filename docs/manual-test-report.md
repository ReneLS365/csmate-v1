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

## Export Roundtrip QA – 2025-02-27
- `npx vitest run tests/export.csv.test.js tests/export.final.test.js tests/export.ekomplet.payload.test.js tests/import.v2.test.js` → pass (CSV rows keep Danish decimal comma, JSON/EK payloads stay aligned, import schema v3 restores all fields). 【1eec31†L1-L8】【e256fd†L1-L44】【bef43e†L1-L34】【295a4f†L1-L27】【e821b9†L1-L43】
- Verified via `tests/export.csv.test.js` that the generated CSV fields remain numeric strings with comma separators (e.g. `1000,00`, `280,00`) and include extra work columns for km, holes, and trolley lift totals. 【e256fd†L1-L44】
- `tests/export.final.test.js` confirms montage/demontage totals and variants survive the JSON roundtrip, ensuring totals/extrawork parity when re-importing. 【bef43e†L1-L34】【e821b9†L1-L43】
- `tests/export.ekomplet.payload.test.js` guarantees the E-Komplet payload bundles user/role context alongside positive monetary totals, and `tests/import.v2.test.js` shows the importer restores the same values (including add-ons) on rehydrate. 【295a4f†L1-L27】【e821b9†L1-L43】
- Manual UI export/import smoke plus Excel column layout check remain pending; needs a full browser with download support and Excel-compatible viewer to verify PDF/JSON downloads and column formatting visually.
