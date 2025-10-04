# Feature Updates Discovery Plan

## Repository Setup
- Checked out new branch `feature-updates` from existing base (`work` branch).
- Static site structure with root-level HTML/CSS/JS.
- Local preview works via `python -m http.server 8000` (opens `http://localhost:8000/index.html`).

## Key Entry Points
- `index.html`: main markup, header navigation (`Optælling`, `Løn`, `Guide`) with sections and modals.
- `style.css`: global styles including grid helpers (`grid-3`, `.row`), buttons, responsive adjustments.
- `print.css`: print-specific overrides for export.
- `main.js`: client-side logic for tabs, materials dataset, CSV handling, totals, export helpers, and payroll calculations.
- `dataset.js`: supplemental data definitions (not yet imported by default but available).

## Implementation Outline
1. Replace Guide tab with new `Sagsinfo` section and relocate/extend case metadata fields.
2. Implement validation that gates export/print actions until Sagsinfo is complete.
3. Update CSS for responsive/mobile experience (grid collapse, spacing, touch target sizing).
4. Extend numeric keypad script in `main.js` to attach globally to numeric inputs.
5. Replace CSV upload button with drag-and-drop import surface; wire into existing parsing/export logic.
6. Ensure material list renders three manual rows that affect totals and exports.
7. Introduce Materialesum, Lønsum, Projektsum totals in UI and exports/print outputs.
8. Document and test changes in `/docs/feature-updates-testing.md`, update README with new workflows.
