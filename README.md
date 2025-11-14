# Akkordseddel-webapp

En PWA til hurtig optælling af materialer, akkordberegning og eksport. Projektet kan køres som statisk HTML/JS uden build-step.

## Kom i gang
1. Klon repoet og installer afhængighederne:
   ```bash
   npm install
   ```
2. Byg og servér den statiske app:
   ```bash
   npm run build
   npm run serve:dist
   ```
   Alternativt kan du køre en simpel webserver fra projektroden:
   ```bash
   npm run serve
   ```
3. Åbn `http://127.0.0.1:4173` (eller den port du valgte) i din browser.

Service worker registreres automatisk i produktion. Ved lokale tests kan den caches i browseren, så ryd eventuelt Application Storage mellem sessioner.

## Auth0 konfiguration (offentlige værdier)

Auth0-domænet og API-audience er offentlige værdier og skal ikke lægges i Netlify-miljøvariabler:

- **Domæne**: `dev-3xcigxvdwlymo1k6.eu.auth0.com`
- **Audience**: `https://csmate.netlify.app/api`
- **Redirect URI**: `window.location.origin + '/'`
- **Client ID**: udfyldes i `app/index.html` (feltet `REPLACE_WITH_AUTH0_CLIENT_ID`).

`app/index.html` initialiserer `window.__CSMATE_PUBLIC_CONFIG__` og `window.CSMATE_AUTH0_CONFIG`. Hvis du har brug for at injicere værdier runtime (fx via Netlify snippet), kan du sætte `window.__CSMATE_PUBLIC_CONFIG__` før scriptet kører:

```html
<script>
  window.__CSMATE_PUBLIC_CONFIG__ = {
    AUTH0_DOMAIN: 'dev-3xcigxvdwlymo1k6.eu.auth0.com',
    AUTH0_CLIENT_ID: 'REPLACE_WITH_AUTH0_CLIENT_ID',
    AUTH0_AUDIENCE: 'https://csmate.netlify.app/api',
    AUTH0_REDIRECT_URI: window.location.origin + '/'
  };
</script>
```

Client secrets skal fortsat kun ligge i Auth0/Netlify miljøet – kun de offentlige værdier hører til i frontend.

## Auth0 client secret (deployment)

- **Environment key**: `AUTH0_CLIENT_SECRET`.
- **Hvor lagres den?**
  - Netlify → Site configuration → Environment variables (`AUTH0_CLIENT_SECRET` for alle deploy contexts).
  - GitHub → Repository settings → Secrets → Actions (`AUTH0_CLIENT_SECRET`).
- **Hvor bruges den?** Nuvarande kode læser ikke hemmeligheden direkte, men den skal være tilgængelig til Netlify functions eller scripts, der henter Auth0 management tokens.
- **Aldrig i frontend**: Undgå `VITE_`-prefix eller bundling i `app/`-koden – hemmeligheden må ikke dukke op i build-output eller i PWA'en.

### Checkliste efter rotation

1. Rotér client secret i Auth0 dashboardet.
2. Opdater Netlify environment variabler (`AUTH0_CLIENT_SECRET`) og udløs en ny deploy.
3. Opdater GitHub Actions-secret `AUTH0_CLIENT_SECRET`.
4. Kør lokalt: `npm test` og `npm run build` for at bekræfte at applikationen fungerer uden hardkodede secrets.
5. Efter deploy: test login/logud og kontroller Netlify function logs for eventuelle Auth0-fejl.
6. I browseren: søg i DevTools (Network/Application) efter `AUTH0_CLIENT_SECRET` og bekræft at den ikke eksponeres.

## Roller og rettigheder

Appen bruger Auth0-roller til at styre UI og funktioner:

- **csmate-user**: standardbruger med adgang til job, optælling, løn og eksport.
- **Company-admin**: kan administrere lokale brugere for firmaet og får adgang til firmaadministrationspanelet.
- **csmate-admin**: platform-admin med adgang til alle paneler (inkl. platform/admin-sektionerne).

`app/main.js` viser/skjuler panelerne `#admin-panel`, `#company-admin-panel` og `#platform-admin-panel` baseret på rolleflag fra `auth.js`.

## Nye hovedfunktioner
- **Sagsinfo-fane** med krævede felter (Sagsnummer, Navn/opgave, Adresse, Kunde, Dato, Montørnavne). Eksport, print og E-komplet-knappen er låst indtil disse felter er udfyldt.
- **Responsivt layout**: Grid-sektioner klapper ned på én kolonne <600px, større touchmål og fast viewport for mobil.
- **CSMate-lommeregner** til alle inputs med `type="number"` eller `inputmode="numeric|decimal"`. Den understøtter procent, kvadratrødder, pi og de fire regnearter, åbner ved fokus og kan betjenes med tastatur (Tab, Enter, Esc) og mus/touch.
- **Drag & drop CSV-import**: Træk en fil ind på importzonen eller klik for at vælge. Importen accepterer variationer af disse overskrifter (case-insensitive, diakritiske tegn fjernes):
  - `Sagsnummer`, `Navn/opgave`, `Adresse`, `Kunde`, `Dato`, `Montørnavne`
  - Materialer: `Materialenavn`/`Materiale`/`Varenavn`, `Antal`, `Pris`, `Id`
  - Løn: `Arbejdstype`, `Timer`, `Sats`
  Datoer parses i både `YYYY-MM-DD` og `DD-MM-YYYY`. Manglende felter bevares fra eksisterende UI-værdier.
