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
  if (!firmId) return [];
  const normalized = String(firmId).trim().toLowerCase();
  if (!normalized) return [];
  const all = getJobs();
  const filtered = all.filter(job => {
    const jobFirm = typeof job?.firmId === 'string' ? job.firmId.trim().toLowerCase() : '';
    return jobFirm === normalized;
  });
  // TODO backend: GET /api/firms/:id/jobs
  return filtered.map(job => ensureJobStatus({ ...job }));
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
