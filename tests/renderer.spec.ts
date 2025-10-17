/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMaterialsRenderer } from '../src/materials/v2/renderer.js';

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
});
