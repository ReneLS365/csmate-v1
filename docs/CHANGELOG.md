# Changelog

## Unreleased

### Added
- Dansk "CSMate License & Deployment Agreement" med ejerskab, licensvilkår og integrationskrav.
- JSON template-pack i `templates/` inkl. Hulmose, Øens og Stilladsgruppen + default skeleton klar til import.
- CLI-script `scripts/codex-generate-template.mjs` der genererer tenantfiler med BOSTA-priser rundet til to decimaler.
- Hulmoses tenant template med BOSTA 2025 prisoverrides rundet til to decimaler for materialelisten.
- Deterministic totals calculator module with Vitest coverage enforcing the akkord flow without double counting.
- Automated renderer tests covering mobile material list calculations and input corrections.
- jsdom layout sanity test ensuring materials rows expose the new mat-zoom and mat-* classes.
- Vitest spec for the shared material row template verifying DOM structure and recalculation of line totals.
- Akkord V2 beregner med final projektsum, eksport/import tests og jobType/variant-styret total som single source of truth.
- Approvalroller (sjakbajs/kontor) med statusbadges og Vitest-dækkede overgangsregler.
- IndexedDB autosave modul der fastholder de 20 seneste projekter med testet oprydning.
- Reviewpanel komponenter og eksportere til E-Komplet v2 bygget på nye moduler med @purpose dokumentation.

### Changed
- Hulmoses tenant-data omstruktureret til meta/pay/roles/price_table så templates og app deler samme format.
- Totals pipeline recalculates materials, ekstraarbejde, slæb og projektsum gennem den nye helper så UI og eksport deler samme grundlag.
- Redesigned the materials list into a compact, scrollable layout without filter overlays for better mobile density.
- Hid material list header row visually while keeping it available to screen readers for accessibility.
- Removed the sticky materials header from optælling and tidied the related layout styles after spacing verification on mobile and desktop.
- Restyled the numpad so it fits edge-to-edge with an Enter confirmation above a dedicated × cancel button for consistent actions on mobile.
- Applied compact one-line grid styling with scoped zoom variables to materials rows for higher-density mobile overview.
- Increased visibility of the materials quantity input with a high-contrast light theme treatment for easier entry.
- Left-aligned the materials quantity column with placeholder-driven highlighting that emphasizes entered amounts.
- Introduced an app-shell viewport controller with a single `.materials-scroll` container so the layout tracks the real device viewport on iOS and Android without padding hacks.
- Replaced transform-based materials zoom with direct spacing, padding, and font sizing so rows stay compact without leaving gaps on mobile.
- Unified manual material rows with the shared grid/input template so price fields remain aligned alongside system materials.
- Reviewsektionen viser nu tralleløft, km og ekstraarbejde som separate rækker og placerer medarbejdere/timer nederst.
- Eksport JSON/CSV tilføjer tralleløft og jobtyper for at spejle REVIEW og single source modulerne.

### Fixed
- Restored tralleløft amount when importing v2 JSON payloads so totals keep the exported extra work value.
- Eliminated double counting of slæb and tralleløft in akkordsum, timepris og projektsum output samt eksport.
- Prevented manual material name fields from redirecting focus to quantity inputs on touch devices while keeping them accessible for input handling.
- Eliminated empty scroll chaining in the materials section so the view no longer bounces or scrolls the body at top or bottom.
- Restored saved mentortillaeg and udd selections for workers when loading labor snapshots so totals and worker outputs stay in sync.
- Slimmed header and navigation controls to reduce vertical space while preserving tap-target sizing.
- Blocked rubber-band scrolling in the materials list so the page no longer bounces when reaching the top or bottom of the table.
- Ensured the materials quantity input stays visible on mobile by widening the column, forcing text contrast, and mirroring the value in an overlay display.
- Eliminated scroll jumps when opening the numeric keypad by locking body scroll and restoring the exact scroll position after closing on iOS Safari and Android Chrome.
- Removed overlap between quantity and price inputs in the material list so both remain accessible on the lowest rows across zoom levels.
- Sikret at eksport/import og review bruger samme tralleløft-beløb så totals matcher på tværs af flows.
