# Changelog

## Unreleased

### Added
- Automated renderer tests covering mobile material list calculations and input corrections.

### Changed
- Redesigned the materials list into a compact, scrollable layout without filter overlays for better mobile density.
- Hid material list header row visually while keeping it available to screen readers for accessibility.
- Removed the sticky materials header from optælling and tidied the related layout styles after spacing verification on mobile and desktop.
- Restyled the numpad actions so OK is a full-width green confirmation button and Luk is a compact red cancel key in the grid, with Enter/Escape shortcuts aligned.

### Fixed
- Restored saved mentortillaeg and udd selections for workers when loading labor snapshots so totals and worker outputs stay in sync.
- Slimmed header and navigation controls to reduce vertical space while preserving tap-target sizing.
