# Hulmose Codex

Denne codex beskriver den opdaterede tenant-konfiguration for Hulmose Stilladser ApS og hvordan den anvendes i CSMate.

## Datakilder
- **HP3 Priskurant – Provinsen v50** (flipbook): grundlag for prislisten, transportregler (afsnit A6–A11) samt uddannelses-/mentortillæg.
- **Hvidbog – Servicepræget Stillads**: retningslinjer for akkord, dokumentation og frister.
- **DI information om HP3 Provinsen 2025**: udgivelses- og gyldighedsdata.
- **Systemreference**: BOSTA70, HAKI, MODEX, Alfix VARIO.

## Placering i repo
- JSON-konfiguration: `app/data/tenants/hulmose.json` (kopieret til `src/templates/hulmose.json`, `templates/hulmose.json` og `data/templates/hulmose.json` for distribution).
- Standardvalg i applikationen: `DEFAULT_TEMPLATE_ID = 'hulmose'` i `src/modules/templates.js`.

## Roller og rettigheder
| Rolle   | Rettigheder |
|---------|-------------|
| `arbejder` | `send` |
| `formand`  | `approve`, `reject`, `send` |
| `kontor`   | `approve`, `reject`, `send`, `edit`, `administer` |
| `chef`     | `approve`, `reject`, `send`, `edit` |

`kontor` udvider den tidligere kontorfunktion til at kunne administrere, mens `chef` bevarer fuld redigeringsret.

## Lønstruktur
- Grundtimeløn: **147,00 DKK**
- Tillæg pr. time:
  - `udd1`: 42,98 DKK
  - `udd2`: 49,38 DKK
  - `mentor`: 22,26 DKK
- Timepris uden tillæg = `akkordsum / timer`.
- Lønsum = `(147 + valgte tillæg) * timer`.
- Projektsum = `akkordsum + lønsum`.

## Transportregler
Transport følger HP3 Provinsen v50:
1. Op til og med 15 meter er inkluderet (0 % tillæg).
2. Fra 15 til 55 meter: +7 % pr. påbegyndt 10 meter.
3. Over 55 meter: +7 % pr. påbegyndt 20 meter.

Den fulde regelstruktur findes i `transport_rules` i JSON-filen og skal anvendes, når transport (T) er markeret.

### Eksempler
- 25 m ⇒ 1 trin á 7 %.
- 65 m ⇒ 1 trin á 7 % for intervallet over 55 m (55–75).

## Review-oversigt (UI)
Rækkefølge i review:
1. Materialer
2. Ekstra/KM (inkl. tralleløft)
3. Slæb (T)
4. Samlet akkord
5. Timepris uden tillæg
6. Lønsum
7. Projektsum
8. Medarbejdere & timer

## Testcases
Vitest skal minimum dække:
- Template-validering (meta, roller, løn, transport).
- Rollerestriktioner (arbejder vs. formand vs. kontor).
- Transportberegninger for 15 m, 25 m, 55 m, 65 m og kanttilfælde.
- Lønkombinationer (grundløn, +UDD1, +UDD2, +mentor).

Kør `npm run ci` og sikre at serviceworker bumpes efter build.
