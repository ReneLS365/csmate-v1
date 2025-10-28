// tests/export.shape.test.js
import { describe, it, expect } from 'vitest';
import { exportJSON } from '../src/lib/exporters.js';

describe('export JSON schema v3', () => {
  it('returnerer alle kernefelter med forventede værdier', () => {
    const state = {
      totals: { materials: 1000 },
      materialsSum: 1000,
      sledPercent: 0.07,
      kmQty: 280,
      kmRate: 2.12,
      holesQty: 20,
      holePrice: 4.7,
      hoursMontage: 14,
      addOns: { udd1: 0, udd2: 0, mentor: 0 },
      selectedVariant: 'noAdd',
      jobType: 'montage'
    };

    const out = exportJSON(state);
    expect(out.version).toBe(3);
    expect(out.materialsKr).toBe(1000);
    expect(out.sledPercent).toBe(0.07);
    expect(out.sledKr).toBe(70);
    expect(out.kmQty).toBe(280);
    expect(out.kmRate).toBe(2.12);
    expect(out.kmKr).toBe(593.6);
    expect(out.holesQty).toBe(20);
    expect(out.holePrice).toBe(4.7);
    expect(out.extraWorkKr).toBeCloseTo(757.6, 2);
    expect(out.accordSumKr).toBeCloseTo(1757.6, 2);
    expect(out.hoursTotal).toBe(14);
  });
});
