// tests/export.final.test.js
import { describe, it, expect } from 'vitest';
import { exportJSON } from '../src/lib/exporters.js';

describe('exportJSON felter og jobtype', () => {
  const base = {
    totals: { materials: 1000 },
    materialsSum: 1000,
    sledPercent: 0.07,
    kmQty: 280,
    kmRate: 2.12,
    holesQty: 20,
    holePrice: 4.7,
    hoursMontage: 14,
    hoursDemontage: 20,
    addOns: { udd1: 10, udd2: 20, mentor: 5 },
    selectedVariant: 'udd2',
    jobType: 'montage'
  };

  it('montage bruger montage-timer og bevarer variant', () => {
    const out = exportJSON(base);
    expect(out.version).toBe(3);
    expect(out.hoursTotal).toBe(14);
    expect(out.jobType).toBe('montage');
    expect(out.selectedVariant).toBe('udd2');
    expect(out.hourlyUdd2).toBeCloseTo(out.hourlyNoAdd + 20, 2);
  });

  it('demontage bruger demontage-timer', () => {
    const out = exportJSON({ ...base, jobType: 'demontage' });
    expect(out.hoursTotal).toBe(20);
    expect(out.jobType).toBe('demontage');
  });
});
