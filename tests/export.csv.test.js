import { describe, it, expect } from 'vitest';
import { exportCSVRow, CSV_HEADER_APPEND, exportJSON } from '../src/lib/exporters.js';

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
      trolleyLiftEntries: [
        { qty: 6, unitPrice: 0.35 },
        { qty: 4, unitPrice: 0.5 }
      ],
      hoursTotal: 14,
      addOns: { udd1: 0, udd2: 0, mentor: 0 },
      selectedVariant: 'udd2',
      jobType: 'montage'
    };

    const row = exportCSVRow(state);
    const fields = row.split(';');
    const expectedLength = CSV_HEADER_APPEND.split(';').length;
    expect(fields).toHaveLength(expectedLength);
    expect(fields).not.toContain('NaN');

    const json = exportJSON(state);
    expect(json.version).toBe(3);
    expect(json.materialsKr).toBe(1000);
    expect(json.kmQty).toBe(280);
    expect(json.trolleyLiftQty).toBe(10);
    expect(json.trolleyLiftPrice).toBeCloseTo(0.41, 2);
    expect(json.extraWorkKr).toBeCloseTo(808.15, 2);
    expect(json.accordSumKr).toBeCloseTo(1808.15, 2);

    expect(fields[0]).toBe('1000,00');
    expect(fields[3]).toBe('280,00');
    expect(fields[5]).toBe('593,60');
    expect(fields[15]).toBe('0,41');
    expect(fields.at(-2)).toBe('udd2');
    expect(fields.at(-1)).toBe('montage');
  });
});
