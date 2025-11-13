import { getJobs, updateJob } from './jobs.js';
import { ensureJobStatus, markJobApproved, markJobRejected } from './job-status.js';

export function listJobsForFirm(firmId) {
  const target = typeof firmId === 'string' ? firmId.trim() : '';
  const normalizedTarget = target.toLowerCase();
  if (!normalizedTarget) return [];

  const jobsForFirm = [];
  getJobs().forEach(rawJob => {
    const job = migrateJobFirm(ensureJobStatus({ ...rawJob }), target);
    const jobFirm = typeof job?.firmId === 'string' ? job.firmId.trim().toLowerCase() : '';
    if (jobFirm === normalizedTarget) {
      jobsForFirm.push(job);
    }
  });

  return jobsForFirm;
}

function migrateJobFirm(job, fallbackFirmId) {
  if (!job || typeof job !== 'object') return job;
  const currentFirm = typeof job.firmId === 'string' ? job.firmId.trim() : '';
  if (currentFirm) {
    return { ...job, firmId: currentFirm };
  }

  const legacyFirm = resolveLegacyFirmId(job);
  const targetFirm = (legacyFirm || fallbackFirmId || '').trim();
  if (!targetFirm) {
    return { ...job, firmId: null };
  }

  if (job.id) {
    const updated = updateJob(job.id, { firmId: targetFirm });
    if (updated) {
      return ensureJobStatus({ ...updated });
    }
  }

  const copy = { ...job, firmId: targetFirm };
  return ensureJobStatus(copy);
}

function resolveLegacyFirmId(job) {
  const candidates = [
    job.tenantId,
    job.tenantSlug,
    job.tenant,
    job.tenantName,
    job.companyId,
    job.companySlug,
    job.company
  ];

  for (const value of candidates) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return '';
}

export function approveJobById(jobId, approverId) {
  if (!jobId) return null;
  return updateJob(jobId, job => {
    const next = markJobApproved({ ...job }, approverId);
    return ensureJobStatus(next);
  });
}

export function rejectJobById(jobId, approverId) {
  if (!jobId) return null;
  return updateJob(jobId, job => {
    const next = markJobRejected({ ...job }, approverId);
    return ensureJobStatus(next);
  });
}
