/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMaterialsRenderer } from '../app/src/materials/v2/renderer.js';

const BASE_MATERIALS = [
  { id: 'B005', name: 'Ramme 200/70', price: 16.7053537 },
  { id: 'M037', name: 'Profildæk 70/300', price: 16.71 }
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

  it('updates toggle label count without rendering chips', () => {
    setupRenderer({ isAdmin: true });

    const qtyInput = document.querySelector('input[name="qty-B005"]') as HTMLInputElement | null;
    const toggle = document.querySelector('input[aria-label="Vis kun valgte materialer"]') as HTMLInputElement | null;
    const toggleLabelText = () => document.querySelector('.materials-v2__toggle span')?.textContent ?? '';

    expect(qtyInput).toBeTruthy();
    expect(toggle).toBeTruthy();
    if (!qtyInput || !toggle) throw new Error('missing inputs');

    expect(toggleLabelText()).toBe('Vis kun valgte');
    expect(document.querySelector('.materials-v2__chips')).toBeNull();

    qtyInput.value = '1';
    qtyInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(toggleLabelText()).toBe('Vis kun valgte (1)');

    toggle.checked = true;
    toggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(toggleLabelText()).toBe('Vis kun valgte (1)');
    expect(document.querySelector('.materials-v2__chips')).toBeNull();

    qtyInput.value = '0';
    qtyInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(toggleLabelText()).toBe('Vis kun valgte');
  });

  it('scrolls focused quantity rows into view without chips present by default', () => {
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
    expect(document.querySelector('.materials-v2__chips')).toBeNull();
  });

  it('filters materials when "Vis kun valgte" is enabled', () => {
    setupRenderer({ isAdmin: true });
    const qtyInput = document.querySelector('input[name="qty-B005"]');
    const toggle = document.querySelector('input[aria-label="Vis kun valgte materialer"]') as HTMLInputElement | null;
    expect(qtyInput).toBeTruthy();
    expect(toggle).toBeTruthy();
    if (!qtyInput || !toggle) throw new Error('missing inputs for filtering');

    qtyInput.value = '2';
    qtyInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    toggle.checked = true;
    toggle.dispatchEvent(new window.Event('change', { bubbles: true }));

    const hiddenRow = document.querySelector('.materials-v2__body .materials-v2__row[data-id="M037"]') as HTMLElement | null;
    const visibleRow = document.querySelector('.materials-v2__body .materials-v2__row[data-id="B005"]') as HTMLElement | null;
    expect(hiddenRow?.hidden).toBe(true);
    expect(visibleRow?.hidden).toBe(false);

    toggle.checked = false;
    toggle.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(hiddenRow?.hidden).toBe(false);
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
