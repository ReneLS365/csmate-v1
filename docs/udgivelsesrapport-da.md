# Udgivelsesrapport – Akkordseddel-webapp

Denne rapport opsummerer den aktuelle tilstand for Akkordseddel-webappen, dens vigtigste funktioner, tekniske detaljer, kvalitetssikring og anbefalinger til drift og videre udvikling. Formålet er at give kommende ejere, projektledere og udviklere et fuldt overblik over produktet.

## Produktoversigt

- **Produktnavn:** CSMate – Akkordseddel-webapp
- **Formål:** Hurtig registrering af materialer, løntimer og projektoplysninger til brug i akkord- og entreprisesager.
- **Platform:** Ren HTML/JS PWA, kan hostes som statisk site uden build-step.
- **Primære brugere:** Montage- og byggevirksomheder, der har behov for at udarbejde akkordsedler, eksportere data til E-komplet og generere print/PDF.

## Centrale funktioner

1. **Sagsinformation** – Faneblad med obligatoriske felter (sagsnummer, opgavenavn, adresse, kunde, dato, montørnavne). Eksport- og printfunktioner låses op, når felterne er udfyldt.
2. **Materialeoversigt** – Liste med både importerede materialer og tre manuelle rækker, som altid kan udfyldes direkte i UI'et. Summer integreres automatisk.
3. **Lønfane** – Indtastning af medarbejdere, timer og akkordtyper, inkl. tralleløft-support via `window.__traelleloeft`.
4. **CSV-import** – Drag & drop eller filvælger, robust mod variationer i kolonneoverskrifter, store/små bogstaver og diakritiske tegn.
5. **CSMate-lommeregner** – Numerisk tastatur til alle `number`-felter med støtte for avancerede udtryk, tastaturgenveje og touch.
6. **Eksport** – Generering af CSV til E-komplet, kombineret PDF + CSV og direkte print med optimeret layout.
7. **Offline/PWA** – Service worker cache'er ressourcer i produktionsmiljøer, så appen fungerer offline på gentagne besøg.

## Nyeste kodeændringer

- Robuste fallback-rutiner sikrer, at overskrifter fra importerede filer renses for diakritiske tegn, selv i miljøer uden `String.prototype.normalize`. Dette forhindrer fejl ved import på ældre browsere og webviews.
- Nye automatiserede tests dokumenterer og verificerer den forbedrede normaliseringslogik.

## Arkitektur og kodeorganisation

- `index.html` indeholder hele UI-strukturen og er opdelt i faner for Sagsinfo, Materialer, Løn og Resultater.
- `main.js` fungerer som central controller: håndtering af state, rendering, import/eksport, lommeregner og event binding.
- `src/lib` rummer genanvendelige hjælpefunktioner, herunder `timeRows.js`, som normaliserer løndata ved import.
- `style.css` og `print.css` definerer hhv. skærm- og printlayout; `print.css` skjuler interaktive elementer ved udskrivning.
- `dataset.js` leverer referenceoplysninger til UI'et (fx materiale- og lønarter).
- `service-worker.js` implementerer en simpel cache-strategi for PWA-understøttelse.

## Kvalitetssikring

Alle tilgængelige automatiserede kontroller er kørt på den nuværende kodebase:

| Tjek | Kommando | Status |
| --- | --- | --- |
| Vitest | `npm test -- --run` | ✅ Bestået |
| ESLint | `npm run lint` | ✅ Bestået |

Vitest-suite dækker import-/eksportlogik, lønberegninger, materialefiltre og den nye normaliseringsfallback. ESLint overholder StandardJS-konventioner for hele `src/**/*.js`.

## Drift og udrulning

1. **Hosting:** Kopiér hele projektmappen til en statisk webserver. Ingen bundler kræves.
2. **Lokal test:** Start fx `python -m http.server 8000` i roden og besøg `http://localhost:8000`.
3. **Cache-håndtering:** Ryd browserens application storage mellem testkørsler for at undgå stale service worker-data.
4. **Browserkrav:** Moderne desktop- og mobilbrowsere. Fallback i `timeRows.js` sikrer funktionalitet i ældre WebView-miljøer uden Unicode-normalisering.

## Vedligeholdelsesvejledning

- **CSV-ændringer:** Redigér `downloadCSV()` i `main.js` for at tilføje eller tilpasse kolonner. Husk at opdatere tests i `tests/e-komplet.*` ved ændringer.
- **PDF-layout:** Justér `exportPDF()` og de tilhørende templates i `main.js`. Print CSS bør koordineres for visuel konsistens.
- **Manuelle materialer:** `manualMaterials`-arrayet nulstilles ved import; tilpas logikken, hvis flere manuelle rækker ønskes.
- **Tralleløft-data:** Gemmes på `window.__traelleloeft` og indgår i totaler. Sørg for bagudkompatibilitet ved ændringer.
- **Numerisk tastatur:** `numericKeyboard.init()` binder globale lyttere; test på både touch og tastatur efter ændringer.

## Kendte begrænsninger og risici

- Regex-baseret diakritikfjernelse understøtter en bred vifte af europæiske tegn, men fjerner ikke ideografiske eller ikke-latinske symboler – disse bibeholdes i kolonnenavne.
- Service worker kan cache gamle versioner; informér brugere om at opdatere, hvis UI'et ændres markant.
- Vitest dækker primært forretningslogik. UI-regressionstest bør suppleres med manuel gennemgang ved større ændringer.

## Anbefalinger til videre udvikling

1. Implementer automatiserede end-to-end-tests (fx Playwright) for nøglescenarier: import, manuel redigering, eksport.
2. Overvej lokaliseringssupport for engelske brugere; mange tekster er i dag dansk.
3. Udvid materialedatasættet med mulighed for server-side synkronisering, hvis flere teams skal dele samme kilde.
4. Tilføj CI-pipeline, der kører test og lint ved hver commit for at fastholde kvaliteten.

## Bilag

- **Kildekode:** Se seneste ændringer i `src/lib/timeRows.js` for fallback-implementering og `tests/timeRows.normalize.test.js` for tilhørende tests.
- **Licens:** Uændret fra originalt projekt. Kontrollér `LICENSE` i roden, hvis der foretages juridiske ændringer.

Denne rapport bør opdateres ved større funktionelle ændringer eller nye udgivelser, så kommende ejere altid har et ajourført referencepunkt.
