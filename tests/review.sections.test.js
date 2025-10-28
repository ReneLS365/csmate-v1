import { describe, it, expect } from 'vitest';
import { deriveTotals } from '../src/state/derive.js';
import { createReviewLayout } from '../src/modules/review-sections.js';

describe('review layout ordering', () => {
  it('viser materialer, ekstraarbejde og breakdown i rækkefølge', () => {
    const computed = deriveTotals({
      totals: { materials: 1000 },
      materialsSum: 1000,
      sledPercent: 0.07,
      kmQty: 280,
      kmRate: 2.12,
      holesQty: 20,
      holePrice: 4.7,
      closeHoleQty: 4,
      closeHolePrice: 3.45,
      hoursMontage: 14,
      addOns: { udd1: 10, udd2: 20, mentor: 5 }
    });

    const layout = createReviewLayout({
      computed,
      workers: [
        { name: 'A', hours: 8 },
        { name: 'B', hours: 6 }
      ],
      templateLabel: 'Standard',
      jobType: 'montage',
      variant: 'udd2'
    });

    const summaryIds = layout.summary.map((row) => row.id).filter((id) => id !== 'extra-other');
    expect(summaryIds).toEqual([
      'materials',
      'extraWork',
      'extra-sled',
      'extra-km',
      'extra-holes',
      'extra-close-hole',
      'extra-concrete',
      'extra-folding-rail',
      'extra-trolley',
      'accordSum',
      'hours',
      'hourlyNoAdd'
    ]);

    expect(layout.hourly.map((row) => row.id)).toEqual([
      'hourlyUdd1',
      'hourlyUdd2',
      'hourlyUdd2Mentor'
    ]);

    expect(layout.project).toHaveLength(0);

    const templateRow = layout.metadata.find((row) => row.id === 'template');
    expect(templateRow?.value).toBe('Standard');

    const teamRow = layout.metadata.find((row) => row.id === 'team');
    expect(teamRow?.value?.workersCount).toBe(2);
    expect(teamRow?.value?.hours).toBeCloseTo(14, 5);
    expect(layout.metadata.map((row) => row.id)).toEqual(['template', 'team', 'jobType', 'variant']);
  });

  it('falder tilbage til summerede timer når computed mangler værdi', () => {
    const layout = createReviewLayout({
      computed: { materialsKr: 0 },
      workers: [
        { hours: 4 },
        { hours: 6.5 }
      ]
    });

    const teamRow = layout.metadata.find((row) => row.id === 'team');
    expect(teamRow?.value?.hours).toBeCloseTo(10.5, 5);
  });

  it('beholder km total fra legacy payload uden kmRate', () => {
    const computed = deriveTotals({
      totals: { materials: 0 },
      materialsSum: 0,
      kmKr: 312.75,
      kmQty: 0,
      kmRate: 0
    });

    expect(computed.kmKr).toBe(312.75);
    expect(computed.extraWorkKr).toBe(312.75);
    expect(computed.extrasBreakdown.km.total).toBe(312.75);
  });
});
