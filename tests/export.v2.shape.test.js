// tests/export.v2.shape.test.js
import { describe, it, expect } from 'vitest';
import { exportJSON } from '../src/lib/exporters.js';

describe('export v2 felter', () => {
  it('indeholder v2 + final og meta', () => {
    const state = {
      materialsSum: 4000,
      sledPercent: 7.09125,
      extraWorkKr: 188.60,
      tralleløftKr: 52.20,
      kmKr: 42.40,
      hoursMontage: 16,
      selectedVariant: 'udd2',
      jobType: 'montage',
      udd1KrPerHour: 0,
      udd2KrPerHour: 0,
      mentorKrPerHour: 0
    };
    const out = exportJSON(state);
    expect(out.version).toBe(2);
    expect(out.totalAccord).toBe(4563.20); // 4000 + 7% slæb + ekstra (188,60 + 52,20) + km 42,40
    expect(out.project_final).toBe(out.project_udd2);
    expect(out.selectedVariant).toBe('udd2');
    expect(out.jobType).toBe('montage');
    expect(out.kmInfo).toBe(42.40);
    expect(out.tralleløftInfo).toBe(52.20);
  });
});
