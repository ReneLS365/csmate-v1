import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderJobHealth } from '../src/ui/job-health.js';

describe('job-health', () => {
  let originalJobStore;

  beforeEach(() => {
    originalJobStore = window.JobStore;
    document.body.innerHTML = '<div id="job-health"></div>';
    localStorage.clear();
  });

  afterEach(() => {
    if (originalJobStore === undefined) delete window.JobStore;
    else window.JobStore = originalJobStore;
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

  it('viser status for det aktive job fra JobStore', async () => {
    const activeUpdatedAt = Date.UTC(2024, 0, 1, 12, 30);
    const jobs = [
      {
        id: 'job-1',
        materials: [
          { quantity: 2 },
          { quantity: 1 }
        ],
        updatedAt: activeUpdatedAt
      },
      {
        id: 'job-2',
        materials: [
          { quantity: 50 }
        ],
        updatedAt: activeUpdatedAt + 60000
      }
    ];
    localStorage.setItem('csmate.jobs.v1', JSON.stringify(jobs));
    window.JobStore = {
      getActiveJob: () => ({ ...jobs[0] })
    };

    await renderJobHealth();

    const text = document.getElementById('job-health').textContent;
    expect(text).toContain('Materialer: 3');
    expect(text).not.toContain('Materialer: 50');
    const date = new Date(activeUpdatedAt);
    const pad = n => String(n).padStart(2, '0');
    const expectedTimestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    expect(text).toContain(`Sidst gemt: ${expectedTimestamp}`);
  });
});
