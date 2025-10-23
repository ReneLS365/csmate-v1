# Feature Updates – Implementeringsverifikation

Denne note gennemgår ønskerne fra opdateringsplanen og bekræfter, at funktionerne er til stede i det nuværende kodegrundlag.

## 1. Udvidet Sagsinfo-sektion
- `app/index.html` indeholder hele sagsinformationsformularen med statusvælger, kalenderknap og krav til alle felter. 【F:app/index.html†L23-L72】
- `app/main.js` holder styr på statuspillen og opdaterer statusvælgeren, så UI'et afspejler den aktuelle tilstand. 【F:app/main.js†L1231-L1259】

## 2. Validering som låser eksport/print
- `validateSagsinfo` markerer mangelfulde felter og deaktiverer alle eksport- og printfunktioner indtil formularen er gyldig. 【F:app/main.js†L1629-L1656】
- Ved initiering tilføjes event-handlere på samtlige Sagsinfo-felter og Print-knappen kræver en bestået validering før vinduet åbnes. 【F:app/main.js†L3087-L3143】

## 3. Responsiv optælling og totals
- Der gengives tre totalfelter (Materialesum/Lønsum/Projektsum) direkte i Optælling- og Løn-sektionerne. 【F:app/index.html†L97-L111】【F:app/index.html†L200-L213】
- `performTotalsUpdate` lægger Tralleløft-tillæg, materialer og løn sammen, samt holder totals synkroniseret på tværs af felter. 【F:app/main.js†L1095-L1138】

## 4. Tre manuelle materialerækker
- `manualMaterials` initialiserer tre tomme rækker som kan udfyldes manuelt og indgår i optællingen. 【F:app/main.js†L593-L600】

## 5. Drag-and-drop importzone + seneste sager
- Importzonen i HTML udstiller både drag-and-drop og tastatur-aktiveret filvalg, mens dropdown og knap giver adgang til gemte sager. 【F:app/index.html†L114-L143】
- `setupCSVImport` håndterer dragover/drop, klik/tastatur og filinput, og `applyProjectSnapshot` indlæser tidligere cases. 【F:app/main.js†L1921-L2005】

## 6. Globalt numerisk tastatur
- Alle inputs mærket `data-numpad="true"` gøres skrivebeskyttede og åbner det modulære tastatur; MutationObserver sikrer bindinger på dynamiske noder. 【F:app/src/ui/numpad.init.js†L3-L68】

## 7. Eksportworkflow
- `downloadCSV`, `exportAll` og `exportZip` bliver aktiveret, når Sagsinfo er valid, og `exportAll` kæder PDF/CSV-generering. Knappens events er registreret ved app-initialisering. 【F:app/main.js†L1629-L1656】【F:app/main.js†L3087-L3143】
- E-komplet roundtrip-testen bekræfter, at CSV-strukturen kan importeres og valideres uden datatab. 【F:tests/e-komplet.roundtrip.test.js†L1-L36】

## 8. Arbejdsflow for Løn
- Løn-sektionens input anvender numerisk tastatur, og `performTotalsUpdate` udfylder automatisk montage/demontagefelterne, så Lønsum/Projektsum forbliver konsistente. 【F:app/index.html†L146-L213】【F:app/main.js†L1095-L1138】

## 9. QA-status
- `npm test` og `npm run lint` kører uden fejl (se terminaloutput i denne opgaves log).

Samlet set er alle punkter fra den tidligere plan implementeret og funktionelt understøttet i den nuværende branch.
