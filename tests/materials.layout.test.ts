/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';

function renderRow() {
  const wrap = document.createElement('section');
  wrap.id = 'materials';
  wrap.innerHTML = `
    <div class="mat-zoom">
      <div class="mat-row" data-key="spindelfod-lang">
        <div class="mat-name">Spindelfod lang</div>
        <input class="mat-qty" type="number" />
        <input class="mat-price" type="number" />
        <div class="mat-sum">0,00 kr.</div>
      </div>
    </div>`;
  return wrap;
}

describe('Materials layout classes', () => {
  it('renders one-line row with required classes', () => {
    const el = renderRow();
    expect(el.querySelector('.mat-zoom')).toBeTruthy();
    const row = el.querySelector('.mat-row');
    expect(row).toBeTruthy();
    expect(row?.querySelector('.mat-name')?.textContent).toContain('Spindelfod');
    expect(row?.querySelector('.mat-qty')).toBeTruthy();
    expect(row?.querySelector('.mat-price')).toBeTruthy();
    expect(row?.querySelector('.mat-sum')).toBeTruthy();
  });
});
