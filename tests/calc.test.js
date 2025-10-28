// tests/calc.test.js
import { describe, it, expect } from 'vitest';
import { computeAccord } from '../src/lib/calc.js';

describe('computeAccord', () => {
  it('matches example: materials=1000, 7% sled, 20 holes á 4.70, 280 km á 2.12, 14 h', () => {
    const res = computeAccord({
      materialsSum: 1000,
      sledPercent: 0.07,
      kmQty: 280,
      kmRate: 2.12,
      hoursTotal: 14,
      extras: [
        { key: 'holes', qty: 20, unitPrice: 4.70 },
        { key: 'trolleyLift', qty: 0, unitPrice: 0 }
      ],
      udd1Add: 0,
      udd2Add: 0,
      mentorAdd: 0
    });

    expect(res.sledKr).toBe(70.00);
    expect(res.kmKr).toBe(593.60);
    expect(res.extrasOtherKr).toBe(94.00);
    expect(res.extraWorkKr).toBe(757.60);
    expect(res.accordSumKr).toBe(1757.60);
    expect(res.hourlyNoAdd).toBe(125.54);
  });

  it('inkl. tralleløft 10 × 0.50 kr', () => {
    const res = computeAccord({
      materialsSum: 1000,
      sledPercent: 0.07,
      kmQty: 280,
      kmRate: 2.12,
      hoursTotal: 14,
      extras: [
        { key: 'holes', qty: 20, unitPrice: 4.70 },
        { key: 'trolleyLift', qty: 10, unitPrice: 0.50 }
      ]
    });

    expect(res.extraWorkKr).toBe(762.60);
    expect(res.accordSumKr).toBe(1762.60);
    expect(res.hourlyNoAdd).toBe(125.90);
  });
});
