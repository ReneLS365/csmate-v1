import { describe, it, expect, beforeEach } from 'vitest';
import { renderJobHealth } from '../src/ui/job-health.js';

describe('job-health', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="job-health"></div>';
    localStorage.clear();
  });

  it('viser materialer, ventende og sidst gemt', async () => {
    const updatedAt = Date.UTC(2025, 10, 12, 10, 0);
    const jobs = [
      {
        id: 'job-1',
        systems: [
          { materialer: [{ antal: 2 }, { antal: 1 }] }
        ],
        updatedAt
      }
    ];
    localStorage.setItem('csmate.jobs.v1', JSON.stringify(jobs));

    await renderJobHealth();

    const text = document.getElementById('job-health').textContent;
    expect(text).toContain('Materialer: 3');
    expect(text).toContain('Ventende: 0');
    expect(text).toContain('Sidst gemt: 2025-11-12 10:00');
  });
});
