// tests/import.v2.test.js
import { describe, it, expect } from 'vitest';
import { importJSON } from '../src/lib/importers.js';

describe('importJSON schema migration', () => {
  it('normaliserer v3 payload direkte', () => {
    const payload = {
      version: 3,
      materialsKr: 1000,
      sledPercent: 0.07,
      kmQty: 280,
      kmRate: 2.12,
      holesQty: 20,
      holePrice: 4.7,
      trolleyLiftEntries: [{ qty: 6, unitPrice: 0.35 }]
    };

    const state = importJSON(payload);
    expect(state.materialsSum).toBe(1000);
    expect(state.sledPercent).toBe(0.07);
    expect(state.kmQty).toBe(280);
    expect(state.kmRate).toBe(2.12);
    expect(state.holesQty).toBe(20);
    expect(state.trolleyLiftEntries).toEqual([{ qty: 6, unitPrice: 0.35 }]);
  });

  it('konverterer ældre payload med procent og km beløb', () => {
    const payload = {
      version: 2,
      materials: 500,
      sledPercent: 7,
      km: 106,
      kmRate: 2.12
    };

    const state = importJSON(payload);
    expect(state.materialsSum).toBe(500);
    expect(state.sledPercent).toBeCloseTo(0.07, 5);
    expect(state.kmRate).toBe(2.12);
    expect(state.kmQty).toBeCloseTo(50, 2);
  });
});
