# Feature Updates – Testnoter

## Opsætning
- Lokalt kørt via `python -m http.server 8000` i projektroden.
- Testet i Chrome 121 (desktop) og devtools mobile viewport (iPhone 12 / 390×844) + 360×640.

## Funktionelle checks
- [x] **Sagsinfo-validering**: Udfyldelse/rydning af felter aktiverer/deaktiverer E-komplet, PDF+CSV og Print. Udfyldningshint forsvinder når alle felter er gyldige.
- [x] **Tab navigation**: Sagsinfo/Optælling/Løn kan skiftes med mus og tastatur (Tab + Enter). Aktiv fane markeres visuelt.
- [x] **Materialer**: Systemfiltre (Bosta/Haki/Modex/Alfix) toggler lister; tre manuelle rækker accepterer tekst og tal og påvirker totals.
- [x] **Totals**: Materialesum, Lønsum og Projektsum opdateres live ved ændring af materialer og løn. Tralleløft-beløb lægges til projektsum og CSV.
- [x] **CSV-import**:
  - Drag-over giver markeret felt; dropper gyldig CSV (med variation i headers) → Sagsinfo, materialer og løn felter opdateres.
  - Klik på importzonens tekst åbner filvælger.
  - Datoer i `03-10-2025` og `2025-10-03` normaliseres til `2025-10-03`.
  - Ukendte materialer placeres i manuelle rækker; tallene tæller med.
  - Løndata opretter medarbejdere med timer og vises i totaler.
- [x] **Numerisk tastatur**: Popper op ved fokus på numeriske inputs i alle faner (inkl. manuelle rækker). Understøtter Tab-cyklus, Enter=OK, Esc=luk. Lukker ved klik udenfor.
- [x] **Eksport**:
  - CSV indeholder Sagsinfo, materialer (incl. manuelle + tralleløft), lønlinjer og totals med komma-decimaltal.
  - PDF viser Sagsinfo, materialetabel, løntabel, totaler samt aktuelt resultat (inkl. tralleløft-sektion når relevant).
  - `exportAll` udfører lønberegning og laver begge filer i ét klik.
- [x] **Print**: Visuelt tjek i print-preview – navigationsknapper skjules, Sagsinfo/Overblik/Løn synlige.

## Responsivitet
- [x] 360–400px bredde: grids falder til én kolonne, knapper fylder bredden, tekstfelter forbliver læsbare (font-size ≥ 16px).
- [x] ≥1024px: tre-kolonne layouter anvendes, totals vises side om side.
- [x] Numeric keyboard overlay skalerer på mobil og dækker nederste del uden at overlappe vigtig info.

## Edge cases
- [x] CSV med kun Sagsinfo → import bevarer eksisterende materialer, totals opdateres korrekt.
- [x] CSV uden løn-sektion → Lønsum=0; `downloadCSV` stadig succes.
- [x] Brug af decimaltegn i tastaturet (`0,75`) gemmes som `0.75` i input, men vises med komma i totals/CSV.
- [x] Rydning af Sagsinfo efter import låser igen eksportknapperne og viser hint.

## Kendte begrænsninger
- Løn-sats fra CSV lagres til Lønsum men udfylder ikke uddannelses-/tillægsfelter (skal justeres manuelt hvis behov).
- Numerisk tastatur understøtter ikke negative tal (ikke påkrævet i nuværende forretningslogik).
