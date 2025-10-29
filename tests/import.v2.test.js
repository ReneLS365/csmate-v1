// tests/import.v2.test.js
import { describe, it, expect } from 'vitest';
import { importJSON } from '../src/lib/importers.js';

describe('importJSON schema v3', () => {
  it('mapper eksportfelter direkte til state', () => {
    const payload = {
      version: 3,
      materialsKr: 1000,
      sledPercent: 0.07,
      kmQty: 280,
      kmRate: 2.12,
      holesQty: 20,
      holePrice: 4.7,
      closeHoleQty: 4,
      closeHolePrice: 3.45,
      concreteQty: 2,
      concretePrice: 11.49,
      foldingRailQty: 1,
      foldingRailPrice: 9.67,
      trolleyLiftQty: 10,
      trolleyLiftPrice: 0.5,
      extrasOtherKr: 12.5,
      hoursTotal: 14,
      selectedVariant: 'udd2',
      jobType: 'montage',
      udd1Add: 1,
      udd2Add: 2,
      mentorAdd: 3
    };

    const state = importJSON(payload);
    expect(state.materialsSum).toBe(1000);
    expect(state.sledPercent).toBe(0.07);
    expect(state.kmQty).toBe(280);
    expect(state.kmRate).toBe(2.12);
    expect(state.holesQty).toBe(20);
    expect(state.trolleyLiftQty).toBe(10);
    expect(state.trolleyLiftPrice).toBe(0.5);
    expect(state.extrasOtherKr).toBe(12.5);
    expect(state.hoursTotal).toBe(14);
    expect(state.selectedVariant).toBe('udd2');
    expect(state.addOns).toEqual({ udd1: 1, udd2: 2, mentor: 3 });
  });

  it('falder tilbage til 0 når felter mangler', () => {
    const state = importJSON({});
    expect(state.materialsSum).toBe(0);
    expect(state.sledPercent).toBe(0);
    expect(state.kmQty).toBe(0);
    expect(state.kmRate).toBe(0);
    expect(state.holesQty).toBe(0);
    expect(state.trolleyLiftQty).toBe(0);
    expect(state.hoursTotal).toBe(0);
    expect(state.addOns).toEqual({ udd1: 0, udd2: 0, mentor: 0 });
  });
});
