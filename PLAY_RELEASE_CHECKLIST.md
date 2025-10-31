# CSMate – Play release tjekliste (TWA)

**Når du er på PC:**

1) Installer værktøjer  
   - Node 18+, Java JDK 17+, Android SDK.  
   - `npm i -g @bubblewrap/cli@latest`

2) Sæt PROD_URL (din hosted PWA – HTTPS)  
   ```bash
   export PROD_URL="https://csmate.netlify.app"   # skift til endeligt domæne
   ```

3) Init TWA (første gang)  
   ```bash
   npm run build:hulmose
   npm run twa:init
   ```

4) Byg bundle  
   ```bash
   npm run twa:update
   npm run twa:build
   # Output: twa/app-release-bundle.aab
   ```

5) Asset Links  
   - Bubblewrap viser SHA-256 fingerprint efter build.  
   - Indsæt i `public/.well-known/assetlinks.json` og deploy.  

6) Google Play Console  
   - Opret app → Upload `.aab` til *Internal testing* → Pre-launch report  
   - Udfyld **Data Safety**, **Content rating**, **Store listing**  
   - Promote til **Production** (staged rollout).

Notes:  
- PR er tekst-only (ingen binære filer).  
- ALFIX er med (enten fra dataset.js eller fallback A001–A010).  
- Labels vises globalt fra `items`, pris hentes fra `price_table`.
