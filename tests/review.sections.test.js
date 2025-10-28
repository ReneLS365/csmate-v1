import { describe, it, expect } from 'vitest';
import { computeTotals } from '../src/lib/calc.js';
import { createReviewLayout } from '../src/modules/review-sections.js';

describe('review layout ordering', () => {
  it('placer materialer, ekstra og timer i forventet rækkefølge', () => {
    const computed = computeTotals({
      materials: 4000,
      sledPercent: 7,
      extraWork: 188.6,
      tralleloft: 52.2,
      km: 42.4,
      hours: 37.5,
      udd1: 10,
      udd2: 20,
      mentor: 5
    });

    const layout = createReviewLayout({
      computed,
      workers: [
        { name: 'A', hours: 18.5 },
        { name: 'B', hours: 19 }
      ],
      templateLabel: 'Standard',
      jobType: 'montage',
      variant: 'udd2'
    });

    expect(layout.summary.map((row) => row.id)).toEqual([
      'materials',
      'sled',
      'extraWork',
      'tralleloft',
      'km',
      'totalAccord'
    ]);

    expect(layout.hourly.map((row) => row.id)).toEqual([
      'hourlyNoAdd',
      'hourlyUdd1',
      'hourlyUdd2',
      'hourlyUdd2Mentor'
    ]);

    expect(layout.project[0]).toMatchObject({ id: 'projectHeader', format: 'header' });
    expect(layout.project[0].label).toContain('montage');
    expect(layout.project[0].label).toContain('udd2');
    expect(layout.project[1]).toMatchObject({ id: 'projectFinal', emphasize: true });

    const templateRow = layout.metadata.find((row) => row.id === 'template');
    expect(templateRow?.value).toBe('Standard');

    const teamRow = layout.metadata.find((row) => row.id === 'team');
    expect(teamRow?.value?.workersCount).toBe(2);
    expect(teamRow?.value?.hours).toBeCloseTo(37.5, 5);
    expect(layout.metadata.map((row) => row.id).at(-1)).toBe('team');
  });

  it('falder tilbage til summerede timer når computed mangler værdi', () => {
    const layout = createReviewLayout({
      computed: { materials: 0 },
      workers: [
        { hours: 4 },
        { hours: 6.5 }
      ]
    });

    const teamRow = layout.metadata.find((row) => row.id === 'team');
    expect(teamRow?.value?.hours).toBeCloseTo(10.5, 5);
  });
});
