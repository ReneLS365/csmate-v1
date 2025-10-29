import { describe, it, expect, beforeEach } from 'vitest';
import { deriveTotals } from '../src/state/derive.js';
import { createReviewLayout } from '../src/modules/review-sections.js';
import { saveSession, clearSession } from '../src/lib/storage.js';

beforeEach(() => {
  clearSession();
});

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

    saveSession({ user: { username: 'admin@hulmose.dk' }, role: 'admin' });

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
      'team'
    ]);

    expect(layout.hourly.map((row) => row.id)).toEqual([
      'hourlyNoAdd',
      'hourlyUdd1',
      'hourlyUdd2',
      'hourlyUdd2Mentor'
    ]);

    expect(layout.project).toHaveLength(0);

    const templateRow = layout.metadata.find((row) => row.id === 'template');
    expect(templateRow?.value).toBe('Standard');

    const teamRow = layout.summary.find((row) => row.id === 'team');
    expect(teamRow?.value?.workersCount).toBe(2);
    expect(teamRow?.value?.hours).toBeCloseTo(14, 5);
    expect(layout.metadata.map((row) => row.id)).toEqual(['user', 'template', 'jobType', 'variant']);
    const userRow = layout.metadata.find((row) => row.id === 'user');
    expect(userRow?.value).toBe('admin@hulmose.dk (admin)');
  });

  it('falder tilbage til summerede timer når computed mangler værdi', () => {
    const layout = createReviewLayout({
      computed: { materialsKr: 0 },
      workers: [
        { hours: 4 },
        { hours: 6.5 }
      ]
    });

    const teamRow = layout.summary.find((row) => row.id === 'team');
    expect(teamRow?.value?.hours).toBeCloseTo(10.5, 5);
  });

  it('viser km og tralleløft info i breakdown', () => {
    const computed = deriveTotals({
      totals: { materials: 0 },
      materialsSum: 0,
      kmQty: 12.5,
      kmRate: 3.25,
      trolleyLiftQty: 8,
      trolleyLiftPrice: 0.5
    });

    expect(computed.kmKr).toBeCloseTo(40.63, 2);
    expect(computed.extrasBreakdown.km).toEqual({ qty: 12.5, unitPrice: 3.25, total: 40.63 });
    expect(computed.extrasBreakdown.trolleyLift).toEqual({ qty: 8, unitPrice: 0.5, total: 4 });

    const layout = createReviewLayout({ computed });
    const kmRow = layout.summary.find((row) => row.id === 'extra-km');
    expect(kmRow?.info).toMatchObject({ qty: 12.5, unitPrice: 3.25, unitLabel: 'km' });

    const trolleyRow = layout.summary.find((row) => row.id === 'extra-trolley');
    expect(trolleyRow?.info).toMatchObject({ qty: 8, unitPrice: 0.5, unitLabel: 'løft' });
  });
});
