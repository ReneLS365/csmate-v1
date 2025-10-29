# CSMate Hulmose – Final Review Master Checklist

> Brug denne tjekliste som sidste QA-gennemgang inden appen overdrages. Alle punkter skal udfyldes og dokumenteres (screenshots/logs) i den afsluttende PR.

## 1. CI, Build & Netlify
- [ ] `npm run ci`, `npm test`, `npm run build` gennemført lokalt uden fejl eller warnings.
- [ ] Netlify build-log gennemgået (ingen warnings, `Build completed successfully`).
- [ ] Dokumentér output fra alle kommandoer i PR / QA-noter.

## 2. PWA & Service Worker
- [ ] `scripts/bump-sw-version.js` kørt – version matcher i `app/service-worker.js` og `cache-output.json`.
- [ ] `npm run build` → bekræft ny cache-version i `dist/` og i DevTools Application-tab.
- [ ] Offline-test: servér `dist/`, slå netværk fra, og bekræft at alle `PRECACHE`-filer hentes.

## 3. IndexedDB & Offline Sync
- [ ] Vitest-suite for IndexedDB (`tests/db.test.js`, `tests/import.v2.test.js`) grøn.
- [ ] Manuel QA: hurtige feltændringer → autosave aktiveres efter 400 ms, uden dubletter.
- [ ] Gem >20 projekter → ældste slettes automatisk, seneste 20 beholdes.
- [ ] Offline → ændre projekt → Online igen → ændringer persisterer (ingen konflikter).

## 4. Godkendelsesflow & Roller
- [ ] `tests/approval.flow.test.js` passerer.
- [ ] UI-test for roller (sjakbajs, formand, kontor, chef): alle transitioner (`kladde↔afventer`, `afventer→godkendt/afvist`) virker.
- [ ] Approval-log (`state.approvalLog`) viser korrekte tidsstempler og rolle-navne.

## 5. Beregninger & Totals
- [ ] `tests/totals.test.js`, `tests/review.sections.test.js`, `tests/transport.module.test.js` (eller tilsvarende) passerer.
- [ ] Manuel QA: kendte cases (inkl. tralleløft 0,35 / 0,50) matcher UI-totaler.
- [ ] Transporttillæg stemmer med HP3-regler (0 %, 14 %, 21 % for testcases 15 m, 35 m, 75 m).

## 6. Review & Layout
- [ ] Review-ordning bekræftet: Materialer → Løn/tillæg → Km & Ekstra arbejde → Samlet akkord → Medarbejdere & timer.
- [ ] Tralleløft, boring, hul & luk-af-hul vises tydeligt i Ekstra-arbejde sektion.
- [ ] PDF/Print-output matcher samme rækkefølge.

## 7. Eksporter & Roundtrip
- [ ] `tests/export.csv.test.js`, `tests/export.final.test.js`, `tests/export.ekomplet.payload.test.js`, `tests/import.v2.test.js` passerer.
- [ ] Manuel roundtrip: Eksportér CSV/PDF/E-Komplet → importer CSV/JSON → totals og ekstraarbejde matcher originalt projekt.
- [ ] E-Komplet CSV åbnet i Excel → dansk decimalformat og korrekte kolonner.

## 8. Templates & Admin
- [ ] `src/templates/hulmose.json`: admin-kode “StilAce”, priser (BOSTA 2025) og rolle-matrix verificeret.
- [ ] `tests/templates.module.test.js` og `tests/tenant.spec.ts` passerer.
- [ ] Skift template i UI, gem projekt → selectedTemplate persists.

## 9. Dokumentation & Release Noter
- [ ] `docs/CHANGELOG.md` opdateret med version/dato og seneste ændringer.
- [ ] `docs/release-readiness-da.md` markeret med aktuelle dato/initialer.
- [ ] PR-body inkluderer fuld “PR-checkliste” med alle felter markeret.
- [ ] QA-noter og relevante screenshots gemt i `docs/` eller linket i PR.

## 10. Afslutning & E-Komplet Handover
- [ ] `git clean -fd` og `git pull origin main` kørt efter merge.
- [ ] Release-tag klar: `codex/{feature}-{date}`.
- [ ] E-Komplet leverancepakke samlet: seneste `E-Komplet` CSV-eksport + `CSMate-Ekomplet-Guide.txt` + changelog (ZIP eller delt mappe).
- [ ] Verificér at `templates/<tenant>.json` indeholder aktuel E-Komplet-mapping (felter + kolonne-navne).
- [ ] Kunde-mail/overdragelsesdokument opdateret med downloadlink, kontaktperson og næste skridt for E-Komplet-integration.

> Når alle bokse er markeret, er appen klar til endelig aflevering.
