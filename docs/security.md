# Security Guidelines

## Auth0 Secrets

- Auth0 SPA integration **must never** use a client secret in frontend code, build output, or committed configuration files.
- Keep `app/src/auth0-config.js` limited to the public values (domain, client ID, redirect URI). Backend-only secrets belong in environment variables configured in Netlify.
- Replace any sample values with placeholders (e.g. `AUTH0_CLIENT_SECRET="REPLACE_WITH_REAL_SECRET_IN_NETLIFY_ONLY"`) before committing.
- Store secrets exclusively in managed environments:
  - **Netlify** → Site configuration → Environment variables → `AUTH0_CLIENT_SECRET` (set for all deploy contexts).
  - **GitHub Actions** → Repository settings → Secrets → Actions → `AUTH0_CLIENT_SECRET`.
  - No `VITE_` prefixes – never expose the value to browser code or static assets.
- Current repository code does **not** read `AUTH0_CLIENT_SECRET`; keep the value available for future Netlify functions or scripts that need to exchange management tokens server-side.
- After rotating the secret in Auth0, update Netlify + GitHub immediately and trigger a redeploy to invalidate caches.

## Netlify Secret Scanning

Netlify will block builds when exposed secrets are detected. Do **not** disable scanning by default. If a confirmed false positive ever occurs, document the finding and consider one of these scoped overrides:

- `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES`: comma-separated strings that should be ignored by the detector.
- `SECRETS_SCAN_SMART_DETECTION_ENABLED=false`: last-resort toggle that disables the smart detector entirely.

Only apply these overrides for verified false positives and keep them out of version control unless explicitly approved.

## Post-rotation checklist

1. Rotér client secret i Auth0 dashboardet og gem den sikkert offline.
2. Opdater Netlify environment variabler (`AUTH0_CLIENT_SECRET` for alle deploy contexts) og udløs en manuel redeploy.
3. Opdater GitHub Actions-secret `AUTH0_CLIENT_SECRET`.
4. Kør lokalt: `npm test`, `npm run build`, og verificer at ingen skridt fejler pga. manglende env-vars.
5. Efter deploy: test login/logud-flowet og kontroller Netlify function logs for Auth0-fejl.
6. I browseren: åbn DevTools → Network/Application og søg efter `AUTH0_CLIENT_SECRET` for at sikre, at hemmeligheden ikke eksponeres.
