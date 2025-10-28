import { describe, it, expect } from 'vitest';
import { loadTemplate } from '../src/lib/templates.js';
import { calculateTransportSurcharge, resolveTransportRules } from '../src/lib/transport.js';

describe('transport surcharge helper', () => {
  const template = loadTemplate('hulmose');
  const rules = resolveTransportRules(template);

  it('returnerer 0 under eller lig inkluderet distance', () => {
    expect(calculateTransportSurcharge(0, rules)).toBe(0);
    expect(calculateTransportSurcharge(10, rules)).toBe(0);
    expect(calculateTransportSurcharge(15, rules)).toBe(0);
  });

  it('beregner +7% pr. 10 m mellem 15 og 55 m', () => {
    expect(calculateTransportSurcharge(16, rules)).toBe(7);
    expect(calculateTransportSurcharge(25, rules)).toBe(7);
    expect(calculateTransportSurcharge(35, rules)).toBe(14);
    expect(calculateTransportSurcharge(55, rules)).toBe(28);
  });

  it('skifter til 20 m-trin over 55 m', () => {
    expect(calculateTransportSurcharge(56, rules)).toBe(35);
    expect(calculateTransportSurcharge(65, rules)).toBe(35);
    expect(calculateTransportSurcharge(75, rules)).toBe(35);
    expect(calculateTransportSurcharge(95, rules)).toBe(42);
  });

  it('ignorerer ugyldige inputs uden at kaste', () => {
    expect(calculateTransportSurcharge('abc', {})).toBe(0);
    expect(calculateTransportSurcharge(40, { included_distance_m: 15, tiers: [{ percent: 0 }] })).toBe(0);
  });
});
