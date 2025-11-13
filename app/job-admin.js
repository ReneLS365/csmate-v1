import { getJobs, updateJob } from './jobs.js';
import { ensureJobStatus, markJobApproved, markJobRejected } from './job-status.js';

export function listJobsForFirm(firmId) {
  const target = typeof firmId === 'string' ? firmId.trim() : '';
  return getJobs()
    .map(job => ensureJobStatus({ ...job }))
    .filter(job => {
      if (!target) return false;
      const jobFirm = typeof job.firmId === 'string' ? job.firmId.trim() : '';
      return jobFirm === target;
    });
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
