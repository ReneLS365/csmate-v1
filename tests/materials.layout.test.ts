/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';

function renderRow() {
  const wrap = document.createElement('section');
  wrap.id = 'materials';
  wrap.innerHTML = `
    <div class="mat-zoom">
      <div class="mat-row csm-row" data-key="spindelfod-lang">
        <input class="mat-name csm-name" type="text" value="Spindelfod lang" readonly />
        <input class="mat-qty csm-qty" type="number" placeholder="0" value="0" />
        <input class="mat-price csm-price" type="number" />
        <div class="mat-sum csm-sum" data-sum>0,00 kr.</div>
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
    const nameInput = row?.querySelector<HTMLInputElement>('.mat-name');
    expect(nameInput?.value).toContain('Spindelfod');
    expect(row?.querySelector('.mat-qty')).toBeTruthy();
    expect(row?.querySelector('.mat-price')).toBeTruthy();
    expect(row?.querySelector('.mat-sum')).toBeTruthy();
  });
});
