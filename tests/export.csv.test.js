import { describe, it, expect } from 'vitest';
import { exportCSVRow, CSV_HEADER_APPEND, exportJSON } from '../src/lib/exporters.js';

describe('exportCSVRow', () => {
  it('inkluderer tralleløft, jobType og variant i CSV rækken', () => {
    const state = {
      materialsSum: 4000,
      sledPercent: 7,
      extraWorkKr: 188.6,
      tralleloftKr: 52.2,
      kmKr: 42.4,
      hoursMontage: 16,
      selectedVariant: 'udd2Mentor',
      jobType: 'montage',
      udd1KrPerHour: 10,
      udd2KrPerHour: 20,
      mentorKrPerHour: 5
    };

    const row = exportCSVRow(state);
    const fields = row.split(';');
    const expectedLength = CSV_HEADER_APPEND.split(';').length;
    expect(fields).toHaveLength(expectedLength);

    const json = exportJSON(state);
    expect(fields[0]).toBe(String(json.materials).replace('.', ','));
    expect(fields[4]).toBe(String(json.tralleloft).replace('.', ','));
    expect(fields[5]).toBe(String(json.km).replace('.', ','));
    expect(fields[12]).toBe(String(json.project_final).replace('.', ','));
    expect(fields.at(-2)).toBe('montage');
    expect(fields.at(-1)).toBe('udd2Mentor');
    expect(fields).not.toContain('NaN');
  });
});
