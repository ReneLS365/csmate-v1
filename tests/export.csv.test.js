import { describe, it, expect, beforeEach } from 'vitest';
import { exportCSVRow, CSV_HEADER_APPEND, exportJSON } from '../src/lib/exporters.js';
import { saveSession, clearSession } from '../src/lib/storage.js';

beforeEach(() => {
  clearSession();
});

describe('exportCSVRow', () => {
  it('inkluderer nye felter for km, ekstraarbejde og varianter', () => {
    const state = {
      totals: { materials: 1000 },
      materialsSum: 1000,
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
      hoursTotal: 14,
      addOns: { udd1: 0, udd2: 0, mentor: 0 },
      selectedVariant: 'udd2',
      jobType: 'montage'
    };

    saveSession({ user: { username: 'sjak123', email: 'sjak@hulmose.dk' }, role: 'foreman' });

    const row = exportCSVRow(state);
    const fields = row.split(';');
    const expectedLength = CSV_HEADER_APPEND.split(';').length;
    expect(fields).toHaveLength(expectedLength);
    expect(fields).not.toContain('NaN');

    const json = exportJSON(state);
    expect(json.version).toBe(3);
    expect(json.user).toBe('sjak123');
    expect(json.role).toBe('foreman');
    expect(json.materialsKr).toBe(1000);
    expect(json.kmQty).toBe(280);
    expect(json.trolleyLiftQty).toBe(10);
    expect(json.trolleyLiftPrice).toBe(0.5);
    expect(json.extraWorkKr).toBeCloseTo(809.05, 2);
    expect(json.accordSumKr).toBeCloseTo(1809.05, 2);

    expect(fields[0]).toBe('1000,00');
    expect(fields[3]).toBe('280,00');
    expect(fields[5]).toBe('593,60');
    expect(fields[15]).toBe('0,50');
    expect(fields.at(-2)).toBe('udd2');
    expect(fields.at(-1)).toBe('montage');
  });
});
