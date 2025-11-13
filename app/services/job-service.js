// app/services/job-service.js
//
// Samler job-storage ét sted.
// LIGE NU: localStorage via jobs.js.
// SENERE: kan blive erstattet med backend-kald.

import {
  getJobs,
  saveJobs,
  updateJob,
  findJobById,
} from '../jobs.js';
import {
  ensureJobStatus,
  markJobSubmitted,
  markJobApproved,
  markJobRejected,
} from '../job-status.js';

export function getJobsForFirm(firmId) {
  const target = typeof firmId === 'string' ? firmId.trim() : '';
  const normalized = target.toLowerCase();
  if (!normalized) return [];

  const jobsForFirm = [];
  getJobs().forEach(rawJob => {
    const migrated = migrateJobFirm(ensureJobStatus({ ...rawJob }), target);
    const jobFirm = typeof migrated?.firmId === 'string' ? migrated.firmId.trim().toLowerCase() : '';
    if (jobFirm === normalized) {
      jobsForFirm.push(ensureJobStatus({ ...migrated }));
    }
  });

  // TODO backend: GET /api/firms/:id/jobs
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
    job.company,
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

export function getJobById(jobId) {
  if (!jobId) return null;
  const job = findJobById(jobId);
  return job ? ensureJobStatus({ ...job }) : null;
}

export function saveJob(job) {
  if (!job || !job.id) return null;
  const existing = findJobById(job.id);
  const ensured = ensureJobStatus({ ...job });
  let saved = null;
  if (existing) {
    saved = updateJob(job.id, ensured);
  } else {
    const all = getJobs();
    all.push(ensured);
    const next = saveJobs(all);
    saved = next.find(entry => entry.id === ensured.id) || ensured;
  }
  const snapshot = saved ? ensureJobStatus({ ...saved }) : null;
  // TODO backend: PUT /api/jobs/:id
  return snapshot;
}

export function submitJob(jobId) {
  if (!jobId) return null;
  const updated = updateJob(jobId, job => {
    const next = ensureJobStatus({ ...job });
    markJobSubmitted(next);
    return next;
  });
  // TODO backend: POST /api/jobs/:id/submit
  return updated ? ensureJobStatus({ ...updated }) : null;
}

export function approveJob(jobId, approverId) {
  if (!jobId) return null;
  const updated = updateJob(jobId, job => {
    const next = ensureJobStatus({ ...job });
    markJobApproved(next, approverId);
    return next;
  });
  // TODO backend: POST /api/jobs/:id/approve
  return updated ? ensureJobStatus({ ...updated }) : null;
}

export function rejectJob(jobId, approverId) {
  if (!jobId) return null;
  const updated = updateJob(jobId, job => {
    const next = ensureJobStatus({ ...job });
    markJobRejected(next, approverId);
    return next;
  });
  // TODO backend: POST /api/jobs/:id/reject
  return updated ? ensureJobStatus({ ...updated }) : null;
}
