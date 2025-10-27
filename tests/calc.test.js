// tests/calc.test.js
import { describe, it, expect } from 'vitest';
import { computeTotals, LOCK_SLED_INT } from '../src/lib/calc.js';

describe('computeTotals – heltals slæb og kerneforløb', () => {
  it('akkordsum/timepris med 7% slæb (afrundet)', () => {
    const o = computeTotals({
      materials: 4000.00,
      sledPercent: 7.09125, // -> 7
      extraWork: 188.60,
      km: 42.40,
      hours: 16,
      udd1: 0, udd2: 0, mentor: 0
    });
    expect(LOCK_SLED_INT).toBe(true);
    expect(o.sledPercent).toBe(7);
    expect(o.sledKr).toBe(280.00);
    expect(o.extraAndKm).toBe(231.00);
    expect(o.totalAccord).toBe(4511.00);
    expect(o.hourlyNoAdd).toBe(281.94);
  });

  it('additive tillæg pr. time', () => {
    const o = computeTotals({
      materials: 1000, sledPercent: 10, extraWork: 0, km: 0, hours: 10,
      udd1: 15, udd2: 25, mentor: 10
    });
    expect(o.hourlyNoAdd).toBe(110.00);
    expect(o.hourlyUdd1).toBe(125.00);
    expect(o.hourlyUdd2).toBe(135.00);
    expect(o.hourlyUdd2Mentor).toBe(145.00);
    expect(o.project_udd2Mentor).toBe((1000 + 100) + 145 * 10);
  });

  it('0 timer -> projektsum = base (ingen løn)', () => {
    const o = computeTotals({
      materials: 500, sledPercent: 5, extraWork: 0, km: 0, hours: 0,
      udd1: 0, udd2: 0, mentor: 0
    });
    expect(o.hourlyNoAdd).toBe(0);
    expect(o.project_noAdd).toBe(525.00); // 500 + 5% af 500
  });
});
