// tests/export.final.test.js
import { describe, it, expect } from 'vitest';
import { exportJSON } from '../src/lib/exporters.js';

describe('project_final vælges korrekt efter jobType + variant', () => {
  const base = {
    materialsSum: 4000,
    sledPercent: 7,
    extraWorkKr: 188.60,
    tralleloftKr: 52.20,
    kmKr: 42.40,
    hoursMontage: 16,
    hoursDemontage: 12,   // test forskel i timer
    udd1KrPerHour: 10,
    udd2KrPerHour: 20,
    mentorKrPerHour: 5
  };

  it('montage + noAdd', () => {
    const out = exportJSON({ ...base, jobType: 'montage', selectedVariant: 'noAdd' });
    expect(out.project_final).toBe(out.project_noAdd);
    expect(out.jobType).toBe('montage');
  });

  it('demontage + udd2Mentor', () => {
    const out = exportJSON({ ...base, jobType: 'demontage', selectedVariant: 'udd2Mentor' });
    expect(out.project_final).toBe(out.project_udd2Mentor);
    expect(out.jobType).toBe('demontage');
  });
});
