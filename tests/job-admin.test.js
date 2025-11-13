import { describe, it, expect, beforeEach, vi } from 'vitest';

const jobRecords = [];

vi.mock('../app/jobs.js', () => {
  return {
    getJobs: vi.fn(() => jobRecords.map(job => ({ ...job }))),
    updateJob: vi.fn((jobId, updater) => {
      const index = jobRecords.findIndex(job => job.id === jobId);
      if (index === -1) return null;
      const existing = jobRecords[index];
      let next = existing;
      if (typeof updater === 'function') {
        next = updater({ ...existing });
      } else if (updater && typeof updater === 'object') {
        next = { ...existing, ...updater };
      }
      if (!next) return null;
      jobRecords[index] = { ...existing, ...next };
      return { ...jobRecords[index] };
    })
  };
});

import { listJobsForFirm } from '../app/job-admin.js';
import { updateJob } from '../app/jobs.js';

describe('job-admin listJobsForFirm', () => {
  beforeEach(() => {
    jobRecords.length = 0;
    vi.mocked(updateJob).mockClear();
  });

  it('returns jobs whose firm matches the provided tenant', () => {
    jobRecords.push(
      { id: 'job-1', firmId: 'alpha', approvalStatus: 'draft' },
      { id: 'job-2', firmId: 'beta', approvalStatus: 'submitted' }
    );

    const jobs = listJobsForFirm('alpha');

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('job-1');
    expect(jobs[0].firmId).toBe('alpha');
    expect(updateJob).not.toHaveBeenCalled();
  });

  it('backfills firmId for legacy jobs without an assigned firm', () => {
    jobRecords.push({ id: 'legacy-1', approvalStatus: 'draft' });

    const jobs = listJobsForFirm('hulmose');

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('legacy-1');
    expect(jobs[0].firmId).toBe('hulmose');
    expect(updateJob).toHaveBeenCalledWith('legacy-1', { firmId: 'hulmose' });
    expect(jobRecords[0].firmId).toBe('hulmose');
  });

  it('prefers legacy tenant identifiers when present', () => {
    jobRecords.push({ id: 'legacy-2', tenantId: 'tenant-42', approvalStatus: 'draft' });

    const jobs = listJobsForFirm('tenant-42');

    expect(jobs).toHaveLength(1);
    expect(jobs[0].firmId).toBe('tenant-42');
    expect(updateJob).toHaveBeenCalledWith('legacy-2', { firmId: 'tenant-42' });

    vi.mocked(updateJob).mockClear();
    const otherTenantJobs = listJobsForFirm('another');
    expect(otherTenantJobs).toHaveLength(0);
    expect(updateJob).not.toHaveBeenCalled();
  });
});
