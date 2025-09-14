# Scafix PWA – Netlify & GitHub Ready

Denne pakke er gjort klar til GitHub (versionering) og Netlify auto-deploys.

## Deploy (GitHub → Netlify)
1. Opret tomt repo på GitHub og push hele mappen.
2. På Netlify: **Import from Git** → vælg repo.
3. Du behøver ikke sætte Build/Publish i UI – `netlify.toml` styrer det:
   - build command: _tom_
   - publish: _rod_ (`.`)
   - SPA redirect: alle ruter går til `/index.html`

## PWA
- Service worker (`service-worker.js`) bevares, hvis der allerede var en.
- Hvis der ikke var en, har vi lagt en **minimal** SW der cacher basis-filer.
- Bump SW-version ved ændringer for at tvinge clients til at hente nyt.

## Struktur
- `netlify.toml` – redirect + cache headers
- `.gitignore` – ignore dev-filer
- `README.md` – denne fil

_Genereret 2025-09-14 12:52 _
