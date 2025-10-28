# CSMate License & Deployment Agreement (DK)

## 1. Parter
- **Udvikler:** René Løwe Sørensen ("Udvikleren")
- **Produkt:** CSMate PWA og tilhørende moduler ("Systemet")
- **Licenstager:** Det firma, der modtager en tenant-/template-deployment ("Firmaet")

## 2. Ejerskab og licens
1. Udvikleren er eneindehaver af al kildekode, design, dokumentation og knowhow i Systemet.
2. Firmaet modtager en ikke-eksklusiv, ikke-overdragelig brugsret til Systemet gennem en deployment-licens pr. template.
3. Licensen giver alene adgang til at anvende Systemet i Firmaets drift og integrationer med godkendte tredjepartssystemer.

## 3. Deployment-licenser
1. Hver template (fx `hulmose`, `oens`, `stilladsgruppen`) repræsenterer én deployment-licens knyttet til et specifikt CVR-nummer.
2. Re-deployment til andre enheder kræver skriftlig accept fra Udvikleren.
3. Firmaet skal holde sin admin-kode fortrolig (eksempel: `StilAce`) og må ikke dele kode eller template med andre virksomheder.

## 4. Vedligehold og ændringer
1. Core-koden i Systemet må kun ændres af Udvikleren eller personer, Udvikleren har godkendt skriftligt.
2. Firmaet må konfigurere priser, lønninger, roller og andre parametre via templates og admin-panelet, men må ikke ændre kildekoden.
3. Ønsker Firmaet nye funktioner eller ændringer, skal disse bestilles hos Udvikleren.

## 5. Integrationer
1. Integration til tredjepart (fx E-Komplet, Intempus, Ordrestyring) kræver forudgående skriftlig accept fra Udvikleren.
2. Alle integrationer skal markeres med teksten **"Powered by CSMate"** i brugerflader og dokumentation.
3. Udvikleren stiller en REST-baseret connector til rådighed, som Firmaet og tredjeparten skal anvende. Tredjeparten må ikke kopiere eller reverse engineere Systemets logik.

## 6. Support og opdateringer
1. Udvikleren leverer teknisk support efter nærmere aftale (SLA).
2. Opdateringer, sikkerhedsrettelser og feature-udvidelser udsendes af Udvikleren. Firmaet er ansvarlig for at deploye opdaterede templates.

## 7. Varighed og opsigelse
1. Licensen træder i kraft ved underskrift og løber, indtil den opsiges.
2. Begge parter kan opsige med 90 dages skriftligt varsel.
3. Ved væsentlig misligholdelse kan Udvikleren ophæve licensen uden varsel. Firmaet skal i så fald straks ophøre med at bruge Systemet og slette alle kopier.

## 8. Fortrolighed
1. Parterne skal holde tekniske oplysninger, forretningshemmeligheder og kundedata fortrolige.
2. Fortrolighedsforpligtelsen gælder i licensperioden og 5 år derefter.

## 9. Ansvarsbegrænsning
1. Systemet leveres "som det er" uden garanti for fit til et specifikt formål.
2. Udviklerens samlede ansvar er begrænset til det licensbeløb, Firmaet har betalt de seneste 12 måneder.
3. Udvikleren er ikke ansvarlig for indirekte tab, driftstab eller datatab.

## 10. Lovvalg og værneting
1. Aftalen er underlagt dansk ret.
2. Tvister afgøres ved Udviklerens hjemting (Danmark).

## 11. Bilag A – Template-struktur

Nedenstående JSON matcher den struktur, der er implementeret i mappen `templates/`. Felter kan udvides efter aftale, men navne og datatyper skal bevares.

```json
{
  "_meta": {
    "company": "Firma A/S",
    "template": "firma",
    "currency": "DKK",
    "source": "BOSTA 2025",
    "generated": "2025-10-28",
    "admin_code": "AdminKode"
  },
  "pay": {
    "base_wage_hourly": 0,
    "allowances_per_hour": {
      "udd1": 0,
      "udd2": 0,
      "mentor": 0
    },
    "overtime_multipliers": {
      "weekday": 1.5,
      "weekend": 2
    }
  },
  "roles": {
    "chef": ["approve", "reject", "send", "edit"],
    "formand": ["approve", "reject", "send"],
    "arbejder": ["send"]
  },
  "price_table": {
    "B001": 2.68,
    "B002": 2.68,
    "B005": 16.71,
    "B010": 16.71,
    "B011": 12.53,
    "B024": 15.66,
    "B030": 9.4,
    "M036": 16.71,
    "M037": 16.71,
    "M073": 42.98
  }
}
```

## 12. Accept

Ved underskrift bekræfter Firmaet, at det har læst og accepteret vilkårene for brug af CSMate.

| Firma | Navn | Titel | Dato | Underskrift |
|-------|------|-------|------|-------------|
|       |      |       |      |             |

| Udvikler | Navn | Titel | Dato | Underskrift |
|----------|------|-------|------|-------------|
| René Løwe Sørensen | Udvikler & indehaver |  |  |  |
