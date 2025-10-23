/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMaterialsRenderer } from '../app/src/materials/v2/renderer.js';

const BASE_MATERIALS = [
  { id: 'B005', name: 'Ramme 200/70', price: 16.7053537 },
  { id: 'M037', name: 'Profildæk 70/300', price: 16.71 }
];

const SCENARIO_MATERIALS = [
  { id: 'MAT1', name: 'Spindelfod kort', price: 2.68 },
  { id: 'MAT2', name: 'Ramme 200/70', price: 16.71 },
  { id: 'MAT3', name: 'Gulvplade 300/70', price: 16.71 }
];

describe('materials v2 renderer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  function setupRenderer(options = {}) {
    const container = document.getElementById('root');
    return createMaterialsRenderer({
      container,
      materials: BASE_MATERIALS,
      overrides: {},
      firmId: 'default',
      availableFirms: [{ id: 'default', label: 'Default' }],
      onAdminVerify: () => Promise.resolve(false),
      onAdminToggle: () => {},
      onSavePrices: () => Promise.resolve(),
      onFirmChange: () => {},
      ...options
    });
  }

  it('locks base prices when admin is inactive', () => {
    setupRenderer({ isAdmin: false });
    const priceInput = document.querySelector('input[name="price-B005"]');
    expect(priceInput).toBeTruthy();
    expect(priceInput?.readOnly).toBe(true);
  });

  it('renders materials grid with table semantics', () => {
    setupRenderer({ isAdmin: true });
    const grid = document.querySelector('.materials-v2__grid');
    expect(grid?.getAttribute('role')).toBe('table');
    const headerRow = grid?.querySelector('.materials-v2__row--header');
    expect(headerRow?.getAttribute('role')).toBe('row');
    const headerTexts = Array.from(
      headerRow?.querySelectorAll('.materials-v2__cell') ?? []
    ).map(cell => cell.textContent?.trim());
    expect(headerTexts).toEqual(['Navn', 'Antal', 'Pris', 'Linjetotal']);
  });

  it('renders compact material list without overlay controls', () => {
    setupRenderer({ isAdmin: true });

    expect(document.querySelector('.materials-v2__toolbar')).toBeNull();
    expect(document.querySelector('.materials-v2__toggle')).toBeNull();

    const list = document.querySelector('.materials-v2__body');
    expect(list).toBeTruthy();
    expect(list?.classList.contains('material-list')).toBe(true);

    const row = document.querySelector('.materials-v2__body .materials-v2__row');
    expect(row).toBeTruthy();
    expect(row?.classList.contains('material-row')).toBe(true);

    const qtyInput = row?.querySelector('input.qty') as HTMLInputElement | null;
    const priceCell = row?.querySelector('.price');
    const totalCell = row?.querySelector('.total');

    expect(qtyInput).toBeTruthy();
    expect(priceCell).toBeTruthy();
    expect(totalCell?.textContent?.trim()).toMatch(/kr$/);
  });

  it('scrolls focused quantity rows into view inside the compact list', () => {
    setupRenderer({ isAdmin: true });

    const body = document.querySelector('.materials-v2__body') as HTMLElement | null;
    const qtyInput = document.querySelector('input[name="qty-B005"]') as HTMLInputElement | null;
    expect(body).toBeTruthy();
    expect(qtyInput).toBeTruthy();
    if (!body || !qtyInput) throw new Error('missing elements for focus scroll');

    const row = qtyInput.closest('.materials-v2__row') as HTMLElement | null;
    expect(row).toBeTruthy();
    if (!row) throw new Error('missing row element');

    body.scrollTop = 0;
    body.getBoundingClientRect = () => ({
      top: 0,
      bottom: 100,
      left: 0,
      right: 0,
      width: 0,
      height: 100,
      x: 0,
      y: 0,
      toJSON () {
        return {};
      }
    } as DOMRect);
    row.getBoundingClientRect = () => ({
      top: 150,
      bottom: 200,
      left: 0,
      right: 0,
      width: 0,
      height: 50,
      x: 0,
      y: 150,
      toJSON () {
        return {};
      }
    } as DOMRect);

    qtyInput.dispatchEvent(new window.FocusEvent('focus', { bubbles: true }));

    expect(body.scrollTop).toBeGreaterThan(0);
  });

  it('calculates totals for the predefined material scenario', () => {
    const renderer = setupRenderer({ isAdmin: true, materials: SCENARIO_MATERIALS });

    const scenarios = [
      { id: 'MAT1', qty: '3', expected: '8,04 kr' },
      { id: 'MAT2', qty: '2', expected: '33,42 kr' },
      { id: 'MAT3', qty: '5', expected: '83,55 kr' }
    ];

    scenarios.forEach(({ id, qty, expected }) => {
      const input = document.querySelector(`input[name="qty-${id}"]`) as HTMLInputElement | null;
      expect(input).toBeTruthy();
      if (!input) throw new Error(`missing input for ${id}`);

      input.value = qty;
      input.dispatchEvent(new window.Event('input', { bubbles: true }));

      const totalCell = document.querySelector(`.materials-v2__row[data-id="${id}"] .total`);
      expect(totalCell?.textContent?.trim()).toBe(expected);
    });

    expect(renderer.getMaterialSum()).toBeCloseTo(125.01, 2);
    const footerTotal = document.querySelector('.materials-v2__footer strong');
    expect(footerTotal?.textContent?.trim()).toBe('125,01 kr');
  });

  it('updates totals when quantities are corrected or cleared', () => {
    setupRenderer({ isAdmin: true, materials: SCENARIO_MATERIALS });

    const first = document.querySelector('input[name="qty-MAT1"]') as HTMLInputElement | null;
    const second = document.querySelector('input[name="qty-MAT2"]') as HTMLInputElement | null;
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    if (!first || !second) throw new Error('missing quantity inputs');

    const totalFor = (id: string) => document.querySelector(`.materials-v2__row[data-id="${id}"] .total`)?.textContent?.trim();

    first.value = '5';
    first.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(totalFor('MAT1')).toBe('13,40 kr');

    first.value = '0';
    first.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(totalFor('MAT1')).toBe('0,00 kr');

    first.value = '7';
    first.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(totalFor('MAT1')).toBe('18,76 kr');

    second.value = '1,5';
    second.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(totalFor('MAT2')).toBe('25,07 kr');

    second.value = '';
    second.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(totalFor('MAT2')).toBe('0,00 kr');
  });

  it('unlocks after admin verify and collects price diff on save', async () => {
    const verifySpy = vi.fn().mockResolvedValue(true);
    const saveSpy = vi.fn().mockResolvedValue(undefined);
    const renderer = setupRenderer({ onAdminVerify: verifySpy, onSavePrices: saveSpy });

    const codeInput = document.querySelector('input[name="admin-code"]');
    expect(codeInput).toBeTruthy();
    if (!codeInput) throw new Error('missing admin input');
    codeInput.value = 'kode';
    codeInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    codeInput.form?.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith('kode');
    });

    const priceInput = document.querySelector('input[name="price-B005"]');
    await vi.waitFor(() => {
      expect(priceInput?.readOnly).toBe(false);
    });
    if (!priceInput) throw new Error('missing price input');
    priceInput.value = '20,00';
    priceInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    const qtyInput = document.querySelector('input[name="qty-B005"]');
    if (!qtyInput) throw new Error('missing qty');
    qtyInput.value = '2';
    qtyInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    const saveButton = document.querySelector('.materials-v2__save');
    expect(saveButton).toBeTruthy();
    saveButton?.dispatchEvent(new window.Event('click'));
    await vi.waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const payload = saveSpy.mock.calls[0][0];
    expect(payload.updates).toHaveProperty('B005', 20);
    const updatedLine = renderer.getLines().find(line => line.id === 'B005');
    expect(updatedLine?.price).toBeCloseTo(20, 2);
  });

  it('applies numeric input constraints to quantities', () => {
    setupRenderer({ isAdmin: true });
    const qtyInput = document.querySelector('input[name="qty-B005"]');
    expect(qtyInput).toBeTruthy();
    if (!qtyInput) throw new Error('missing qty input');
    expect(qtyInput.getAttribute('inputmode')).toBe('decimal');
    expect(qtyInput.getAttribute('pattern')).toBe('[0-9]*[.,]?[0-9]*');
    expect(qtyInput.getAttribute('min')).toBe('0');
    expect(qtyInput.classList.contains('materials-v2__input--numeric')).toBe(true);
  });

  it('calculates decimal totals including custom lines', async () => {
    const renderer = setupRenderer({ isAdmin: true });

    const qtyInput = document.querySelector('input[name="qty-M037"]');
    const priceInput = document.querySelector('input[name="price-M037"]');
    if (!qtyInput || !priceInput) throw new Error('missing inputs');
    qtyInput.value = '7,5';
    qtyInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    priceInput.value = '16,71';
    priceInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    await vi.waitFor(() => {
      const target = renderer.getLines().find(line => line.id === 'M037');
      expect(target?.total).toBeCloseTo(125.33, 2);
      expect(renderer.getMaterialSum()).toBeCloseTo(125.33, 2);
    });

    const customName = document.querySelector('input[name="name-CUST_1"]');
    const customQty = document.querySelector('input[name="qty-CUST_1"]');
    const customPrice = document.querySelector('input[name="price-CUST_1"]');
    if (!customName || !customQty || !customPrice) throw new Error('missing custom');
    customName.value = 'Ekstra';
    customName.dispatchEvent(new window.Event('input', { bubbles: true }));
    customQty.value = '1';
    customQty.dispatchEvent(new window.Event('input', { bubbles: true }));
    customPrice.value = '10';
    customPrice.dispatchEvent(new window.Event('input', { bubbles: true }));

    const lines = renderer.getLines();
    const customLine = lines.find(line => line.id === 'CUST_1');
    expect(customLine?.name).toBe('Ekstra');
    expect(renderer.getMaterialSum()).toBeCloseTo(135.33, 2);
  });

  it('updates accessible labels when custom line name changes', () => {
    setupRenderer({ isAdmin: true });
    const customRow = document.querySelector('.materials-v2__body .materials-v2__row[data-id="CUST_1"]');
    const nameInput = document.querySelector('input[name="name-CUST_1"]') as HTMLInputElement | null;
    const qtyInput = document.querySelector('input[name="qty-CUST_1"]');
    const totalCell = customRow?.querySelector('.materials-v2__cell--total');
    expect(customRow?.getAttribute('aria-label')).toBe('Materiale Brugerlinje 1');
    expect(qtyInput?.getAttribute('aria-label')).toBe('Antal for Brugerlinje 1');
    expect(totalCell?.getAttribute('aria-label')).toBe('Linjetotal for Brugerlinje 1');
    if (!nameInput) throw new Error('missing name input');
    nameInput.value = 'Ekstra plade';
    nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(customRow?.getAttribute('aria-label')).toBe('Materiale Ekstra plade');
    expect(qtyInput?.getAttribute('aria-label')).toBe('Antal for Ekstra plade');
    expect(totalCell?.getAttribute('aria-label')).toBe('Linjetotal for Ekstra plade');
  });
});
