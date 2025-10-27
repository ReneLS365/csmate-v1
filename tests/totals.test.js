import { describe, it, expect } from 'vitest';
import { calculateTotals } from '../app/src/modules/calculateTotals.js';

describe('CSMate totals', () => {
  it('beregner i korrekt rækkefølge uden dobbeltmateriale', () => {
    const out = calculateTotals({
      materialLines: [{ qty: 140, unitPrice: 2338.75 / 140 }],
      slaebeBelob: 171.02,
      extra: {
        tralleløft: 104.40,
        huller: 0,
        boring: 0,
        lukAfHul: 0,
        opskydeligt: 0,
        km: 21.20,
        oevrige: 151.40,
      },
      workers: [
        { hours: 6, hourlyWithAllowances: 266.51 },
        { hours: 6, hourlyWithAllowances: 272.91 },
      ],
      totalHours: 12,
    });

    expect(out.materialer).toBeCloseTo(2338.75, 2);
    expect(out.ekstraarbejde).toBeCloseTo(104.40 + 21.20 + 151.40, 2);
    expect(out.slaeb).toBeCloseTo(171.02, 2);
    expect(out.samletAkkordsum).toBeCloseTo(2338.75 + 277.00 + 171.02, 2);

    const lon = (6 * 266.51) + (6 * 272.91);
    expect(out.montoerLonMedTillaeg).toBeCloseTo(lon, 2);
    expect(out.projektsum).toBeCloseTo(2786.77 + 3236.52, 2);
    expect(out.timeprisUdenTillaeg).toBeCloseTo((2338.75 + 277.00 + 171.02) / 12, 2);
  });

  it('timepris bliver 0 når timer er 0 (ingen NaN)', () => {
    const out = calculateTotals({
      materialLines: [], slaebeBelob: 0, extra: {}, workers: [], totalHours: 0,
    });
    expect(out.timeprisUdenTillaeg).toBe(0);
  });

  it('robust mod undefined/null felter', () => {
    const out = calculateTotals({});
    expect(out.projektsum).toBe(0);
  });
});
