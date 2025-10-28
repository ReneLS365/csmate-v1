# Nye firmaer på den nuværende Hulmose-build

**Formål:** Genbrug Hulmose-opsætningen som template uden at ændre app-logik eller UI.

## Proces (administrativt – ingen kodeændringer)
1. **Adminkode:** Brug den eksisterende adminkode “StilAce” via appens adminflow.
2. **Kopiér opsætning:** Duplicér satser, priser og løn fra den nuværende konfiguration via UI’en.
3. **Metadata:** Omdøb firmanavn/ID i de eksisterende felter – samme struktur som Hulmose bruger.
4. **Løn og priser:** Indtast firma-specifikke tal via adminpanelet; beregningerne genbruger den nuværende logik.
5. **Adminkode per firma:** Tildel en unik adminkode gennem den samme visning – ingen kodeændringer.

## Noter
- Ingen ændringer i komponenter, DOM, CSS eller beregningslogik.
- Hele processen foregår som data/konfiguration i UI’et fra Hulmose-versionen.
