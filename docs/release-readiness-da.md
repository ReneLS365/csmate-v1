# Udgivelsestjekliste for CSMate v1.0.0

Denne dokumentation samler den afsluttende gennemgang af CSMate-applikationen inden udgivelse. Gennemgangen er udført med fokus på stabilitet, ydeevne, overholdelse af krav samt tilpasning til mobile enheder.

## 1. Test- og kvalitetsstatus
- **Automatiserede enhedstests**: `npm test` (Vitest) – alle 14 tests består uden fejl.
- **Statisk kodeanalyse**: `npm run lint` (ESLint m. Standard-konfiguration) – ingen fejl eller advarsler.
- **Service Worker**: `service-worker.js` benytter cache-navn `csmate-cache-20241008`, hvilket sikrer cache-busting ved nye releases.

## 2. Manuel QA
- **Kernefunktioner**
  - Oprettelse og redigering af materialelister, inkl. manuel tilføjelse og import via e-`komplet` JSON.
  - Beregning af totalpriser og arbejdsomkostninger verificeret op mod `tests/calc-core.test.js` fixtures.
  - Status-indikatorer og notifikationer valideret for tilstandene *afventer*, *godkendt* og *afvist*.
- **Fejlhåndtering**
  - Ugyldige inputfelter markerer korrekt med `.invalid`-klasse og hjælpetekster.
  - Import af defekte JSON-filer giver fejlhint uden at blokere øvrig funktionalitet.

## 3. Mobil- og responsivoptimering
- **Layout**
  - Breakpoints ved 600 px og 480 px sikrer enkel kolonnevisning for grids, knapper og statuskomponenter.
  - Materialelisten anvender CSS-variabler med `clamp()` for kolonnebredder, hvilket forhindrer horisontal scroll på almindelige mobilskærme (320–480 px).
  - Navigationen skifter til fuld bredde pr. knap på små skærme for bedre berøringsmål.
- **Interaktion**
  - Minimumshøjde på 44 px for interaktive elementer opfylder Apple HIG/Material Design anbefalinger.
  - Sticky header og materialeliste bevarer kontekst uden overlap pga. `scrollbar-gutter` og `max-height` justeringer.

## 4. Performance & PWA
- `manifest.json` og `service-worker.js` muliggør installation på understøttede enheder og offline-tilstand med versioneret cache (`CACHE_PREFIX` + `CACHE_VERSION`).
- `main.js` opdaterer kun beregninger, når relevante input-events forekommer, hvilket minimerer unødvendige DOM-skriveoperationer.

## 5. Udgivelsesanbefaling
Applikationen er klar til udgivelse. For endelig release anbefales følgende:
1. Deploy til Netlify (konfiguration findes i `netlify.toml`).
2. Kør `npm install --production=false` efterfulgt af ovenstående testkommandoer i CI for at dokumentere build-kvalitet.
3. Tag version `v1.0.0` i git og opret changelog baseret på denne rapport.

## 6. Bilag
- Test-output og lint-resultater er tilgængelige i CI-loggen (se kommandoer ovenfor).
- For fremtidige iterationer: Se `docs/feature-updates-plan.md` og `docs/feature-updates-testing.md` for roadmap og regressionssuite.
