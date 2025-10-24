# Changelog

## Unreleased

### Added
- Automated renderer tests covering mobile material list calculations and input corrections.
- jsdom layout sanity test ensuring materials rows expose the new mat-zoom and mat-* classes.

### Changed
- Redesigned the materials list into a compact, scrollable layout without filter overlays for better mobile density.
- Hid material list header row visually while keeping it available to screen readers for accessibility.
- Removed the sticky materials header from optælling and tidied the related layout styles after spacing verification on mobile and desktop.
- Restyled the numpad so it fits edge-to-edge with an Enter confirmation above a dedicated × cancel button for consistent actions on mobile.
- Applied compact one-line grid styling with scoped zoom variables to materials rows for higher-density mobile overview.
- Increased visibility of the materials quantity input with a high-contrast light theme treatment for easier entry.
- Left-aligned the materials quantity column with placeholder-driven highlighting that emphasizes entered amounts.

### Fixed
- Restored saved mentortillaeg and udd selections for workers when loading labor snapshots so totals and worker outputs stay in sync.
- Slimmed header and navigation controls to reduce vertical space while preserving tap-target sizing.
- Blocked rubber-band scrolling in the materials list so the page no longer bounces when reaching the top or bottom of the table.
