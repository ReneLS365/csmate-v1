# Akkordseddel-webapp

En PWA til hurtig optælling af materialer, akkordberegning og eksport. Projektet kan køres som statisk HTML/JS uden build-step.

## Kom i gang
1. Klon repoet og installer ingen ekstra afhængigheder – alt ligger i `/`.
2. Start en simpel webserver i projektroden, fx:
   ```bash
   python -m http.server 8000
   ```
   eller
   ```bash
   npx http-server
   ```
3. Åbn `http://localhost:8000` i din browser.

Service worker registreres automatisk i produktion; ved lokale tests kan den caches i browseren, så husk evt. at rydde application storage mellem sessioner.

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
- `index.html` – markup, faner og sektioner
- `style.css` – hovedtema, responsive grids og tastaturoverlay
- `print.css` – printoptimering
- `main.js` – datasæt, rendering, beregninger, CSV/PDF, drag-drop og numerisk tastatur
- `dataset.js` – yderligere datalister
- `service-worker.js` – PWA-cache (minimal)

## Vedligeholdelsesnoter
- `window.__traelleloeft` anvendes til at overføre tralleløft-data mellem lønberegning og eksport.
- `manualMaterials`-arrayet rummer de tre manuelle materialer – nulstilles automatisk ved CSV-import.
- `numericKeyboard.init()` kører ved DOMContentLoaded og binder globale `focusin`/`keydown`-lyttere.
- For at ændre CSV-format, justér `downloadCSV()`; for PDF-layout, se `exportPDF()`.

## Licens
Se projektets originale licensbestemmelser (ikke ændret i dette arbejde).