- **Manuelle materialer**: Tre tomme rækker nederst i materialelisten kan navngives og indtastes manuelt og tælles med i summer, PDF og CSV.
- **Nye totaler i overblik**: `Materialesum`, `Lønsum` (akkord fordelt på medarbejdere) og `Projektsum`. Tralleløft-data, hvis udfyldt i Løn-fanen, føjes automatisk til totaler og CSV.

## Nye features (Hjælp, /dev, genveje)
- **Hjælp-fane**
  - Quickstart-guide: Opret job → vælg system → tæl materialer → udfyld løn → eksportér akkordseddel.
  - Mini-FAQ om zoom og PWA-installation på Android/iOS.
  - Tastatur-genveje for desktop.
- **ScafBook**
  - Kort oversigt over vindlast, søjletryk, transport, slæb.
  - Links til HP3 Provinsen og overenskomst 2024–2026.
- **/dev-panel**
  - Vises ved `#dev` i URL.
  - Meta: app-version, SW-version, aktiv template, user agent, viewport, storage.
  - Health-check med ✅/❌ for JobStore, TemplateStore og beregningsbaseline.
  - Audit-viewer med de seneste 50 log-poster.
- **Genveje**
  - `Ctrl/⌘ + S` gemmer aktivt job.
  - `Ctrl/⌘ + P` åbner eksport/print.
  - `Enter` triggere næste logiske handling, så længe numpad ikke er åben og fokus ikke er i et input.
- **Tests og CI**
  - Unit-tests: `npm test`
  - E2E-tests: `npm run e2e`
  - Lighthouse CI: `npx lhci collect && npx lhci assert --config=.lighthouserc.cjs`

## Testplan PR #125 → HEAD

Se [docs/testing/pr-125-forward.md](docs/testing/pr-125-forward.md) for en detaljeret rapport over alle ændringer fra PR #125 til nu, inkl.:
- feature-områder pr. PR
- automatiske testresultater (lint, Vitest, Playwright, build)
- kendte kritiske regressioner og TODOs

## Eksport og print
- **Del til E-komplet (CSV)**: Eksporterer en semikolon-separeret fil med Sagsinfo, materialer (inkl. manuelle og tralleløft), lønlinjer og totaler. Tal skrives med komma-decimaler.
- **Eksportér PDF + CSV**: Genererer først CSV (som ovenfor), beregner løn (kører `Beregn løn`) og laver derefter en PDF med Sagsinfo, materialetabel, lønoversigt, totaler samt den aktuelle resultatsektion.
- **Print**: Udskriver hele UI'et (PWA'en er print-optimeret og skjuler betjeningsknapper).

Alle tre handlinger kræver udfyldt Sagsinfo. Ved manglende data vises en tydelig besked ved knapperne.

## CSV-format (oversigt)
| Sektion | Kolonner | Noter |
| --- | --- | --- |
| Sagsinfo | `Sagsnummer`, `Navn/opgave`, `Adresse`, `Kunde`, `Dato`, `Montørnavne` | Feltoverskrifter kan variere (fx `Navn`, `Opgave`). |
| Materialer | `Id`, `Materialenavn`, `Antal`, `Pris` | Matches på ID eller navn; ukendte rækker placeres i manuelle felter. |
| Løn | `Arbejdstype`, `Timer`, `Sats` | Timer fyldes i medarbejderfelter; sats bruges til Lønsum. |

Manglende sektioner giver 0 i summerne – appen viser alligevel Sagsinfo og eksisterende værdier.

## Kode struktur
- `app/index.html` – markup, faner og sektioner
- `app/style.css` – hovedtema, responsive grids og tastaturoverlay
- `app/print.css` – printoptimering
- `app/main.js` – datasæt, rendering, beregninger, CSV/PDF, drag-drop og numerisk tastatur
- `app/dataset.js` – yderligere datalister
- `app/service-worker.js` – PWA-cache (minimal)
- `app/data/` – materialer, tenants og øvrige JSON-kilder til appen og Netlify Functions

## Vedligeholdelsesnoter
- `window.__traelleloeft` anvendes til at overføre tralleløft-data mellem lønberegning og eksport.
- `manualMaterials`-arrayet rummer de tre manuelle materialer – nulstilles automatisk ved CSV-import.
- `numericKeyboard.init()` kører ved DOMContentLoaded og binder globale `focusin`/`keydown`-lyttere.
- For at ændre CSV-format, justér `downloadCSV()`; for PDF-layout, se `exportPDF()`.

## Licens
Se projektets originale licensbestemmelser (ikke ændret i dette arbejde).
