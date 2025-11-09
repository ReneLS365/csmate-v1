# Security Guidelines

## Auth0 Secrets

- Auth0 SPA integration **must never** use a client secret in frontend code, build output, or committed configuration files.
- Keep `app/src/auth0-config.js` limited to the public values (domain, client ID, redirect URI). Backend-only secrets belong in environment variables configured in Netlify.
- Replace any sample values with placeholders (e.g. `AUTH0_CLIENT_SECRET="REPLACE_WITH_REAL_SECRET_IN_NETLIFY_ONLY"`) before committing.
- After removing any exposed secret, rotate it in the Auth0 dashboard. See the inline TODO comment in `app/src/auth0-config.js` for the current follow-up action.

## Netlify Secret Scanning

Netlify will block builds when exposed secrets are detected. Do **not** disable scanning by default. If a confirmed false positive ever occurs, document the finding and consider one of these scoped overrides:

- `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES`: comma-separated strings that should be ignored by the detector.
- `SECRETS_SCAN_SMART_DETECTION_ENABLED=false`: last-resort toggle that disables the smart detector entirely.

Only apply these overrides for verified false positives and keep them out of version control unless explicitly approved.
