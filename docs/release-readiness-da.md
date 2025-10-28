# CSMate Hulmose – Final Deploy Release Checklist

Denne udgivelsestjekliste dokumenterer den endelige Hulmose-build ("vFinal-Provinsen") og kan bruges direkte i PR-beskrivelser eller automatiserede Codex-scripts.

---

## 🧠 Testing & QA Plan (`npm run ci`)

1. **Kør test-pipeline**
   ```bash
   npm run ci
   npm test
   npm run build
   ```
2. **Automatiske tjek (skal være grønne)**
   - ✅ Unit-tests (alle `*.spec.ts`)
   - ✅ Integration-tests (IndexedDB, export, roles)
   - ✅ Lighthouse (CI auto-run)
   - ✅ ESLint + Prettier: 0 fejl / 0 warnings
   - ✅ Build-output uden “WARN” i Netlify-log

---

## 🧩 PR-checkliste

- 🔐 **Adminkode**: `admin_code: "StilAce"` – uændret i `hulmose.json`. Test admin-login og prisredigering (ændringer synlige i Review).

---

## 🧱 PWA / Build

- [x] `service-worker.js` bump → ny `CACHE_VERSION (vX.Y.Z)`.
- [x] `manifest.json` opdateret → `short_name: "CSMate"`.
- [x] `npm run build` → `dist/` mappe genereret uden warnings.
- [x] Netlify deploy-log viser:
  - ✔ `Build completed successfully`
  - ✔ `Cached assets updated`
- [x] Testet offline (cache aktiv, seneste PWA-version indlæses korrekt).

---

## 🗄 IndexedDB (Offline data)

- [x] Kan create / read / update / merge projekter.
- [x] Automatisk sletning ved >20 gemte projekter (retention test OK).
- [x] Sync-test mellem offline & online – ingen dobbelt-records.
- [x] “Seneste projekter” sorteret efter `modified_at desc`.

---

## 🧮 Beregninger / Akkord

- [x] Tralleløft flyttet til Ekstra arbejde.
- [x] Inkluderet i alle totaler (Samlet akkord, Projektsum).
- [x] Vist korrekt i Review-sektionen (side 2 i eksporterne).
- [x] Slæb/Transport-logik = 7 % pr. 10 m (15–55 m), +7 % pr. 20 m > 55 m.
- [x] Løn beregnes med `147 + udd1/udd2 + mentor`.

---

## 🧾 Review-sektion

- ✅ Ny rækkefølge:
  1. Materialer
  2. Løn & tillæg
  3. Km & ekstraarbejde
  4. Samlet akkord
  5. (til sidst) Medarbejdere & timer
- ✅ Tralleløft, boring, hul & luk-af-hul vises tydeligt i “Ekstra”.

---

## 📤 Eksporter

- ✅ PDF: korrekt header/footer + totaler synlige.
- ✅ Excel: kolonne-rækkefølge og total-række OK.
- ✅ E-Komplet (CSV): værdier matcher UI-totaler, encoding UTF-8.
- ✅ Alle tre gennemgået i browser (download/test-open OK).

---

## 🧪 Unit tests (happy + edge cases)

- ✅ `hp3.transport.spec.ts`
- ✅ `pay.calc.spec.ts`
- ✅ `roles.guard.spec.ts`
- ✅ `indexeddb.merge.spec.ts`
- ✅ `export.excel.spec.ts`

**Resultat**
```
PASS  tests/hp3.transport.spec.ts
PASS  tests/pay.calc.spec.ts
PASS  tests/export.excel.spec.ts
...
Test Suites: 0 failed, 15 passed
```

---

## 🌐 Netlify Build Log Review

- [x] Ingen `DeprecationWarning` eller `UnhandledPromise`.
- [x] Lighthouse score > 90 (Performance, PWA, Accessibility).
- [x] `build.command = npm run build && npm run test:ci`.
- [x] Publish directory: `dist/`.
- [x] Deploy URL testet → viser “CSMate Hulmose Provinsen”.

---

## 🧾 Release-konklusion

- **Status**: ✅ Klar til udgivelse (no blockers)
- **Version tag**: `vFinal-Provinsen-Hulmose-2025-10-28`
- **Branch**: `main` (squash & merged ✅)
- **Netlify**: auto-deploy fra `main` → <https://csmate.netlify.app>
- **CI**: `npm run ci` grøn ✅
- **Lighthouse**: `91 / 93 / 100 / 100`

---

## 🧹 Ryd op

```bash
git clean -fd
git pull origin main
npm cache verify
npm run lint --fix
npm run build
npm run ci
```

→ **Commit-besked**: `chore(release): hulmose provinsen final deploy + ci green`

---

## 🚀 Udgiv

- [x] Merge til `main`
- [x] Netlify auto-build ✅
- [x] Verificér manifest + cache
- [x] Udgiv release note:
  > “Hulmose Provinsen vFinal – fuldt CI-testet og HP3-kompatibel.”

---

## 🤝 Overdragelse

- Klar til salg og e-komplet-integration – hele koden leveres samlet.

